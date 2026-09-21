import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ShowcaseApp from './ShowcaseApp.vue'

describe('Vue UI showcase', () => {
  it('renders each configurable component variant', async () => {
    const wrapper = mount(ShowcaseApp)
    expect(wrapper.text()).toContain('Standard components')
    expect(wrapper.text()).toContain('launch-handoff.pdf')
    // The package's default rows render the preview, time and unread badge from `summaries`.
    expect(wrapper.text()).toContain('You: I linked this conversation to the support case.')
    expect(wrapper.text()).toContain('Alex Rivera: The customer is waiting on the refund confirmation.')
    expect(wrapper.text()).toContain('Jordan Lee: Photo')
    expect(wrapper.find('[aria-label="2 unread"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="120 unread"]').text()).toBe('99+')

    await wrapper.findAll('.variant-tabs button')[1]!.trigger('click')
    expect(wrapper.text()).toContain('Branded customer support')
    expect(wrapper.text()).toContain('Priority support')
    expect(wrapper.text()).toContain('Ticket CK-4821')
    expect(wrapper.findAll('.branded-row small').map((row) => row.text())).toEqual([
      'You: I linked this conversation to the support case.',
      'The customer is waiting on the refund confirmation.',
      'Photo',
      'Paging the on-call engineer now.',
    ])
    expect(wrapper.findAll('.branded-row b').map((badge) => badge.text())).toEqual(['2', '1', '99+'])

    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    expect(wrapper.text()).toContain('Compact operations view')
    expect(wrapper.text()).toContain('Jordan Lee is responding')
    expect(wrapper.findAll('.compact-row b').map((badge) => badge.text())).toEqual(['2', '1', '99+'])
  })
})
