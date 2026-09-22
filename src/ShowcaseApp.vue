<script setup lang="ts">
import type { InboxSummary, Message, MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  isConvoKitPendingMessage,
  type ConversationItemSlotProps,
  type ReplyPreviewEntry,
} from '@convokitapp/vue-ui'
import {
  ArrowDown, ArrowLeft, Bot, Check, CheckCheck, Circle, Headphones, Paperclip, Pencil, Reply, Send, Ticket, Trash2, Users,
} from '@lucide/vue'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { conversations, currentUserId, messages, olderMessages, readAtByUserId, summaries } from './fixtures'

type Variant = 'standard' | 'branded' | 'compact'
const variants: Array<{ id: Variant; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'branded', label: 'Branded support' },
  { id: 'compact', label: 'Compact operations' },
]
const details = {
  standard: {
    number: '1', title: 'Standard components',
    description: 'Neutral, shadcn-inspired defaults for inbox rows, messages, receipts, media and the composer.',
    props: ['summaries', 'currentUserId', 'onRefresh', 'onAddAttachment', 'readAtByUserId', 'reverseMessages: true', 'editingMessage', 'onEditMessage', 'onDeleteMessage', 'replyTarget', 'replyPreviewByMessageId', '@reply-to-message', '@jump-to-message'],
  },
  branded: {
    number: '2', title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless slots.',
    props: ['#conversation-item', '#header', '#media', '#read-receipt', '#composer: editing / cancelEdit / replying / cancelReply', 'theme.highlight'],
  },
  compact: {
    number: '3', title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', '#conversation-item', '#message: isEdited / edit / remove / canReply / reply / replyPreview', '#typing-indicator', '#jump-to-latest', 'confirmDelete', 'stickToBottom: false'],
  },
} satisfies Record<Variant, { number: string; title: string; description: string; props: string[] }>

function variantFromUrl(): Variant {
  const value = new URLSearchParams(window.location.search).get('variant')
  return variants.some((item) => item.id === value) ? value as Variant : 'standard'
}

const variant = ref<Variant>(variantFromUrl())
const detail = computed(() => details[variant.value])
const selected = conversations[0]!
const typing = computed(() => new Set(variant.value === 'standard' ? [] : ['alex']))
const theme = computed(() => variant.value === 'branded' ? {
  primary: '#6d45a8', background: '#fbfaff', border: '#e5dff0', outgoingBubble: '#6d45a8',
  // The 0.9.0 token behind the fading tint on the row a jump landed on; it defaults to the primary colour.
  highlight: 'color-mix(in srgb, #6d45a8 16%, transparent)',
} : {})

/** Everything the room holds. The chat views only ever render one window of it — `rows` — exactly as the library's
 * own store holds one window over the server's history (replaced, never mutated, hence `shallowRef`).
 */
const history = shallowRef<Message[]>([...olderMessages, ...messages])
/** The rows every chat view renders, the edit in progress and the message the composer is quoting: fixture state
 * the controlled views are pure functions of. A real app keeps the same shape; the library's `Conversation` wraps
 * it in `useConversation`.
 */
const rows = shallowRef<Message[]>([...messages])
const editingMessage = shallowRef<Message | null>(null)
const replyTarget = shallowRef<Message | null>(null)
const windowMode = shallowRef<'live' | 'jumped'>('live')
const highlightedMessageId = shallowRef<string | null>(null)
const jumpInFlight = shallowRef(false)
/** The newest page: what the showcase opens with and what `returnToLatest` restores. */
const pageSize = messages.length
/** Rows one jumped window holds; a real host passes the same number as `getMessageContext`'s `limit`. */
const contextWindowSize = 5
let sentCount = 0
let highlightTimer: ReturnType<typeof setTimeout> | undefined
let jumpTimer: ReturnType<typeof setTimeout> | undefined
onBeforeUnmount(() => {
  clearTimeout(highlightTimer)
  clearTimeout(jumpTimer)
})

/** Apply one change to the rendered window and to the history behind it: a real backend keeps one conversation and
 * the views hold a window over it, so a message that is edited, deleted or sent has to change both.
 */
