<script setup lang="ts">
import type { InboxSummary, MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
  isConvoKitPendingMessage,
  type ConversationItemSlotProps,
} from '@convokitapp/vue-ui'
import { ArrowLeft, Bot, CheckCheck, Circle, Headphones, Paperclip, Send, Ticket, Users } from '@lucide/vue'
import { computed, ref } from 'vue'
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
    props: ['summaries', 'currentUserId', 'onRefresh', 'onAddAttachment', 'readAtByUserId', 'reverseMessages: true'],
  },
  branded: {
    number: '2', title: 'Branded customer support',
    description: 'A product-branded support workspace built from the same headless slots.',
    props: ['#conversation-item', '#header', '#media', '#read-receipt', '#composer'],
  },
  compact: {
    number: '3', title: 'Compact operations view',
    description: 'A restrained data-dense treatment for web dashboards with limited space.',
    props: ['density: compact', '#conversation-item', '#message', '#typing-indicator', 'stickToBottom: false'],
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

function chooseVariant(next: Variant) {
  variant.value = next
  const url = new URL(window.location.href)
  url.searchParams.set('variant', next)
  window.history.replaceState({}, '', url)
}

function formatTime(date: Date) {
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function messageStatus(message: (typeof messages)[number]) {
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
            :messages="messages"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="() => true"
            :on-refresh="() => undefined"
            :on-add-attachment="() => undefined"
            :format-time="formatTime"
          />
          <ConversationView
            v-else-if="variant === 'branded'"
            :conversation="selected"
            :messages="messages"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="() => true"
            :on-add-attachment="() => undefined"
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
              <div class="branded-composer"><button type="button" aria-label="Attach" @click="slotProps.addAttachment"><Paperclip /></button><input :value="slotProps.value" placeholder="Reply to customer…" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" @click="slotProps.send">Send</button></div>
            </template>
          </ConversationView>
          <ConversationView
            v-else
            :conversation="selected"
            :messages="messages"
            current-user-id="maya"
            :read-at-by-user-id="readAtByUserId"
            :typing-user-ids="typing"
            :on-send-message="() => true"
            density="compact"
            :reverse-messages="false"
            :stick-to-bottom="false"
          >
            <template #header><header class="compact-header"><ArrowLeft /><strong>{{ selected.displayTitle }}</strong><span>Live</span></header></template>
            <template #message="slotProps"><div class="compact-message"><strong>{{ slotProps.isCurrentUser ? 'You' : slotProps.sender?.name.split(' ')[0] }}</strong><span>{{ slotProps.message.text }}</span><time>{{ messageStatus(slotProps.message) }}</time></div></template>
            <template #typing-indicator><div class="compact-typing">Jordan Lee is responding…</div></template>
            <template #composer="slotProps"><div class="compact-composer"><input :value="slotProps.value" placeholder="Message" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" aria-label="Send" @click="slotProps.send"><Send /></button></div></template>
          </ConversationView>
        </article>
      </section>
    </main>
  </ConvoKitThemeProvider>
</template>
