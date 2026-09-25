import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ReadReceiptAvatars from './ReadReceiptAvatars.vue'

describe('live read receipts', () => {
  it('shows reader identities as compact avatars', () => {
    const wrapper = mount(ReadReceiptAvatars, {
      props: { readerIds: new Set(['convokit_open_alex', 'convokit_open_sam']) },
    })
    expect(wrapper.attributes('aria-label')).toBe('Read by Alex, Sam')
    expect(wrapper.findAll('.demo-read-receipt__avatar')).toHaveLength(2)
    expect(wrapper.text()).toContain('AR')
    expect(wrapper.text()).toContain('SP')
  })
})
