import { describe, it, expect, beforeEach } from 'vitest';
import { useConversationStore } from '@/stores/conversationStore';

describe('Messaging & Chat Module — Zustand Conversation Store', () => {
  beforeEach(() => {
    useConversationStore.setState({
      conversations: [],
      activeConversationId: null,
      messages: {},
      typingUsers: {},
      unreadCounts: {},
      isLoading: false,
      activeCall: null,
      incomingCall: null,
      isCallMuted: false,
      isCallDeafened: false,
      callParticipants: [],
    });
  });

  it('initializes with default empty conversation state', () => {
    const state = useConversationStore.getState();
    expect(state.conversations).toEqual([]);
    expect(state.activeConversationId).toBeNull();
    expect(state.messages).toEqual({});
    expect(state.activeCall).toBeNull();
  });

  it('selects active conversation and tracks conversation switching', () => {
    useConversationStore.setState({ activeConversationId: 'conv-dm-42' });
    expect(useConversationStore.getState().activeConversationId).toBe('conv-dm-42');

    useConversationStore.setState({ activeConversationId: null });
    expect(useConversationStore.getState().activeConversationId).toBeNull();
  });

  it('stores messages partitioned by conversationId', () => {
    const msg1 = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'usr-1',
      content: 'Hello World',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const msg2 = {
      id: 'msg-2',
      conversationId: 'conv-2',
      senderId: 'usr-2',
      content: 'Second Conversation',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    useConversationStore.setState({
      messages: {
        'conv-1': [msg1 as any],
        'conv-2': [msg2 as any],
      },
    });

    const state = useConversationStore.getState();
    expect(state.messages['conv-1']).toHaveLength(1);
    expect(state.messages['conv-1'][0].content).toBe('Hello World');
    expect(state.messages['conv-2'][0].content).toBe('Second Conversation');
  });

  it('manages typing users by conversation ID', () => {
    useConversationStore.setState({
      typingUsers: {
        'conv-1': ['alice', 'bob'],
      },
    });

    const state = useConversationStore.getState();
    expect(state.typingUsers['conv-1']).toEqual(['alice', 'bob']);
  });

  it('manages active audio call state', () => {
    useConversationStore.setState({
      activeCall: {
        conversationId: 'conv-call-1',
        isGroup: false,
        callerId: 'usr-dev',
        callerName: 'Dev Admin',
        status: 'connected',
      },
      isCallMuted: true,
      callParticipants: ['usr-dev', 'usr-sarah'],
    });

    const state = useConversationStore.getState();
    expect(state.activeCall?.status).toBe('connected');
    expect(state.isCallMuted).toBe(true);
    expect(state.callParticipants).toContain('usr-sarah');
  });
});
