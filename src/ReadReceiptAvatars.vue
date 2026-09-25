<script setup lang="ts">
import { computed } from 'vue'
import { displayName, personas } from './demo'

const props = defineProps<{ readerIds: ReadonlySet<string> }>()
const readers = computed(() => [...props.readerIds].sort().map((id) => {
  const persona = personas.find((entry) => entry.id === id)
  const name = displayName(id)
  return {
    id,
    name,
    initials: persona?.initials ?? name.slice(0, 2).toUpperCase(),
    color: persona?.color ?? '#708778',
  }
}))
const label = computed(() => `Read by ${readers.value.map((reader) => reader.name).join(', ')}`)
</script>

<template>
  <span v-if="readers.length" class="demo-read-receipt" role="group" :aria-label="label">
    <span
      v-for="reader in readers.slice(0, 3)"
      :key="reader.id"
      class="demo-read-receipt__avatar"
      :title="reader.name"
      aria-hidden="true"
      :style="{ backgroundColor: reader.color }"
    >{{ reader.initials }}</span>
    <span v-if="readers.length > 3" class="demo-read-receipt__more">+{{ readers.length - 3 }}</span>
  </span>
  <span v-else class="demo-read-receipt demo-read-receipt--empty" aria-label="Sent" />
</template>