function patchRows(change: (list: Message[]) => Message[]) {
  history.value = change(history.value)
  rows.value = change(rows.value)
}

function senderName(userId: string) {
  return selected.participants.find((participant) => participant.appUserId === userId)?.name ?? userId
}

/** `onEditMessage`: the view enters edit mode; the composer prefills with the row's text and saves instead of sending. */
function startEditing(message: Message) {
  editingMessage.value = message
  // Editing and replying are mutually exclusive; the library's own store drops the other one the same way.
  replyTarget.value = null
}

function cancelEditing() {
  editingMessage.value = null
}

/** `onSaveEdit`: what the backend does with `editMessage(message.id, { text, revision: message.revision })`, locally.
 * The trimmed text replaces the caption (`null` clears the caption of a message with attachments; the view never
 * saves an empty text-only message), the attachments stay and `revision` moves up by one, so the row reads `Edited`.
 * An edit never touches what a reply points at, so the quotes below it are unaffected.
 */
function saveEdit(message: Message, text: string) {
  patchRows((list) => list.map((row) => row.id === message.id
    ? { ...row, text: text || null, revision: row.revision + 1, updatedAt: new Date() }
    : row))
  editingMessage.value = null
  return true
}

/** `onDeleteMessage`: the row is gone for every member; the views ask first (inline prompt or `confirmDelete`).
 * Deleting the row being edited ends the edit too (the library's store does the same), so the composer never keeps
 * a banner, prefilled text and Save for a message that no longer exists; deleting the quoted message leaves every
 * reply to it in place, with the reference kept and the quoted block reading `Original message unavailable`.
 */
function deleteMessage(message: Message) {
  patchRows((list) => list.filter((row) => row.id !== message.id))
  if (editingMessage.value?.id === message.id) editingMessage.value = null
  if (replyTarget.value?.id === message.id) replyTarget.value = null
  return true
}

/** `onReplyToMessage`: the composer shows its reply strip and keeps the unsent draft — quoting, unlike editing,
 * never replaces the field. Any member may quote any confirmed row, own or not.
 */
function startReply(message: Message) {
  replyTarget.value = message
  editingMessage.value = null
}

/** `onCancelReply`: drop the quote; nothing else changes. */
function cancelReply() {
  replyTarget.value = null
}

/** `onSendMessage`: the reply target is stamped on the row that appears, so the quoted block renders with the
 * message, and the strip is cleared once the send was accepted. A send belongs to the newest page, so a jumped
 * window returns to it first and the quote survives the switch.
 */
function send(text: string) {
  const quoted = replyTarget.value
  const message: Message = {
    id: `message-sent-${++sentCount}`,
    conversationId: selected.id,
    senderId: currentUserId,
    text,
    media: [],
    createdAt: new Date(),
    updatedAt: null,
    revision: 0,
    ...(quoted ? { replyToMessageId: quoted.id } : {}),
  }
  returnToLatest()
  patchRows((list) => [...list, message])
  replyTarget.value = null
  return true
}

/** What `getReplyPreviews(conversationId, ids)` answers for one quoted parent: a trimmed copy of the message, or
 * nothing at all once it has been deleted — which the views render as `Original message unavailable`, keeping the
 * reply and its reference.
 */
function previewFor(parentId: string): ReplyPreviewEntry {
  const parent = history.value.find((row) => row.id === parentId)
  if (!parent) return 'unavailable'
  return {
    id: parent.id,
    conversationId: parent.conversationId,
    senderId: parent.senderId,
    text: parent.text === null ? null : parent.text.slice(0, 500),
    textTruncated: (parent.text?.length ?? 0) > 500,
    createdAt: parent.createdAt,
    revision: parent.revision,
    mediaCount: parent.media.length,
  }
}

/** One resolution for the distinct quoted parents of the rendered rows, never one per row — the batching the
 * library's store does with `getReplyPreviews`. A row whose id is missing from this map renders its reference with
 * no quoted text ("not resolved yet"), which is why the map is keyed by `Message.replyToMessageId`.
 */
const replyPreviews = computed(() => new Map(
  [...new Set(rows.value.flatMap((row) => row.replyToMessageId ?? []))]
    .map((parentId) => [parentId, previewFor(parentId)] as const),
))

