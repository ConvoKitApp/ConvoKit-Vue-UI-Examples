<script setup lang="ts">
import type { MessageMedia } from '@convokitapp/sdk'
import {
  ConversationListView,
  ConversationView,
  ConvoKitThemeProvider,
} from '@convokitapp/vue-ui'
import { ArrowLeft, Bot, CheckCheck, Circle, Headphones, Paperclip, Send, Ticket, Users } from '@lucide/vue'
import { computed, ref } from 'vue'
import { conversations, messages, readAtByUserId } from './fixtures'

type Variant = 'standard' | 'branded' | 'compact'
const variants: Array<{ id: Variant; label: string }> = [
  { id: 'standard', label: 'Standard' },
  { id: 'branded', label: 'Branded support' },
  { id: 'compact', label: 'Compact operations' },
]
const details = {
  standard: {
    number: '1', title: 'Standard components',
    description: 'Neutral, shadcn-inspired defaults for lists, messages, receipts, media and the composer.',
    props: ['onRefresh', 'onAddAttachment', 'readAtByUserId', 'reverseMessages: true'],
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
  return date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })
}

function ticketLabel(media: MessageMedia) {
  return media.type === 'contact' ? media.metadata.email : ''
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
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
          />
          <ConversationListView
            v-else-if="variant === 'branded'"
            :conversations="conversations"
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
          >
            <template #conversation-item="slotProps">
              <button type="button" class="branded-row" :data-selected="slotProps.selected || undefined" @click="slotProps.select">
                <span class="branded-row__avatar">{{ slotProps.conversation.displayTitle[0] }}</span>
                <span><strong>{{ slotProps.conversation.displayTitle }}</strong><small>{{ slotProps.index === 0 ? 'Waiting for your reply' : 'Last reply today' }}</small></span>
                <b v-if="slotProps.index === 0">2</b>
              </button>
            </template>
          </ConversationListView>
          <ConversationListView
            v-else
            :conversations="conversations"
            :selected-conversation-id="selected.id"
            :on-conversation-select="() => undefined"
            density="compact"
          >
            <template #conversation-item="slotProps">
              <button type="button" class="compact-row" @click="slotProps.select">
                <span>{{ slotProps.conversation.displayTitle[0] }}</span><strong>{{ slotProps.conversation.displayTitle }}</strong><Circle v-if="slotProps.selected" fill="currentColor" :size="7" />
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
            <template #message="slotProps"><div class="compact-message"><strong>{{ slotProps.isCurrentUser ? 'You' : slotProps.sender?.name.split(' ')[0] }}</strong><span>{{ slotProps.message.text }}</span><time>{{ formatTime(slotProps.message.createdAt) }}</time></div></template>
            <template #typing-indicator><div class="compact-typing">Jordan Lee is responding…</div></template>
            <template #composer="slotProps"><div class="compact-composer"><input :value="slotProps.value" placeholder="Message" @input="slotProps.setValue(($event.target as HTMLInputElement).value)"><button type="button" aria-label="Send" @click="slotProps.send"><Send /></button></div></template>
          </ConversationView>
        </article>
      </section>
    </main>
  </ConvoKitThemeProvider>
</template>
