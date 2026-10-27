/**
 * Module: webrtc-media-stage
 * Unit Test: Spotlight Focus Mode — Dominant 16:9 Hero Stage & Attendee Filmstrip Logic
 */

import assert from 'node:assert/strict';

console.log('═══════════════════════════════════════════════════════════════');
console.log('🧪 [webrtc-media-stage/unit] Spotlight Focus Mode Test Suite');
console.log('═══════════════════════════════════════════════════════════════\n');

// 1. Spotlight Stage Resolution Logic (matching MediaStage.tsx)
function resolveSpotlightState({
  participants,
  pinnedUserId,
  layoutMode,
  currentUserId,
  isCoHostEnabled = false,
}) {
  const isCoHostPinned = pinnedUserId === 'ai-cohost';
  const pinnedParticipant = participants.find((p) => p.userId === pinnedUserId);

  let effectiveHero = null;
  let isSpotlightActive = false;

  if (isCoHostPinned) {
    effectiveHero = { type: 'AI_COHOST', id: 'ai-cohost', name: 'Mivo AI Co-Host' };
    isSpotlightActive = true;
  } else if (pinnedParticipant) {
    effectiveHero = { type: 'PARTICIPANT', ...pinnedParticipant };
    isSpotlightActive = true;
  } else if (layoutMode === 'spotlight') {
    // Auto-active speaker resolution
    const activeSpeaker =
      participants.find((p) => p.userId !== currentUserId && !p.isMuted) ||
      participants.find((p) => p.userId === currentUserId) ||
      participants[0] ||
      null;

    if (activeSpeaker) {
      effectiveHero = { type: 'PARTICIPANT', ...activeSpeaker };
      isSpotlightActive = true;
    }
  }

  // Attendee Filmstrip calculation
  let filmstripParticipants = [];
  if (isSpotlightActive && effectiveHero) {
    if (effectiveHero.type === 'PARTICIPANT') {
      filmstripParticipants = participants.filter((p) => p.userId !== effectiveHero.userId);
    } else {
      // Co-Host is hero: all human participants go into the filmstrip
      filmstripParticipants = [...participants];
    }
  }

  const isCoHostInFilmstrip = isCoHostEnabled && !isCoHostPinned;

  return {
    isSpotlightActive,
    effectiveHero,
    filmstripParticipants,
    isCoHostInFilmstrip,
    filmstripTotalCount: filmstripParticipants.length + (isCoHostInFilmstrip ? 1 : 0),
  };
}

// 2. Aspect Ratio & Dimension Calculator (16:9 verification)
function calculateHeroDimensions(viewportWidth, viewportHeight, maxWidthConstraint = 1152) {
  const targetRatio = 16 / 9;
  // Available width accounting for padding (e.g. 32px)
  const availableWidth = Math.min(viewportWidth - 32, maxWidthConstraint);
  // Available height for hero stage (leaving room for header ~60px and filmstrip ~140px)
  const availableHeight = Math.max(160, viewportHeight - 240);

  let width = availableWidth;
  let height = Math.round(width / targetRatio);

  if (height > availableHeight) {
    height = availableHeight;
    width = Math.round(height * targetRatio);
  }

  const computedRatio = width / height;
  return { width, height, computedRatio };
}

