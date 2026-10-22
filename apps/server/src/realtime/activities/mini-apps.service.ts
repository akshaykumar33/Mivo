import { Injectable, Logger } from '@nestjs/common';
import { MiniAppManifest, ActivityStateBroadcast, MiniAppType } from '@mivo/shared';

@Injectable()
export class MiniAppsService {
  private readonly logger = new Logger(MiniAppsService.name);
  private activeActivities = new Map<string, ActivityStateBroadcast>();

  private catalog: MiniAppManifest[] = [
    {
      id: 'activity-chess',
      type: 'CHESS',
      title: 'Multiplayer Speed Chess',
      description: 'In-room interactive chess game with blitz timers and move validation.',
      icon: '♟️',
      sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
    },
    {
      id: 'activity-figma',
      type: 'FIGMA_EMBED',
      title: 'Figma Live Stage Review',
      description: 'Collaborative real-time design critique and prototype walkthrough.',
      icon: '🎨',
      initialUrl: 'https://www.figma.com/embed?community_demo=1',
      sandboxFlags: 'allow-scripts allow-forms allow-same-origin allow-popups',
    },
    {
      id: 'activity-github-pr',
      type: 'GITHUB_PR',
      title: 'GitHub PR Live Diff Inspector',
      description: 'Review code diffs, approve pull requests, and pin inline feedback together.',
      icon: '🐙',
      sandboxFlags: 'allow-scripts allow-forms allow-same-origin',
    },
  ];

  getCatalog(): MiniAppManifest[] {
    return this.catalog;
  }

  getActiveActivity(roomId: string): ActivityStateBroadcast | null {
    return this.activeActivities.get(roomId) || null;
  }

  /**
   * Launch a mini-app inside a room
   */
  launchActivity(roomId: string, type: MiniAppType, startedByUserId: string, initialPayload?: any): ActivityStateBroadcast {
    let initialState: any = {};
    if (type === 'CHESS') {
      initialState = {
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        moves: [],
        whitePlayerId: startedByUserId,
        blackPlayerId: null,
        history: [],
      };
    } else if (type === 'FIGMA_EMBED') {
      initialState = {
        embedUrl: initialPayload?.url || 'https://www.figma.com/embed?community_demo=1',
        zoom: 1.0,
        annotations: [],
      };
    } else if (type === 'GITHUB_PR') {
      initialState = {
        prNumber: initialPayload?.prNumber || 104,
        repo: initialPayload?.repo || 'mivo-monorepo',
        title: 'feat: add SFU engine, E2EE, and pair-programming sandbox',
        author: 'alex_rivera',
        diffFiles: [
          { filename: 'apps/server/src/realtime/sfu/sfu-engine.service.ts', additions: 184, deletions: 0 },
          { filename: 'apps/web/src/features/code-stage/CodeStage.tsx', additions: 320, deletions: 12 },
        ],
        reviews: [],
      };
    } else {
      initialState = initialPayload || {};
    }

    const activity: ActivityStateBroadcast = {
      roomId,
      activityId: `act_${type.toLowerCase()}_${Date.now()}`,
      type,
      startedByUserId,
      state: initialState,
      participants: [startedByUserId],
    };

    this.activeActivities.set(roomId, activity);
    this.logger.log(`Launched activity ${type} in room ${roomId} by user ${startedByUserId}`);
    return activity;
  }

  /**
   * Process an action within the mini-app
   */
  handleAction(roomId: string, userId: string, actionType: string, payload: any): ActivityStateBroadcast | null {
    const activity = this.activeActivities.get(roomId);
    if (!activity) return null;

    if (!activity.participants.includes(userId)) {
      activity.participants.push(userId);
    }

    if (activity.type === 'CHESS') {
      if (actionType === 'JOIN_BLACK') {
        activity.state.blackPlayerId = userId;
      } else if (actionType === 'MOVE') {
        activity.state.moves.push(payload.move);
        activity.state.turn = activity.state.turn === 'w' ? 'b' : 'w';
        if (payload.newFen) activity.state.fen = payload.newFen;
        activity.state.history.push({
          player: userId,
          move: payload.move,
          timestamp: new Date().toISOString(),
        });
      }
    } else if (activity.type === 'FIGMA_EMBED') {
      if (actionType === 'ADD_ANNOTATION') {
        activity.state.annotations.push({
          id: `ann_${Date.now()}`,
          userId,
          x: payload.x,
          y: payload.y,
          comment: payload.comment,
        });
      } else if (actionType === 'SET_URL') {
        activity.state.embedUrl = payload.url;
      }
    } else if (activity.type === 'GITHUB_PR') {
      if (actionType === 'SUBMIT_REVIEW') {
        activity.state.reviews.push({
          userId,
          verdict: payload.verdict, // 'APPROVE' | 'REQUEST_CHANGES'
          comment: payload.comment,
          timestamp: new Date().toISOString(),
        });
      }
    }

    this.logger.log(`Room ${roomId} Mini-App Action: ${actionType} by user ${userId}`);
    return activity;
  }

  closeActivity(roomId: string): boolean {
    const existed = this.activeActivities.delete(roomId);
    if (existed) {
      this.logger.log(`Closed activity in room ${roomId}`);
    }
    return existed;
  }
}
