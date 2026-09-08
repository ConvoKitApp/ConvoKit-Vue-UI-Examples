<script setup lang="ts">
import {
  ConversationList,
  ConvoKitThemeProvider,
  createConvoKitUiClient,
  type ConversationListController,
} from '@convokitapp/vue-ui'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  LogOut,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  X,
} from '@lucide/vue'
import { markRaw, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import type { ConvoKitUiClient } from '@convokitapp/vue-ui'
import { DemoModel, demoLinks, demoTheme, displayName, personas } from './demo'
import LiveConversation from './LiveConversation.vue'
import './live.css'

const model = new DemoModel()
const state = shallowRef(model.getSnapshot())
const unsubscribe = model.subscribe(() => {
  state.value = model.getSnapshot()
})
const userId = ref(state.value.userId)
const modal = ref<'join' | 'create' | null>(null)
const roomDraft = ref('')
const copied = ref(false)
let list: ConversationListController | null = null
// The SDK is never proxied. Its session identity must remain stable for the UI.
const ui = shallowRef<ConvoKitUiClient | null>(null)
watch(
  () => state.value.sdk,
  (sdk) => {
    ui.value = sdk ? markRaw(createConvoKitUiClient(sdk)) : null
  },
  { immediate: true },
)
onMounted(() => {
  void model.start()
})
onBeforeUnmount(() => {
  unsubscribe()
  model.stop()
})
function openDialog(mode: 'join' | 'create') {
  model.clearError()
  roomDraft.value = ''
  modal.value = mode
}
function selectRoom(id: string) {
  copied.value = false
  model.selectRoom(id)
}
async function enterRoom() {
  if (modal.value && (await model.enterRoom(modal.value, roomDraft.value))) {
    copied.value = false
    modal.value = null
  }
}
async function copyRoom() {
  try {
    await navigator.clipboard.writeText(state.value.roomId)
    copied.value = true
  } catch {
    model.report(new Error('Could not copy. Select the room ID below and copy it manually.'))
  }
}
function search(event: Event) {
  void list?.setQuery((event.target as HTMLInputElement).value)
}
function refresh() {
  void list?.refresh()
  model.log('Refreshed conversations')
}
function setListController(value: ConversationListController) {
  list = value
}
</script>

<template>
  <ConvoKitThemeProvider :theme="demoTheme">
    <main class="demo-app" :class="{ 'demo-app--connected': ui }">
      <header class="demo-header">
        <a href="/" class="demo-brand"><span class="demo-mark"><MessageCircle :size="22" /></span><strong>ConvoKit</strong><span class="demo-platform">Vue</span></a>
        <nav class="demo-platforms" aria-label="Demo platforms">
          <a
            v-for="link in demoLinks"
            :key="link.name"
            :href="link.url"
            :aria-current="link.name === 'Vue' ? 'page' : undefined"
          >{{ link.name }}</a>
        </nav>
        <div v-if="ui" class="demo-account">
          <span class="status-dot" /><span>{{ displayName(state.userId) }}</span><button
            type="button"
            class="icon-button"
            title="Switch user"
            aria-label="Switch user"
            @click="model.disconnect"
          >
            <LogOut :size="18" />
          </button>
        </div>
        <a v-else class="demo-showcase-link" href="?mode=showcase">Component showcase <ArrowRight :size="14" /></a>
      </header>
      <section v-if="!ui" class="demo-launch">
        <div class="demo-launch-intro">
          <span class="demo-eyebrow">OPEN CHATROOM · LIVE DEMO</span>
          <h1>A little less setup.<br>A lot more conversation.</h1>
          <p>
            Connect, find your people, and try ConvoKit in a real chat. The same rooms work across React, Vue
            and Flutter.
          </p>
          <div class="demo-feature-tags">
            <span>Live messages</span><span>Images &amp; files</span><span>Read receipts</span>
          </div>
        </div>
        <form class="demo-login-card" @submit.prevent="model.connect(userId)">
          <span class="demo-card-icon"><MessageCircle :size="28" /></span>
          <h2>Your workspace awaits</h2>
          <p>Choose a demo persona or enter any unique app user ID.</p>
          <fieldset :disabled="state.busy">
            <legend>QUICK PERSONAS</legend>
            <div class="demo-personas">
              <button
                v-for="persona in personas"
                :key="persona.id"
                type="button"
                :aria-pressed="userId === persona.id"
                @click="userId = persona.id"
              >
                <span :style="{ color: persona.color }">{{ persona.initials }}</span>{{ persona.name }}
              </button>
            </div>
            <label class="demo-field">Demo user ID<input v-model="userId" autocomplete="off" maxlength="128"></label>
            <button class="demo-primary demo-launch-button" type="submit" :disabled="!userId.trim()">
              <ArrowRight :size="20" />{{ state.busy ? 'Connecting…' : 'Launch workspace' }}
            </button>
          </fieldset>
          <p v-if="state.error" class="demo-error" role="alert">{{ state.error }}</p>
          <p class="demo-disclaimer">
            This is an open testing workspace. Anyone with a room ID can join. Please don’t share private
            information.
          </p>
        </form>
        <footer class="demo-launch-footer">
          Built with the published <code>@convokitapp/vue-ui</code> package.
          <a href="https://github.com/ConvoKitApp/ConvoKit-Vue-UI-Examples">View example source ↗</a>
        </footer>
      </section>
      <template v-else>
        <div class="demo-workspace-toolbar">
          <div>
            <span class="demo-eyebrow">TEAM WORKSPACE</span>
            <h1>Your conversations</h1>
          </div>
          <div class="demo-actions">
            <button type="button" class="demo-secondary" @click="openDialog('join')">Join with room ID</button><button type="button" class="demo-primary" @click="openDialog('create')">
              <Plus :size="16" />New conversation
            </button>
          </div>
        </div>
        <div v-if="state.error && !modal" class="demo-workspace-error demo-error" role="alert">
          {{ state.error
          }}<button type="button" class="icon-button" aria-label="Dismiss error" @click="model.clearError">
            <X :size="16" />
          </button>
        </div>
        <div class="demo-workspace" :data-room-open="Boolean(state.roomId)">
          <aside class="demo-sidebar">
            <div class="demo-panel-title">
              <h2>Conversations</h2>
              <button class="icon-button" type="button" aria-label="Refresh conversations" @click="refresh">
                <RefreshCw :size="16" />
              </button>
            </div>
            <label class="demo-search"><Search :size="16" /><input
              aria-label="Search conversations"
              placeholder="Search conversations"
              @input="search"
            ></label>
            <ConversationList
              :key="state.listRevision"
              :client="ui"
              :page-size="20"
              :selected-conversation-id="state.roomId"
              @controller-change="setListController"
              @conversation-select="selectRoom($event.id)"
            />
            <div class="demo-sidebar-footer">
              <span class="status-dot" />{{ state.status }}<span>UI SDK 0.3.0</span>
            </div>
          </aside>
          <section class="demo-chat-panel" aria-label="Chat workspace">
            <template v-if="state.roomId && state.sdk">
              <div class="demo-room-bar">
                <button
                  class="icon-button"
                  type="button"
                  aria-label="Back to conversations"
                  @click="selectRoom('')"
                >
                  <ArrowLeft :size="18" />
                </button><code :title="state.roomId">{{ state.roomId }}</code><button class="icon-button" type="button" aria-label="Copy room ID" @click="copyRoom">
                  <Check v-if="copied" :size="16" /><Copy v-else :size="16" />
                </button>
              </div>
              <LiveConversation
                :key="state.roomId + state.userId"
                :sdk="state.sdk"
                :ui="ui"
                :room-id="state.roomId"
                @back="selectRoom('')"
              />
            </template>
            <div v-else class="demo-empty">
              <span class="demo-empty-icon"><MessageCircle :size="36" /></span>
              <h2>A good conversation starts here</h2>
              <p>Pick a conversation, create a new one, or join a friend using their room ID.</p>
              <button class="demo-primary" type="button" @click="openDialog('join')">
                Join a chatroom <ArrowRight :size="16" />
              </button>
            </div>
          </section>
          <aside class="demo-inspector">
            <span class="demo-eyebrow">UNDER THE HOOD</span>
            <h2>SDK activity</h2>
            <p>The ConvoKit surface behind each interaction.</p>
            <ol>
              <li v-for="(item, index) in state.activity" :key="index">
                <span class="status-dot" />{{ item }}
              </li>
            </ol>
            <div class="demo-health">
              <h3>Integration health</h3>
              <dl>
                <dt>Authentication</dt>
                <dd>Scoped token</dd>
                <dt>Realtime</dt>
                <dd>{{ state.status }}</dd>
                <dt>Presence</dt>
                <dd>{{ state.online.length }} observed online</dd>
              </dl>
            </div>
            <a href="?mode=showcase">Explore component props ↗</a>
          </aside>
        </div>
      </template>
      <div v-if="modal" class="demo-modal-backdrop" @keydown.esc="!state.busy && (modal = null)">
        <section class="demo-modal" role="dialog" aria-modal="true" aria-labelledby="room-dialog-title">
          <button
            class="icon-button demo-modal-close"
            type="button"
            aria-label="Close dialog"
            :disabled="state.busy"
            @click="modal = null"
          >
            <X :size="20" />
          </button><span class="demo-card-icon"><MessageCircle :size="26" /></span>
          <h2 id="room-dialog-title">{{ modal === 'join' ? 'Join a chatroom' : 'Start a conversation' }}</h2>
          <p>
            {{
              modal === 'join'
                ? 'Paste a room ID from any of the three demo apps. We’ll grant your demo user membership.'
                : 'Create a room, then share its ID with another persona or device.'
            }}
          </p>
          <form @submit.prevent="enterRoom">
            <label class="demo-field">{{ modal === 'join' ? 'Chatroom ID' : 'Conversation name'
            }}<input v-model="roomDraft" autofocus :disabled="state.busy" maxlength="256"></label>
            <p v-if="state.error" class="demo-error" role="alert">{{ state.error }}</p>
            <button
              class="demo-primary demo-launch-button"
              :disabled="state.busy || !roomDraft.trim()"
              type="submit"
            >
              {{ state.busy ? 'Please wait…' : modal === 'join' ? 'Join chatroom' : 'Create conversation'
              }}<ArrowRight :size="18" />
            </button>
          </form>
        </section>
      </div>
    </main>
  </ConvoKitThemeProvider>
</template>
