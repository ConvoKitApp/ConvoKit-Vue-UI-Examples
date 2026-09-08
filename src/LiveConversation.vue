<script setup lang="ts">
import type { ConvoKitClient } from '@convokitapp/sdk'
import { Conversation, type ConversationController, type ConvoKitUiClient } from '@convokitapp/vue-ui'
import { onBeforeUnmount, ref } from 'vue'
import { downloadAttachment, errorMessage, uploadAttachment } from './demo'

const props = defineProps<{ sdk: ConvoKitClient; ui: ConvoKitUiClient; roomId: string }>()
const emit = defineEmits<{ back: [] }>()
const picker = ref<HTMLInputElement | null>(null)
const uploading = ref(false)
const error = ref('')
let controller: ConversationController | null = null
let alive = true
function setController(value: ConversationController) {
  controller = value
}
onBeforeUnmount(() => {
  alive = false
})
async function attach(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || uploading.value || !controller) return
  const owner = controller
  uploading.value = true
  error.value = ''
  try {
    const media = await uploadAttachment(props.sdk, props.roomId, file)
    if (!alive) return
    if (!(await owner.sendMessage({ media: [media] })))
      throw new Error('The attachment was not sent. Please try again.')
  } catch (cause) {
    if (alive) error.value = errorMessage(cause)
  } finally {
    if (alive) uploading.value = false
    input.value = ''
  }
}
</script>

<template>
  <div class="demo-conversation">
    <input ref="picker" hidden type="file" aria-label="Choose attachment" @change="attach">
    <div v-if="uploading" class="demo-upload-status" role="status">Uploading attachment…</div>
    <div v-if="error" class="demo-error" role="alert">{{ error }}</div>
    <Conversation
      :client="ui"
      :conversation-id="roomId"
      :message-page-size="30"
      :on-add-attachment="
        () => {
          if (!uploading) picker?.click()
        }
      "
      :on-attachment-click="
        (media) => {
          void downloadAttachment(sdk, media).catch((cause) => {
            if (alive) error = errorMessage(cause)
          })
        }
      "
      composer-placeholder="Message your team…"
      :format-time="(date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })"
      @controller-change="setController"
      @back="emit('back')"
    />
  </div>
</template>
