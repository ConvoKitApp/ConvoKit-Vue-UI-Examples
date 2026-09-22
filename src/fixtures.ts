import type { Conversation, InboxSummary, Message } from '@convokitapp/sdk'

const participants = [
  {
    id: 'participant-maya',
    appUserId: 'maya',
    name: 'Maya Chen',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
    readPosition: null,
  },
  {
    id: 'participant-alex',
    appUserId: 'alex',
    name: 'Alex Rivera',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:30:00Z'),
    readPosition: null,
  },
  {
    id: 'participant-jordan',
    appUserId: 'jordan',
    name: 'Jordan Lee',
    imageUrl: null,
    role: 'READ_WRITE',
    lastReadAt: new Date('2026-08-26T11:28:00Z'),
    readPosition: null,
  },
] satisfies Conversation['participants']

export const conversations: Conversation[] = [
  ['product-launch', 'Product launch', 'Release coordination'],
  ['customer-operations', 'Customer operations', 'Service desk handoff'],
  ['design-review', 'Design review', 'Interface review'],
  ['incident-room', 'Incident room', 'Live response'],
].map(([id, title, description], index) => ({
  id,
  appId: 'demo-app',
  title,
  displayTitle: title,
  description,
  imageUrl: null,
  participants: participants.map((participant) => ({ ...participant })),
  createdAt: new Date(`2026-08-${20 + index}T09:00:00Z`),
  updatedAt: new Date(`2026-08-26T11:${27 - index}:00Z`),
}))

/** Rows older than the page the showcase opens with: history the room has but the loaded window does not. A quoted
 * reply pointing here is what a jump has to load (0.9.0), the way the package's own store loads one window with
 * `getMessageContext` instead of paging back to the message.
 */
export const olderMessages: Message[] = [
  {
    id: 'message-0',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'Kickoff notes: we ship on the 4th and freeze the pricing page on the 1st.',
    media: [],
    createdAt: new Date('2026-08-26T10:52:00Z'),
    updatedAt: null,
    revision: 0,
  },
]

/** Rows as `getMessages` returns them (0.8.0 adds `revision`: 0 when sent, +1 per edit; 0.9.0 adds the optional
 * `replyToMessageId`). One row is edited so the package's `Edited` label renders; the viewer's own confirmed rows
 * (`maya`) are the ones the views let her edit or delete, while any member may quote any row. `revision`, never
 * `updatedAt`, is the edited signal. Three rows are replies: one quotes a row in this page, one quotes
 * `message-0` (outside it, so the quoted block has to jump), and one quotes a message that was deleted since —
 * the reference survives the deletion and the quoted block reads `Original message unavailable`.
 */