// 3. State Machine Reducer for Spotlight Interactions
function spotlightReducer(state, action) {
  switch (action.type) {
    case 'PIN_SPEAKER': {
      if (state.pinnedUserId === action.userId) {
        // Toggle off -> return to grid
        return { ...state, pinnedUserId: null, layoutMode: 'grid' };
      }
      return { ...state, pinnedUserId: action.userId, layoutMode: 'spotlight' };
    }
    case 'TOGGLE_LAYOUT_MODE': {
      if (action.mode === 'grid') {
        return { ...state, pinnedUserId: null, layoutMode: 'grid' };
      }
      // Switch to spotlight: if nobody pinned, auto-pick active speaker
      const candidate = action.defaultSpeakerId || null;
      return { ...state, pinnedUserId: state.pinnedUserId || candidate, layoutMode: 'spotlight' };
    }
    case 'CLICK_FILMSTRIP_ATTENDEE': {
      return { ...state, pinnedUserId: action.userId, layoutMode: 'spotlight' };
    }
    case 'ESCAPE_KEY': {
      return { ...state, pinnedUserId: null, layoutMode: 'grid' };
    }
    case 'PARTICIPANT_LEFT': {
      if (state.pinnedUserId === action.userId) {
        const remaining = action.remainingParticipants || [];
        const nextSpeaker = remaining.find((p) => !p.isMuted) || remaining[0];
        if (nextSpeaker && state.layoutMode === 'spotlight') {
          return { ...state, pinnedUserId: nextSpeaker.userId };
        }
        return { ...state, pinnedUserId: null, layoutMode: 'grid' };
      }
      return state;
    }
    default:
      return state;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 1: Speaker Pinning & Hero Stage Resolution
// ═════════════════════════════════════════════════════════════════════════════
console.log('1. Testing Speaker Pinning & Dominant Hero Stage Resolution...');

const sampleParticipants = [
  { userId: 'u1', isMuted: false, isCameraOn: true, user: { username: 'alice', displayName: 'Alice (Host)' } },
  { userId: 'u2', isMuted: true, isCameraOn: true, user: { username: 'bob', displayName: 'Bob' } },
  { userId: 'u3', isMuted: false, isCameraOn: false, user: { username: 'charlie', displayName: 'Charlie' } },
  { userId: 'u4', isMuted: true, isCameraOn: false, user: { username: 'diana', displayName: 'Diana' } },
];

// Case A: Pin remote speaker 'u3'
const remotePin = resolveSpotlightState({
  participants: sampleParticipants,
  pinnedUserId: 'u3',
  layoutMode: 'spotlight',
  currentUserId: 'u1',
});
assert.equal(remotePin.isSpotlightActive, true);
assert.equal(remotePin.effectiveHero?.userId, 'u3');
assert.equal(remotePin.filmstripParticipants.length, 3);
assert.deepEqual(
  remotePin.filmstripParticipants.map((p) => p.userId),
  ['u1', 'u2', 'u4'],
  'Filmstrip must contain all participants except the dominant hero'
);
console.log('   ✅ Remote participant pinned into dominant hero stage with attendee filmstrip below.');

// Case B: Pin local speaker 'u1' (You)
const selfPin = resolveSpotlightState({
  participants: sampleParticipants,
  pinnedUserId: 'u1',
  layoutMode: 'spotlight',
  currentUserId: 'u1',
});
assert.equal(selfPin.isSpotlightActive, true);
assert.equal(selfPin.effectiveHero?.userId, 'u1');
assert.deepEqual(
  selfPin.filmstripParticipants.map((p) => p.userId),
  ['u2', 'u3', 'u4']
);
console.log('   ✅ Local user (You) successfully pinned into 16:9 hero stage with remote peers in filmstrip.');

// Case C: Pin AI Co-Host
const cohostPin = resolveSpotlightState({
  participants: sampleParticipants,
  pinnedUserId: 'ai-cohost',
  layoutMode: 'spotlight',
  currentUserId: 'u1',
  isCoHostEnabled: true,
});
assert.equal(cohostPin.isSpotlightActive, true);
assert.equal(cohostPin.effectiveHero?.id, 'ai-cohost');
assert.equal(cohostPin.filmstripParticipants.length, 4, 'All human attendees in filmstrip when Co-Host is hero');
assert.equal(cohostPin.isCoHostInFilmstrip, false, 'Co-Host is hero, so not in filmstrip');
console.log('   ✅ AI Co-Host successfully pinned into dominant hero stage with all human attendees in filmstrip.');

// ═════════════════════════════════════════════════════════════════════════════
// TEST 2: Active Speaker Auto-Spotlight in Spotlight View
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n2. Testing Active Speaker Auto-Spotlight in Spotlight View...');

// Layout mode is spotlight, but pinnedUserId is null
const autoSpotlight = resolveSpotlightState({
  participants: sampleParticipants,
  pinnedUserId: null,
  layoutMode: 'spotlight',
  currentUserId: 'u1',
});
// 'u3' is not muted and not me -> highest priority active remote speaker
assert.equal(autoSpotlight.isSpotlightActive, true);
assert.equal(autoSpotlight.effectiveHero?.userId, 'u3');
assert.equal(autoSpotlight.filmstripParticipants.length, 3);
console.log('   ✅ Unpinned Spotlight View automatically focuses on active unmuted speaker (Charlie).');

// ═════════════════════════════════════════════════════════════════════════════
// TEST 3: Attendee Filmstrip Stability & Single Participant Edge Case
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n3. Testing Filmstrip Stability & Single Participant Edge Case...');

const singleUser = [
  { userId: 'u1', isMuted: false, isCameraOn: true, user: { username: 'alice', displayName: 'Alice' } },
];

const singleSpotlight = resolveSpotlightState({
  participants: singleUser,
  pinnedUserId: 'u1',
  layoutMode: 'spotlight',
  currentUserId: 'u1',
  isCoHostEnabled: false,
});
assert.equal(singleSpotlight.isSpotlightActive, true);
assert.equal(singleSpotlight.effectiveHero?.userId, 'u1');
assert.equal(singleSpotlight.filmstripParticipants.length, 0);
assert.equal(singleSpotlight.filmstripTotalCount, 0);
console.log('   ✅ Single-participant stage handled cleanly with zero filmstrip errors.');

// ═════════════════════════════════════════════════════════════════════════════
// TEST 4: Dominant 16:9 Hero Stage Aspect Ratio Geometry
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n4. Testing Dominant 16:9 Aspect Ratio Geometry across screen viewports...');

const viewports = [
  { name: '1080p Desktop', w: 1920, h: 1080 },
  { name: '1440p Ultrawide', w: 2560, h: 1440 },
  { name: '1366x768 Laptop', w: 1366, h: 768 },
  { name: 'iPad Pro Landscape', w: 1024, h: 768 },
  { name: 'Mobile Portrait', w: 390, h: 844 },
];

for (const vp of viewports) {
  const dims = calculateHeroDimensions(vp.w, vp.h);
  const diff = Math.abs(dims.computedRatio - 16 / 9);
  assert(diff < 0.05, `Aspect ratio mismatch on ${vp.name}: got ${dims.computedRatio}`);
  assert(dims.width <= vp.w, `Width overflow on ${vp.name}`);
  assert(dims.height <= vp.h, `Height overflow on ${vp.name}`);
  console.log(`   ✅ ${vp.name.padEnd(20)}: ${dims.width}x${dims.height} (Ratio: ${dims.computedRatio.toFixed(3)})`);
}

// ═════════════════════════════════════════════════════════════════════════════
// TEST 5: Interactive State Machine & Transitions (Pin, Unpin, Filmstrip, Escape)
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n5. Testing State Machine Reducer & User Transitions...');

let state = { layoutMode: 'grid', pinnedUserId: null };

// Action 1: Pin speaker u2
state = spotlightReducer(state, { type: 'PIN_SPEAKER', userId: 'u2' });
assert.equal(state.layoutMode, 'spotlight');
assert.equal(state.pinnedUserId, 'u2');
console.log('   ✅ Action PIN_SPEAKER(u2) -> layoutMode=spotlight, pinnedUserId=u2');

// Action 2: Click attendee u4 in the filmstrip
state = spotlightReducer(state, { type: 'CLICK_FILMSTRIP_ATTENDEE', userId: 'u4' });
assert.equal(state.layoutMode, 'spotlight');
assert.equal(state.pinnedUserId, 'u4');
console.log('   ✅ Action CLICK_FILMSTRIP_ATTENDEE(u4) -> spotlight promoted to u4');

// Action 3: Press Escape key
state = spotlightReducer(state, { type: 'ESCAPE_KEY' });
assert.equal(state.layoutMode, 'grid');
assert.equal(state.pinnedUserId, null);
console.log('   ✅ Action ESCAPE_KEY -> smoothly reverted to grid mode');

// Action 4: Toggle layout mode directly from toolbar to spotlight
state = spotlightReducer(state, { type: 'TOGGLE_LAYOUT_MODE', mode: 'spotlight', defaultSpeakerId: 'u3' });
assert.equal(state.layoutMode, 'spotlight');
assert.equal(state.pinnedUserId, 'u3');
console.log('   ✅ Action TOGGLE_LAYOUT_MODE(spotlight) -> spotlight with auto active speaker u3');

// Action 5: Pinned speaker leaves the room
state = spotlightReducer(state, {
  type: 'PARTICIPANT_LEFT',
  userId: 'u3',
  remainingParticipants: sampleParticipants.filter((p) => p.userId !== 'u3'),
});
assert.equal(state.layoutMode, 'spotlight');
assert.ok(state.pinnedUserId !== 'u3', 'Pinned speaker must no longer be the departed user');
console.log(`   ✅ Action PARTICIPANT_LEFT(u3) -> smoothly fell back to next speaker: ${state.pinnedUserId}`);

// Action 6: Unpin by toggling same speaker
state = spotlightReducer(state, { type: 'PIN_SPEAKER', userId: state.pinnedUserId });
assert.equal(state.layoutMode, 'grid');
assert.equal(state.pinnedUserId, null);
console.log('   ✅ Action PIN_SPEAKER(same) -> unpins back to equal responsive grid');

console.log('\n═══════════════════════════════════════════════════════════════');
console.log('🎉 ALL SPOTLIGHT FOCUS MODE UNIT TESTS PASSED SUCCESSFULLY! (5/5)');
console.log('═══════════════════════════════════════════════════════════════\n');
