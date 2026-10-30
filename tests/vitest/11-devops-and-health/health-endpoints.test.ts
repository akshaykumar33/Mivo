import { describe, it, expect, vi } from 'vitest';
import { HealthController } from '@server/health/health.controller';

describe('DevOps & Monitoring — Health Endpoints', () => {
  it('should return live probe status 200 with { status: "alive" }', () => {
    const controller = new HealthController();
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((val) => val),
    };

    controller.live(mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith({ status: 'alive' });
  });

  it('should return liveness and service metadata structure in main check', async () => {
    const controller = new HealthController();
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((val) => val),
    };

    await controller.check(mockRes);

    expect(mockRes.status).toHaveBeenCalled();
    const calls = mockRes.json.mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const body = calls[0][0];

    expect(body).toHaveProperty('status');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
    expect(body).toHaveProperty('environment');
    expect(body).toHaveProperty('system');
    expect(body.system).toHaveProperty('memory');
    expect(body).toHaveProperty('services');
    expect(body.services).toHaveProperty('database');
    expect(body.services).toHaveProperty('redis');
  }, 10000);

  it('should return ready status probe', async () => {
    const controller = new HealthController();
    const mockRes: any = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockImplementation((val) => val),
    };

    await controller.ready(mockRes);
    expect(mockRes.status).toHaveBeenCalled();
  }, 10000);
});
