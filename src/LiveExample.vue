<script setup lang="ts">
import { ConvoKitClient } from '@convokitapp/sdk'
import { Conversation, ConversationList, createConvoKitUiClient, type ConvoKitUiClient } from '@convokitapp/vue-ui'
import { markRaw, onBeforeUnmount, ref, shallowRef } from 'vue'

const backendUrl = import.meta.env.VITE_CONVOKIT_BACKEND_URL as string | undefined
const clientId = import.meta.env.VITE_CONVOKIT_CLIENT_ID as string | undefined
const tokenEndpoint = import.meta.env.VITE_CONVOKIT_TOKEN_ENDPOINT as string | undefined
const userId = ref('demo-user')
const roomIdDraft = ref('')
const roomId = ref('')
const uiClient = shallowRef<ConvoKitUiClient | null>(null)
const error = ref<string | null>(null)

const sdk = clientId && tokenEndpoint ? markRaw(new ConvoKitClient({
  ...(backendUrl ? { backendUrl } : {}),
  clientId,
  tokenProvider: async (appUserId) => {
    const response = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appUserId }),
    })
    if (!response.ok) throw new Error('Could not issue the user token')
    const body = await response.json() as { token: string }
    return body.token
  },
})) : null

onBeforeUnmount(() => { void sdk?.disconnectUser() })

async function connect() {
  if (!sdk) return
  error.value = null
  try {
    await sdk.connectUser(userId.value)
    uiClient.value = markRaw(createConvoKitUiClient(sdk))
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

function openRoom() {
  const nextRoomId = roomIdDraft.value.trim()
  if (nextRoomId) roomId.value = nextRoomId
}
</script>

<template>
  <main v-if="!sdk" class="live-setup"><h1>Live ConvoKit example</h1><p>Set <code>VITE_CONVOKIT_CLIENT_ID</code> and <code>VITE_CONVOKIT_TOKEN_ENDPOINT</code> to enable this page.</p></main>
  <main v-else-if="!uiClient" class="live-setup"><h1>Live ConvoKit example</h1><label>App user ID<input v-model="userId"></label><button type="button" @click="connect">Connect</button><p v-if="error" role="alert">{{ error }}</p></main>
  <main v-else class="live-layout">
    <aside><ConversationList :client="uiClient" :selected-conversation-id="roomId" @conversation-select="roomId = $event.id" /></aside>
    <section>
      <Conversation v-if="roomId" :client="uiClient" :conversation-id="roomId" @back="roomId = ''" />
      <form v-else class="live-room" @submit.prevent="openRoom">
        <label>Open a room ID<input v-model="roomIdDraft"></label>
        <p>Your backend must grant this user room membership before the UI can load it.</p>
        <button type="submit" :disabled="!roomIdDraft.trim()">Open room</button>
      </form>
    </section>
  </main>
</template>
