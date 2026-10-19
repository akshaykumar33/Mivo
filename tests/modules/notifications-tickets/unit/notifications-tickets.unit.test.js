/**
 * Module: notifications-tickets
 * Unit Test: Notification & Ticketing Business Logic, Categories, and State Transitions
 */

import assert from 'node:assert';

const VALID_NOTIFICATION_TYPES = ['MESSAGE', 'CALL', 'MEETING', 'TICKET', 'SYSTEM'];
const VALID_TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const VALID_TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function filterNotifications(notifications, filter) {
  if (filter === 'ALL') return notifications;
  return notifications.filter((n) => n.type === filter);
}

function calculateUnreadCounts(notifications) {
  const counts = {
    ALL: 0,
    MESSAGE: 0,
    CALL: 0,
    MEETING: 0,
    TICKET: 0,
    SYSTEM: 0,
  };

  for (const n of notifications) {
    if (!n.isRead) {
      counts.ALL++;
      if (counts[n.type] !== undefined) {
        counts[n.type]++;
      }
    }
  }

  return counts;
}

function applyTicketStatusTransition(currentTicket, newStatus) {
  assert.ok(VALID_TICKET_STATUSES.includes(newStatus), `Invalid status: ${newStatus}`);
  return {
    ...currentTicket,
    status: newStatus,
    closedAt: newStatus === 'RESOLVED' || newStatus === 'CLOSED' ? new Date().toISOString() : null,
  };
}

function run() {
  console.log('🧪 [notifications-tickets/unit] Running notifications-tickets.unit.test.js...');

  // 1. Notification Types
  for (const type of VALID_NOTIFICATION_TYPES) {
    assert.ok(VALID_NOTIFICATION_TYPES.includes(type));
  }
  assert.strictEqual(VALID_NOTIFICATION_TYPES.includes('UNKNOWN'), false);
  console.log('   ✅ Validated Notification types: MESSAGE, CALL, MEETING, TICKET, SYSTEM.');

  // 2. Notification Unread Calculation & Filtering
  const sampleNotifications = [
    { id: '1', type: 'MESSAGE', title: 'New DM from Alice', body: 'Hey there', isRead: false },
    { id: '2', type: 'CALL', title: 'Incoming Call from Bob', body: 'Voice call', isRead: false },
    { id: '3', type: 'MEETING', title: 'Team Standup', body: 'Google Meet started', isRead: true },
    { id: '4', type: 'TICKET', title: 'Ticket Assigned: Bug #101', body: 'High priority', isRead: false },
    { id: '5', type: 'MESSAGE', title: 'New DM from Charlie', body: 'See you', isRead: true },
  ];

  const counts = calculateUnreadCounts(sampleNotifications);
  assert.strictEqual(counts.ALL, 3);
  assert.strictEqual(counts.MESSAGE, 1);
  assert.strictEqual(counts.CALL, 1);
  assert.strictEqual(counts.MEETING, 0);
  assert.strictEqual(counts.TICKET, 1);
  console.log('   ✅ Validated unread count breakdown across categories.');

  const messageOnly = filterNotifications(sampleNotifications, 'MESSAGE');
  assert.strictEqual(messageOnly.length, 2);
  const ticketOnly = filterNotifications(sampleNotifications, 'TICKET');
  assert.strictEqual(ticketOnly.length, 1);
  const all = filterNotifications(sampleNotifications, 'ALL');
  assert.strictEqual(all.length, 5);
  console.log('   ✅ Validated notification category filtering.');

  // 3. Ticket Status Transitions
  let ticket = {
    id: 'ticket-1',
    title: 'Safari WebRTC Audio Glitch',
    description: 'Audio crackles intermittently on Safari 17',
    category: 'Technical',
    priority: 'HIGH',
    status: 'OPEN',
    closedAt: null,
  };

  assert.ok(VALID_TICKET_PRIORITIES.includes(ticket.priority));
  assert.strictEqual(ticket.status, 'OPEN');
  assert.strictEqual(ticket.closedAt, null);

  // Transition to IN_PROGRESS
  ticket = applyTicketStatusTransition(ticket, 'IN_PROGRESS');
  assert.strictEqual(ticket.status, 'IN_PROGRESS');
  assert.strictEqual(ticket.closedAt, null);

  // Transition to RESOLVED
  ticket = applyTicketStatusTransition(ticket, 'RESOLVED');
  assert.strictEqual(ticket.status, 'RESOLVED');
  assert.ok(ticket.closedAt !== null);

  // Transition to CLOSED
  ticket = applyTicketStatusTransition(ticket, 'CLOSED');
  assert.strictEqual(ticket.status, 'CLOSED');
  assert.ok(ticket.closedAt !== null);

  console.log('   ✅ Validated ticket priority and lifecycle state transitions.');

  console.log('✨ All notification & ticket unit tests passed successfully!\n');
}

run();