/** The three states a quoted parent can be in for a custom row: resolved, gone, and not resolved yet — which shows
 * the reference alone and never the unavailable copy.
 */
function quoteLabel(preview: ReplyPreviewEntry | undefined) {
  if (preview === undefined) return 'Quoted message'
  if (preview === 'unavailable') return 'Original message unavailable'
  const body = preview.text ?? (preview.mediaCount === 1 ? '1 attachment' : `${preview.mediaCount} attachments`)
  return `${senderName(preview.senderId)}: ${body}`
}

/** Only ever true in a jumped window: rows exist past its newer edge. */
const hasNewerMessages = computed(() =>
  windowMode.value === 'jumped' && rows.value.at(-1)?.id !== history.value.at(-1)?.id)

/** `onJumpToMessage`: a row that is already rendered is only highlighted; any other row replaces the window with
 * the rows around it, which is what `getMessageContext` returns for the library's own store. A quoted message that
 * was deleted has no window to load — its quoted block already reads `Original message unavailable`.
 */
function jumpToMessage(messageId: string) {
  const index = history.value.findIndex((row) => row.id === messageId)
  if (index < 0) return
  // The guard goes up for EVERY jump, before the window changes: replacing it with a shorter list clamps the
  // scroll position, and the package re-centres the target row either way — both emit a scroll event of their
  // own, and neither may clear the highlight or page.
  clearTimeout(jumpTimer)
  clearTimeout(highlightTimer)
  jumpInFlight.value = true
  if (!rows.value.some((row) => row.id === messageId)) {
    const start = Math.max(0, Math.min(
      index - Math.floor(contextWindowSize / 2),
      history.value.length - contextWindowSize,
    ))
    rows.value = history.value.slice(start, start + contextWindowSize)
    windowMode.value = 'jumped'
  }
  highlightedMessageId.value = messageId
  // Released on a short timer, never on the first scroll event: a target already in view produces none. The
  // highlight's own timeout starts when the guard clears, as the library's store does.
  jumpTimer = setTimeout(() => {
    jumpInFlight.value = false
    highlightTimer = setTimeout(() => { highlightedMessageId.value = null }, 2000)
  }, 150)
}

/** `onLoadNewer`: the newer edge of a jumped window. Reaching the newest row returns to the live page instead of
 * flipping the window's mode in place, as the library's store does.
 */
function loadNewer() {
  const last = rows.value.at(-1)
  const index = last ? history.value.findIndex((row) => row.id === last.id) : -1
  if (index < 0) return
  const newer = history.value.slice(index + 1, index + 1 + contextWindowSize)
  if (newer.length === 0 || index + 1 + newer.length === history.value.length) {
    returnToLatest()
    return
  }
  rows.value = [...rows.value, ...newer]
}

/** `onReturnToLatest`: drop the historical window and render the newest page again. Passing it is what renders the
 * package's "Jump to latest" control, so the views only receive it while the window is jumped. A live window is
 * already the newest page and is left alone — re-slicing it would evict rows appended since it was loaded, which
 * is why the library's store returns early on the same condition.
 */
function returnToLatest() {
  if (windowMode.value !== 'jumped') return
  rows.value = history.value.slice(-pageSize)
  windowMode.value = 'live'
}

/** `confirmDelete` for the compact view: replaces the package's inline prompt and confirms a custom row's `remove()`. */
function confirmDelete(message: Message) {
  return window.confirm(`Delete "${message.text ?? 'this message'}"?`)
}