export const messages: Message[] = [
  {
    id: 'message-1',
    conversationId: 'product-launch',
    senderId: 'alex',
    text: 'The final launch checklist is ready for review.',
    media: [],
    createdAt: new Date('2026-08-26T11:14:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'message-2',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'Great. I approved the copy and shared the release notes.',
    media: [
      {
        id: 'image-1',
        type: 'image',
        name: 'launch-board.svg',
        url: '/launch-board.svg',
        size: 186432,
      },
    ],
    createdAt: new Date('2026-08-26T11:19:00Z'),
    // Caption edited once after the send: the row reads `Edited`; its attachment was kept.
    updatedAt: new Date('2026-08-26T11:21:00Z'),
    revision: 1,
  },
  {
    id: 'message-3',
    conversationId: 'product-launch',
    senderId: 'jordan',
    text: 'Attaching the final handoff document.',
    media: [
      {
        id: 'file-1',
        type: 'file',
        name: 'launch-handoff.pdf',
        url: 'https://example.com/launch-handoff.pdf',
        size: 245760,
      },
    ],
    createdAt: new Date('2026-08-26T11:23:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'message-4',
    conversationId: 'product-launch',
    senderId: 'maya',
    text: 'I linked this conversation to the support case.',
    media: [
      {
        id: 'ticket-contact',
        type: 'contact',
        name: 'Ticket CK-4821',
        metadata: { email: 'Payment verification' },
      },
    ],
    createdAt: new Date('2026-08-26T11:27:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'message-8',
    conversationId: 'product-launch',
    senderId: 'alex',
    // The quoted parent is in this page, so the showcase resolves its preview without leaving the window. It is
    // also one of the viewer's own rows, so editing or deleting it shows what happens to a quote of it.
    replyToMessageId: 'message-2',
    text: 'That matches the checklist, thanks.',
    media: [],
    createdAt: new Date('2026-08-26T11:29:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'message-9',
    conversationId: 'product-launch',
    senderId: 'jordan',
    // The quoted parent is older than this page: opening the quote loads the window around it.
    replyToMessageId: 'message-0',
    text: 'Still tracking those kickoff dates, nothing has moved.',
    media: [],
    createdAt: new Date('2026-08-26T11:31:00Z'),
    updatedAt: null,
    revision: 0,
  },
  {
    id: 'message-10',
    conversationId: 'product-launch',
    senderId: 'maya',
    // The quoted message was deleted after this reply was sent: the reference is kept, the quote cannot resolve.
    replyToMessageId: 'message-deleted',
    text: 'Ignore the draft I deleted, this thread has the current plan.',
    media: [],
    createdAt: new Date('2026-08-26T11:33:00Z'),
    updatedAt: null,
    revision: 0,
  },
]

export const readAtByUserId = new Map([
  ['alex', new Date('2026-08-26T11:30:00Z')],
  ['jordan', new Date('2026-08-26T11:28:00Z')],
])

/** The viewer of every showcase surface; the list reads its own messages as `You: …`. */
export const currentUserId = 'maya'

/** Per-room inbox rows as `listInbox` returns them (the newest surviving message with its `revision`, unread count,
 * read state and the viewer's private unread marker). `isUnread` is
 * `unreadCount > 0 || unreadCountCapped || unreadMarkedAt !== null`; a marker without a count (design review) renders
 * as a numberless dot, never an invented count.
 */
export const summaries: ReadonlyMap<string, InboxSummary> = new Map<string, InboxSummary>([
  ['product-launch', {
    latestMessage: messages.at(-1)!,
    unreadCount: 0,
    unreadCountCapped: false,
    readPosition: { messageId: 'message-10', createdAt: new Date('2026-08-26T11:33:00Z') },
    lastReadAt: new Date('2026-08-26T11:34:00Z'),
    isUnread: false,
    unreadMarkedAt: null,
    privateStateVersion: 0,
    activityAt: new Date('2026-08-26T11:33:00Z'),
  }],
  ['customer-operations', {
    latestMessage: {
      id: 'message-5',
      conversationId: 'customer-operations',
      senderId: 'alex',
      text: 'The customer is waiting on the refund confirmation.',
      media: [],
      createdAt: new Date('2026-08-26T11:26:00Z'),
      updatedAt: null,
      revision: 0,
    },
    unreadCount: 2,
    unreadCountCapped: false,
    readPosition: null,
    lastReadAt: new Date('2026-08-26T10:40:00Z'),
    isUnread: true,
    unreadMarkedAt: null,
    privateStateVersion: 0,
    activityAt: new Date('2026-08-26T11:26:00Z'),
  }],
  ['design-review', {
    latestMessage: {
      id: 'message-6',
      conversationId: 'design-review',
      senderId: 'jordan',
      text: null,
      media: [{ id: 'image-2', type: 'image', name: 'settings-panel.png', url: '/launch-board.svg', size: 92160 }],
      createdAt: new Date('2026-08-26T11:25:00Z'),
      updatedAt: null,
      revision: 0,
    },
    // Read through the photo, then marked unread to revisit: no count, only the viewer's private marker.
    unreadCount: 0,
    unreadCountCapped: false,
    readPosition: { messageId: 'message-6', createdAt: new Date('2026-08-26T11:25:00Z') },
    lastReadAt: new Date('2026-08-26T11:29:00Z'),
    isUnread: true,
    unreadMarkedAt: new Date('2026-08-26T11:31:00Z'),
    privateStateVersion: 1,
    activityAt: new Date('2026-08-26T11:25:00Z'),
  }],
  ['incident-room', {
    latestMessage: {
      id: 'message-7',
      conversationId: 'incident-room',
      senderId: 'alex',
      text: 'Paging the on-call engineer now.',
      media: [],
      createdAt: new Date('2026-08-26T11:24:00Z'),
      updatedAt: null,
      revision: 0,
    },
    unreadCount: 120,
    unreadCountCapped: false,
    readPosition: null,
    lastReadAt: null,
    isUnread: true,
    unreadMarkedAt: null,
    privateStateVersion: 0,
    activityAt: new Date('2026-08-26T11:24:00Z'),
  }],
])
