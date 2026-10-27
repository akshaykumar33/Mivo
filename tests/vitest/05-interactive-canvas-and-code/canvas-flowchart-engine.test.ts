import { describe, it, expect } from 'vitest';
import { CanvasElement } from '@mivo/shared';

export function computeConnectorEndpoints(
  connector: CanvasElement,
  elementsMap: Map<string, CanvasElement>
) {
  if (!connector.fromId || !connector.toId) return null;
  const from = elementsMap.get(connector.fromId);
  const to = elementsMap.get(connector.toId);
  if (!from || !to) return null;

  const fromWidth = from.width || 200;
  const fromHeight = from.height || 100;
  const toWidth = to.width || 200;
  const toHeight = to.height || 100;

  return {
    startX: from.x + fromWidth / 2,
    startY: from.y + fromHeight / 2,
    endX: to.x + toWidth / 2,
    endY: to.y + toHeight / 2,
  };
}

export function clampZoom(currentZoom: number, delta: number): number {
  const next = Math.round((currentZoom + delta) * 10) / 10;
  return Math.max(0.5, Math.min(2.0, next));
}

export function mergeCanvasUpsert(
  existing: CanvasElement[],
  incoming: CanvasElement[]
): CanvasElement[] {
  const map = new Map(existing.map((el) => [el.id, el]));
  incoming.forEach((el) => map.set(el.id, el));
  return Array.from(map.values());
}

export function deleteElementAndConnectors(
  elements: CanvasElement[],
  elementIdToDelete: string
): CanvasElement[] {
  return elements.filter((el) => {
    if (el.id === elementIdToDelete) return false;
    if (el.type === 'CONNECTOR' && (el.fromId === elementIdToDelete || el.toId === elementIdToDelete)) {
      return false;
    }
    return true;
  });
}

describe('Interactive Collaborative Canvas Flowchart Engine', () => {
  const initialElements: CanvasElement[] = [
    {
      id: 'gateway-1',
      type: 'GATEWAY',
      x: 100,
      y: 100,
      width: 200,
      height: 100,
      title: 'Auth Gateway',
      content: 'JWT verification',
    },
    {
      id: 'service-1',
      type: 'SERVICE',
      x: 400,
      y: 100,
      width: 200,
      height: 100,
      title: 'Payments Engine',
      content: 'Stripe webhook',
    },
    {
      id: 'conn-1',
      type: 'CONNECTOR',
      x: 0,
      y: 0,
      fromId: 'gateway-1',
      toId: 'service-1',
      label: 'REST API',
    },
  ];

  it('computes connector start and end midpoint coordinates accurately', () => {
    const map = new Map(initialElements.map((el) => [el.id, el]));
    const endpoints = computeConnectorEndpoints(initialElements[2], map);

    expect(endpoints).not.toBeNull();
    // gateway center: 100 + 100 = 200, 100 + 50 = 150
    expect(endpoints?.startX).toBe(200);
    expect(endpoints?.startY).toBe(150);

    // service center: 400 + 100 = 500, 100 + 50 = 150
    expect(endpoints?.endX).toBe(500);
    expect(endpoints?.endY).toBe(150);
  });

  it('clamps zoom scaling factor strictly between 0.5x and 2.0x', () => {
    let zoom = 1.0;
    zoom = clampZoom(zoom, 0.2);
    expect(zoom).toBe(1.2);

    // Zoom exceeding max 2.0
    zoom = clampZoom(1.9, 0.5);
    expect(zoom).toBe(2.0);

    // Zoom under minimum 0.5
    zoom = clampZoom(0.6, -0.3);
    expect(zoom).toBe(0.5);
  });

  it('performs idempotent upsert merges for incoming realtime element batches', () => {
    const incoming: CanvasElement[] = [
      {
        id: 'gateway-1',
        type: 'GATEWAY',
        x: 150, // moved
        y: 120,
        title: 'Auth Gateway (v2)',
      },
      {
        id: 'db-1',
        type: 'DATABASE',
        x: 700,
        y: 200,
        title: 'Neon Postgres',
      },
    ];

    const merged = mergeCanvasUpsert(initialElements, incoming);
    expect(merged.length).toBe(4); // gateway-1 updated, service-1 kept, conn-1 kept, db-1 added

    const updatedGateway = merged.find((el) => el.id === 'gateway-1');
    expect(updatedGateway?.x).toBe(150);
    expect(updatedGateway?.title).toBe('Auth Gateway (v2)');
  });

  it('cascades deletion of node to associated connector lines', () => {
    const cleaned = deleteElementAndConnectors(initialElements, 'gateway-1');
    expect(cleaned.length).toBe(1);
    expect(cleaned[0].id).toBe('service-1');
    // conn-1 was removed because its fromId pointed to gateway-1
    expect(cleaned.find((el) => el.type === 'CONNECTOR')).toBeUndefined();
  });
});