function chooseVariant(next: Variant) {
  variant.value = next
  editingMessage.value = null
  replyTarget.value = null
  highlightedMessageId.value = null
  returnToLatest()
  const url = new URL(window.location.href)
  url.searchParams.set('variant', next)
  window.history.replaceState({}, '', url)
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function messageStatus(message: Message) {
  return isConvoKitPendingMessage(message) ? 'Sending…' : formatTime(message.createdAt)
}

function ticketLabel(media: MessageMedia) {
  return media.type === 'contact' ? media.metadata.email : ''
}

/** Custom rows read the same `summary` the default rows render; the viewer's own messages read `You: …`. */
function preview({ summary, currentUserId: viewer }: ConversationItemSlotProps) {
  const message = summary?.latestMessage
  if (!message) return 'No messages yet'
  const body = message.text ?? (message.media[0]?.type === 'image' ? 'Photo' : message.media[0]?.name ?? 'Attachment')
  return message.senderId === viewer ? `You: ${body}` : body
}

/** The numeric badge: only for a count (or a capped count), `99+` above 99. */
function unreadLabel(summary: InboxSummary | undefined) {
  if (!summary || (summary.unreadCount <= 0 && !summary.unreadCountCapped)) return ''
  return summary.unreadCountCapped || summary.unreadCount > 99 ? '99+' : String(summary.unreadCount)
}

/** The numberless dot: the viewer's private marker (`isUnread`) with no count to show, never `0 unread`. */
function unreadDot(summary: InboxSummary | undefined) {
  return summary !== undefined && summary.isUnread && !unreadLabel(summary)
}

/** The row's unread state (bold title): a count, a capped count or the private marker, as the default rows do. */
function isUnread(summary: InboxSummary | undefined) {
  return summary !== undefined && (summary.isUnread || summary.unreadCount > 0 || summary.unreadCountCapped)
}
</script>

<template>
  <ConvoKitThemeProvider :theme="theme">
    <main class="showcase" :class="`showcase--${variant}`" :data-variant="variant">
      <header class="showcase__header">
        <div class="brand">
          <span class="brand__mark"><Bot aria-hidden="true" /></span>
          <span><strong>ConvoKit Vue UI</strong><small>Web-native components, configured with Vue props and named slots</small></span>
        </div>
        <nav class="variant-tabs" aria-label="Component configuration">
          <button v-for="item in variants" :key="item.id" type="button" :data-active="item.id === variant || undefined" @click="chooseVariant(item.id)">
            <CheckCheck v-if="item.id === variant" aria-hidden="true" :size="15" />{{ item.label }}
          </button>
        </nav>
      </header>

      <section class="showcase__intro">
        <div><h1>{{ detail.number }} · {{ detail.title }}</h1><p>{{ detail.description }}</p></div>
        <div class="prop-badges"><code v-for="item in detail.props" :key="item">{{ item }}</code></div>
      </section>

      <section class="component-grid">
        <article class="component-card component-card--list">
          <div class="component-label">Conversation list</div>
          <ConversationListView
            v-if="variant === 'standard'"
            :conversations="conversations"
            :summaries="summaries"
            :current-user-id="currentUserId"
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
          />
          <ConversationListView
            v-else-if="variant === 'branded'"
            :conversations="conversations"
            :summaries="summaries"
            :current-user-id="currentUserId"
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
          >
            <template #conversation-item="slotProps">
              <button type="button" class="branded-row" :data-selected="slotProps.selected || undefined" :data-unread="isUnread(slotProps.summary) || undefined" @click="slotProps.select">
                <span class="branded-row__avatar">{{ slotProps.conversation.displayTitle[0] }}</span>
                <span><strong>{{ slotProps.conversation.displayTitle }}</strong><small>{{ preview(slotProps) }}</small></span>
                <b v-if="unreadLabel(slotProps.summary)">{{ unreadLabel(slotProps.summary) }}</b>
                <i v-else-if="unreadDot(slotProps.summary)" class="branded-row__dot" role="img" aria-label="Unread" />
              </button>
            </template>
          </ConversationListView>
          <ConversationListView
            v-else
            :conversations="conversations"
            :summaries="summaries"
            :current-user-id="currentUserId"
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
            density="compact"
          >
            <template #conversation-item="slotProps">
              <button type="button" class="compact-row" :data-unread="isUnread(slotProps.summary) || undefined" @click="slotProps.select">
                <span>{{ slotProps.conversation.displayTitle[0] }}</span><strong>{{ slotProps.conversation.displayTitle }}</strong><b v-if="unreadLabel(slotProps.summary)">{{ unreadLabel(slotProps.summary) }}</b><i v-else-if="unreadDot(slotProps.summary)" class="compact-row__dot" role="img" aria-label="Unread" /><Circle v-if="slotProps.selected" fill="currentColor" :size="7" />
              </button>
            </template>
          </ConversationListView>
        </article>

        <article class="component-card component-card--chat">
          <div class="component-label">Chat view</div>
          <!-- The 0.9.0 reply and jump callbacks are bound as events: `@reply-to-message` lands on the
               `onReplyToMessage` prop, so either form works. `onReturnToLatest` is bound as a prop because its
               presence is what renders the package's "Jump to latest" control. -->
          <ConversationView
            v-if="variant === 'standard'"
            :conversation="selected"
            :messages="rows"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="send"
            :on-refresh="() => undefined"
            :on-add-attachment="() => undefined"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :reply-target="replyTarget"
            :reply-preview-by-message-id="replyPreviews"
            :highlighted-message-id="highlightedMessageId"
            :jump-in-flight="jumpInFlight"
            :has-newer-messages="hasNewerMessages"
            :on-return-to-latest="windowMode === 'jumped' ? returnToLatest : undefined"
            :format-time="formatTime"
            @reply-to-message="startReply"
            @cancel-reply="cancelReply"
            @jump-to-message="jumpToMessage"
            @load-newer="loadNewer"
          />
          <ConversationView
            v-else-if="variant === 'branded'"
            :conversation="selected"
            :messages="rows"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="send"
            :on-add-attachment="() => undefined"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :reply-target="replyTarget"
            :reply-preview-by-message-id="replyPreviews"
            :highlighted-message-id="highlightedMessageId"
            :jump-in-flight="jumpInFlight"
            :has-newer-messages="hasNewerMessages"
            :on-return-to-latest="windowMode === 'jumped' ? returnToLatest : undefined"
            :format-time="formatTime"
            @reply-to-message="startReply"
            @cancel-reply="cancelReply"
            @jump-to-message="jumpToMessage"
            @load-newer="loadNewer"
          >
            <template #header>
              <header class="branded-header"><span><Headphones /></span><div><strong>{{ selected.displayTitle }}</strong><small>Priority support · SLA 18 min</small></div><Users :size="19" /></header>
            </template>
            <template #media="slotProps">
              <div v-if="slotProps.media.type === 'contact'" class="ticket-card"><Ticket /><span><strong>{{ slotProps.media.name }}</strong><small>{{ ticketLabel(slotProps.media) }}</small></span><button type="button">Open</button></div>
              <button v-else-if="slotProps.media.type === 'image'" type="button" class="ckui-media-card ckui-media-card--image" @click="slotProps.open"><img :src="slotProps.media.url" :alt="slotProps.media.name ?? 'Shared image'"><span v-if="slotProps.media.name" class="ckui-media-name">{{ slotProps.media.name }}</span></button>
              <div v-else class="ckui-media-card"><span><strong>{{ slotProps.media.name ?? 'Attachment' }}</strong></span></div>
            </template>
            <template #read-receipt="slotProps">
              <span class="branded-receipt"><CheckCheck :size="12" /> Read by {{ slotProps.readerIds.size ? 'Alex Rivera' : 'nobody yet' }}</span>
            </template>
            <template #composer="slotProps">
              <div class="branded-composer" :data-editing="slotProps.editing ? '' : undefined" :data-replying="slotProps.replying ? '' : undefined">
                <p v-if="slotProps.editing" class="branded-composer__editing" role="status"><Pencil :size="13" /><span><strong>Editing message</strong> {{ slotProps.editing.text ?? `${slotProps.editing.media.length} attachment(s)` }}</span><button type="button" aria-label="Cancel editing" @click="slotProps.cancelEdit">Cancel</button></p>
                <!-- `replying` is never set while `editing` is: the view resolves that for every composer. Unlike
                     edit mode it leaves the field alone, so the draft below survives the quote. -->
                <p v-if="slotProps.replying" class="branded-composer__replying" role="status"><Reply :size="13" /><span><strong>Replying to {{ senderName(slotProps.replying.senderId) }}</strong> {{ slotProps.replying.text ?? `${slotProps.replying.media.length} attachment(s)` }}</span><button type="button" aria-label="Cancel reply" @click="slotProps.cancelReply">Cancel</button></p>
                <div><button type="button" aria-label="Attach" @click="slotProps.addAttachment"><Paperclip /></button><input :value="slotProps.value" :placeholder="slotProps.editing ? 'Edit your message…' : 'Reply to customer…'" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" @click="slotProps.send">{{ slotProps.editing ? 'Save' : 'Send' }}</button></div>
              </div>
            </template>
          </ConversationView>
          <ConversationView
            v-else
            :conversation="selected"
            :messages="rows"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="send"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :confirm-delete="confirmDelete"
            :reply-target="replyTarget"
            :reply-preview-by-message-id="replyPreviews"
            :highlighted-message-id="highlightedMessageId"
            :jump-in-flight="jumpInFlight"
            :has-newer-messages="hasNewerMessages"
            :on-return-to-latest="windowMode === 'jumped' ? returnToLatest : undefined"
            density="compact"
            :reverse-messages="false"
            :stick-to-bottom="false"
            @reply-to-message="startReply"
            @cancel-reply="cancelReply"
            @jump-to-message="jumpToMessage"
            @load-newer="loadNewer"
          >
            <template #header><header class="compact-header"><ArrowLeft /><strong>{{ selected.displayTitle }}</strong><span>Live</span></header></template>
            <!-- The slot wrapper the package puts around a custom row carries `data-message-id` and the highlight
                 class, so a custom row is a jump target without doing anything for it. -->
            <template #message="slotProps">
              <div class="compact-message" :data-editing="editingMessage?.id === slotProps.message.id ? '' : undefined" :data-replying="replyTarget?.id === slotProps.message.id ? '' : undefined">
                <strong>{{ slotProps.isCurrentUser ? 'You' : slotProps.sender?.name.split(' ')[0] }}</strong>
                <span>
                  <button v-if="slotProps.message.replyToMessageId" type="button" class="compact-message__quote" :data-unavailable="slotProps.replyPreview === 'unavailable' || undefined" :disabled="!slotProps.jumpToReplyTarget" @click="slotProps.jumpToReplyTarget?.()">{{ quoteLabel(slotProps.replyPreview) }}</button>
                  {{ slotProps.message.text }}<em v-if="slotProps.isEdited" class="compact-message__edited">Edited</em>
                </span>
                <time>{{ messageStatus(slotProps.message) }}</time>
                <span v-if="slotProps.reply || slotProps.edit || slotProps.remove" class="compact-message__actions"><button v-if="slotProps.reply" type="button" aria-label="Reply to message" @click="slotProps.reply"><Reply /></button><button v-if="slotProps.edit" type="button" aria-label="Edit message" @click="slotProps.edit"><Pencil /></button><button v-if="slotProps.remove" type="button" aria-label="Delete message" @click="slotProps.remove"><Trash2 /></button></span>
              </div>
            </template>
            <template #typing-indicator><div class="compact-typing">Jordan Lee is responding…</div></template>
            <!-- Rendered only where the package's own control is: while the view has `onReturnToLatest`. -->
            <template #jump-to-latest="slotProps">
              <button type="button" class="compact-jump" @click="slotProps.returnToLatest"><ArrowDown :size="12" /> Jump to latest</button>
            </template>
            <template #composer="slotProps">
              <div class="compact-composer" :data-editing="slotProps.editing ? '' : undefined" :data-replying="slotProps.replying ? '' : undefined">
                <p v-if="slotProps.editing" class="compact-composer__editing" role="status"><span>Editing message</span><button type="button" aria-label="Cancel editing" @click="slotProps.cancelEdit">Cancel</button></p>
                <p v-if="slotProps.replying" class="compact-composer__replying" role="status"><span>Replying to {{ senderName(slotProps.replying.senderId) }}</span><button type="button" aria-label="Cancel reply" @click="slotProps.cancelReply">Cancel</button></p>
                <div><input :value="slotProps.value" :placeholder="slotProps.editing ? 'Edit message' : 'Message'" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" :aria-label="slotProps.editing ? 'Save' : 'Send'" @click="slotProps.send"><Check v-if="slotProps.editing" /><Send v-else /></button></div>
              </div>
            </template>
          </ConversationView>
        </article>
      </section>
    </main>
  </ConvoKitThemeProvider>
</template>
