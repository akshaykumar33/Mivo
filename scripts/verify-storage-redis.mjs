import fs from 'node:fs';
import path from 'node:path';

// Load .env
const envPath = path.resolve('.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

async function runChecks() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🔍 DEEP VERIFICATION: UPSTASH REDIS & S3 / SUPABASE STORAGE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // --- UPSTASH REDIS CHECK ---
  console.log('⚡ 1. UPSTASH REDIS VERIFICATION');
  console.log('---------------------------------------------------------------');
  
  const restUrl = process.env.UPSTASH_REDIS_REST_URL;
  const restToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  const redisUrl = process.env.REDIS_URL;

  console.log('  • Upstash REST URL :', restUrl ? restUrl.replace(/^(https?:\/\/[^/]+).*/, '$1') : '(Not set)');
  console.log('  • Upstash REST Token:', restToken ? (restToken.substring(0, 8) + '...' + restToken.substring(restToken.length - 4)) : '(Not set)');
  console.log('  • Redis TCP URL     :', redisUrl ? redisUrl.replace(/:[^:@]+@/, ':***@') : '(Not set)');

  // 1a. REST Ping
  if (restUrl && restToken) {
    try {
      const t0 = Date.now();
      const pingRes = await fetch(`${restUrl}/ping`, {
        headers: { Authorization: `Bearer ${restToken}` }
      });
      const pingData = await pingRes.json();
      const latency = Date.now() - t0;
      console.log(`  ✅ Upstash REST /ping: Status ${pingRes.status} -> Response: ${JSON.stringify(pingData)} (${latency}ms)`);

      // 1b. REST Set & Get & Del
      const testKey = `mivo_verify_${Date.now()}`;
      const testVal = `verify_val_${Math.random().toString(36).substring(7)}`;
      
      const setRes = await fetch(`${restUrl}/set/${testKey}/${testVal}/EX/60`, {
        headers: { Authorization: `Bearer ${restToken}` }
      });
      const setData = await setRes.json();
      console.log(`  ✅ Upstash REST SET (TTL 60s): ${JSON.stringify(setData)}`);

      const getRes = await fetch(`${restUrl}/get/${testKey}`, {
        headers: { Authorization: `Bearer ${restToken}` }
      });
      const getData = await getRes.json();
      console.log(`  ✅ Upstash REST GET: ${JSON.stringify(getData)} (Match: ${getData.result === testVal})`);

      await fetch(`${restUrl}/del/${testKey}`, {
        headers: { Authorization: `Bearer ${restToken}` }
      });
      console.log(`  ✅ Upstash REST DEL: Cleaned up test probe`);
    } catch (err) {
      console.error('  ❌ Upstash REST Error:', err.message);
    }
  }

  // 1c. ioredis TCP/TLS Connection
  if (redisUrl) {
    try {
      let Redis;
      try {
        Redis = (await import('ioredis')).default;
      } catch {
        Redis = (await import('./apps/server/node_modules/ioredis/built/index.js')).default;
      }
      if (Redis) {
        const client = new Redis(redisUrl, {
          connectTimeout: 5000,
          maxRetriesPerRequest: 1,
          lazyConnect: true
        });
        const t0 = Date.now();
        await client.connect();
        const pong = await client.ping();
        const latency = Date.now() - t0;
        console.log(`  ✅ ioredis TLS Socket Ping: ${pong} (${latency}ms)`);

        const socketKey = `mivo_socket_test_${Date.now()}`;
        await client.set(socketKey, 'socket_ok', 'EX', 30);
        const fetched = await client.get(socketKey);
        await client.del(socketKey);
        console.log(`  ✅ ioredis TLS Socket SET/GET/DEL: Verified (value: "${fetched}")`);

        await client.quit();
      }
    } catch (err) {
      console.error('  ❌ ioredis Socket Error:', err.message);
    }
  }

  // --- S3 & SUPABASE STORAGE CHECK ---
  console.log('\n🪣 2. S3 & SUPABASE STORAGE VERIFICATION');
  console.log('---------------------------------------------------------------');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const s3Endpoint = process.env.S3_ENDPOINT;
  const s3AccessKey = process.env.S3_ACCESS_KEY;
  const s3SecretKey = process.env.S3_SECRET_KEY;
  const bucketName = process.env.S3_BUCKET_NAME || 'mivo-media';
  const s3Region = process.env.S3_REGION || 'us-east-1';

  console.log('  • Supabase URL :', supabaseUrl || '(Not set)');
  console.log('  • S3 Endpoint  :', s3Endpoint || '(Not set)');
  console.log('  • Bucket Name  :', bucketName);
  console.log('  • Region       :', s3Region);
  console.log('  • Access Key   :', s3AccessKey ? (s3AccessKey.substring(0, 6) + '***') : '(Not set)');

  // 2a. Supabase Storage REST API
  if (supabaseUrl && anonKey) {
    try {
      const t0 = Date.now();
      const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`
        }
      });
      const latency = Date.now() - t0;
      if (res.ok) {
        const buckets = await res.json();
        console.log(`  ✅ Supabase Storage REST API: HTTP ${res.status} OK (${latency}ms)`);
        console.log(`  ✅ Buckets Found: ${buckets.length > 0 ? buckets.map(b => b.name).join(', ') : 'None yet'}`);
      } else {
        const txt = await res.text();
        console.log(`  ⚠️ Supabase Storage REST API returned HTTP ${res.status}: ${txt}`);
      }
    } catch (err) {
      console.error('  ❌ Supabase Storage REST API Error:', err.message);
    }
  }

  // 2b. AWS S3 Client Probe & Put/Get/Delete Object Test
  if (s3Endpoint && s3AccessKey && s3SecretKey) {
    try {
      let S3Pkg;
      try {
        S3Pkg = await import('@aws-sdk/client-s3');
      } catch {
        S3Pkg = await import('./apps/server/node_modules/@aws-sdk/client-s3/dist-es/index.js');
      }
      const {
        S3Client,
        HeadBucketCommand,
        CreateBucketCommand,
        ListBucketsCommand,
        PutObjectCommand,
        GetObjectCommand,
        DeleteObjectCommand
      } = S3Pkg;

      const s3Client = new S3Client({
        endpoint: s3Endpoint,
        region: s3Region,
        credentials: {
          accessKeyId: s3AccessKey,
          secretAccessKey: s3SecretKey
        },
        forcePathStyle: true
      });

      console.log('  Testing AWS S3 Client connectivity...');
      const t0 = Date.now();
      try {
        const listRes = await s3Client.send(new ListBucketsCommand({}));
        console.log(`  ✅ S3 ListBuckets: Success (${Date.now() - t0}ms), Count: ${listRes.Buckets?.length || 0}`);
      } catch (listErr) {
        console.log(`  ℹ️ S3 ListBuckets info: ${listErr.message}`);
      }

      // Check Bucket
      let bucketExists = false;
      try {
        await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
        console.log(`  ✅ S3 Bucket '${bucketName}' exists and is accessible`);
        bucketExists = true;
      } catch (headErr) {
        console.log(`  ℹ️ S3 Bucket '${bucketName}' check: ${headErr.message || headErr.name}. Attempting bucket creation...`);
        try {
          await s3Client.send(new CreateBucketCommand({ Bucket: bucketName }));
          console.log(`  ✅ S3 Bucket '${bucketName}' created successfully!`);
          bucketExists = true;
        } catch (createErr) {
          console.log(`  ℹ️ Could not auto-create bucket: ${createErr.message}`);
        }
      }

      // Test upload / read / delete
      if (bucketExists) {
        const testObjectKey = `probes/verify_probe_${Date.now()}.txt`;
        const testContent = Buffer.from('Mivo S3 Storage probe test verified: ' + new Date().toISOString());

        await s3Client.send(new PutObjectCommand({
          Bucket: bucketName,
          Key: testObjectKey,
          Body: testContent,
          ContentType: 'text/plain'
        }));
        console.log(`  ✅ S3 PutObject: Successfully uploaded '${testObjectKey}'`);

        const getRes = await s3Client.send(new GetObjectCommand({
          Bucket: bucketName,
          Key: testObjectKey
        }));
        const bodyStr = await getRes.Body.transformToString();
        console.log(`  ✅ S3 GetObject: Successfully read back probe object (Length: ${bodyStr.length} bytes)`);

        await s3Client.send(new DeleteObjectCommand({
          Bucket: bucketName,
          Key: testObjectKey
        }));
        console.log(`  ✅ S3 DeleteObject: Successfully deleted probe object`);
      }

    } catch (err) {
      console.error('  ❌ S3 Client Error:', err.message);
    }
  }

  // 2c. StorageService Integration Check
  console.log('\n📦 3. SERVER STORAGE SERVICE INTEGRATION CHECK');
  console.log('---------------------------------------------------------------');
  try {
    const { StorageService } = await import('../apps/server/dist/storage/storage.service.js');
    const { VideoOptimizerService } = await import('../apps/server/dist/storage/video-optimizer.service.js');
    const videoOpt = new VideoOptimizerService();
    const storageService = new StorageService(videoOpt);
    await storageService.onModuleInit();
    const healthResult = await storageService.checkHealth();
    console.log(`  ✅ StorageService.checkHealth(): Status "${healthResult.status}" (${healthResult.responseTimeMs}ms)`);
  } catch (err) {
    console.log(`  ℹ️ StorageService import check: ${err.message}`);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('🏁 ALL CHECKS COMPLETED');
  console.log('═══════════════════════════════════════════════════════════════');
}

runChecks().catch(console.error);
