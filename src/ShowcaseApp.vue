<script setup lang="ts">
import type { InboxSummary, Message, MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  isConvoKitPendingMessage,
  type ConversationItemSlotProps,
} from '@convokitapp/vue-ui'
import {
  ArrowLeft, Bot, Check, CheckCheck, Circle, Headphones, Paperclip, Pencil, Send, Ticket, Trash2, Users,
} from '@lucide/vue'
import { computed, ref, shallowRef } from 'vue'
import { conversations, currentUserId, messages, readAtByUserId, summaries } from './fixtures'

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
    props: ['summaries', 'currentUserId', 'onRefresh', 'onAddAttachment', 'readAtByUserId', 'reverseMessages: true', 'editingMessage', 'onEditMessage', 'onDeleteMessage'],
  },
  branded: {
    number: '2', title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless slots.',
    props: ['#conversation-item', '#header', '#media', '#read-receipt', '#composer: editing / cancelEdit'],
  },
  compact: {
    number: '3', title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', '#conversation-item', '#message: isEdited / edit / remove', '#typing-indicator', 'confirmDelete', 'stickToBottom: false'],
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
} : {})

/** The rows every chat view renders and the edit in progress: fixture state the controlled views are pure
 * functions of (replaced, never mutated, hence `shallowRef`). A real app keeps the same shape; the library's
 * `Conversation` wraps it in `useConversation`.
 */
const rows = shallowRef<Message[]>([...messages])
const editingMessage = shallowRef<Message | null>(null)

/** `onEditMessage`: the view enters edit mode; the composer prefills with the row's text and saves instead of sending. */
function startEditing(message: Message) {
  editingMessage.value = message
}

function cancelEditing() {
  editingMessage.value = null
}

/** `onSaveEdit`: what the backend does with `editMessage(message.id, { text, revision: message.revision })`, locally.
 * The trimmed text replaces the caption (`null` clears the caption of a message with attachments; the view never
 * saves an empty text-only message), the attachments stay and `revision` moves up by one, so the row reads `Edited`.
 */
function saveEdit(message: Message, text: string) {
  rows.value = rows.value.map((row) => row.id === message.id
    ? { ...row, text: text || null, revision: row.revision + 1, updatedAt: new Date() }
    : row)
  editingMessage.value = null
  return true
}

/** `onDeleteMessage`: the row is gone for every member; the views ask first (inline prompt or `confirmDelete`).
 * Deleting the row being edited ends the edit too (the library's store does the same), so the composer never keeps
 * a banner, prefilled text and Save for a message that no longer exists.
 */
function deleteMessage(message: Message) {
  rows.value = rows.value.filter((row) => row.id !== message.id)
  if (editingMessage.value?.id === message.id) editingMessage.value = null
  return true
}

/** `confirmDelete` for the compact view: replaces the package's inline prompt and confirms a custom row's `remove()`. */
function confirmDelete(message: Message) {
  return window.confirm(`Delete "${message.text ?? 'this message'}"?`)
}

function chooseVariant(next: Variant) {
  variant.value = next
  editingMessage.value = null
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
          <ConversationView
            v-if="variant === 'standard'"
            :conversation="selected"
            :messages="rows"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="() => true"
            :on-refresh="() => undefined"
            :on-add-attachment="() => undefined"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :format-time="formatTime"
          />
          <ConversationView
            v-else-if="variant === 'branded'"
            :conversation="selected"
            :messages="rows"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="() => true"
            :on-add-attachment="() => undefined"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :format-time="formatTime"
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
              <div class="branded-composer" :data-editing="slotProps.editing ? '' : undefined">
                <p v-if="slotProps.editing" class="branded-composer__editing" role="status"><Pencil :size="13" /><span><strong>Editing message</strong> {{ slotProps.editing.text ?? `${slotProps.editing.media.length} attachment(s)` }}</span><button type="button" aria-label="Cancel editing" @click="slotProps.cancelEdit">Cancel</button></p>
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
            :on-send-message="() => true"
            :editing-message="editingMessage"
            :on-edit-message="startEditing"
            :on-save-edit="saveEdit"
            :on-cancel-edit="cancelEditing"
            :on-delete-message="deleteMessage"
            :confirm-delete="confirmDelete"
            density="compact"
            :reverse-messages="false"
            :stick-to-bottom="false"
          >
            <template #header><header class="compact-header"><ArrowLeft /><strong>{{ selected.displayTitle }}</strong><span>Live</span></header></template>
            <template #message="slotProps">
              <div class="compact-message" :data-editing="editingMessage?.id === slotProps.message.id ? '' : undefined">
                <strong>{{ slotProps.isCurrentUser ? 'You' : slotProps.sender?.name.split(' ')[0] }}</strong>
                <span>{{ slotProps.message.text }}<em v-if="slotProps.isEdited" class="compact-message__edited">Edited</em></span>
                <time>{{ messageStatus(slotProps.message) }}</time>
                <span v-if="slotProps.edit || slotProps.remove" class="compact-message__actions"><button v-if="slotProps.edit" type="button" aria-label="Edit message" @click="slotProps.edit"><Pencil /></button><button v-if="slotProps.remove" type="button" aria-label="Delete message" @click="slotProps.remove"><Trash2 /></button></span>
              </div>
            </template>
            <template #typing-indicator><div class="compact-typing">Jordan Lee is responding…</div></template>
            <template #composer="slotProps">
              <div class="compact-composer" :data-editing="slotProps.editing ? '' : undefined">
                <p v-if="slotProps.editing" class="compact-composer__editing" role="status"><span>Editing message</span><button type="button" aria-label="Cancel editing" @click="slotProps.cancelEdit">Cancel</button></p>
                <div><input :value="slotProps.value" :placeholder="slotProps.editing ? 'Edit message' : 'Message'" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" :aria-label="slotProps.editing ? 'Save' : 'Send'" @click="slotProps.send"><Check v-if="slotProps.editing" /><Send v-else /></button></div>
              </div>
            </template>
          </ConversationView>
        </article>
      </section>
    </main>
  </ConvoKitThemeProvider>
</template>
