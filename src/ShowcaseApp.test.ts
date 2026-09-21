import { mount, type VueWrapper } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ShowcaseApp from './ShowcaseApp.vue'

/** The rendered row for a fixture room, whichever variant (default or slot rows) is showing. */
function row(wrapper: VueWrapper, title: string) {
  return wrapper.findAll('[role="listitem"]').find((item) => item.text().includes(title))!
}

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
    // A room marked unread with nothing new renders the package's numberless dot, never `0 unread`.
    expect(wrapper.findAll('.ckui-unread-badge--dot')).toHaveLength(1)
    expect(row(wrapper, 'Design review').find('.ckui-unread-badge--dot').attributes('aria-label')).toBe('Unread')
    expect(row(wrapper, 'Design review').find('[data-unread]').exists()).toBe(true)
    expect(row(wrapper, 'Product launch').find('[data-unread]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="0 unread"]').exists()).toBe(false)

    await wrapper.findAll('.variant-tabs button')[1]!.trigger('click')
    expect(wrapper.text()).toContain('Branded customer support')
    expect(wrapper.text()).toContain('Priority support')
    expect(wrapper.text()).toContain('Ticket CK-4821')
    expect(wrapper.findAll('.branded-row small').map((line) => line.text())).toEqual([
      'You: I linked this conversation to the support case.',
      'The customer is waiting on the refund confirmation.',
      'Photo',
      'Paging the on-call engineer now.',
    ])
    expect(wrapper.findAll('.branded-row b').map((badge) => badge.text())).toEqual(['2', '99+'])
    expect(wrapper.findAll('.branded-row__dot')).toHaveLength(1)
    expect(row(wrapper, 'Design review').find('.branded-row__dot').attributes('aria-label')).toBe('Unread')
    expect(wrapper.findAll('.branded-row[data-unread] strong').map((title) => title.text())).toEqual([
      'Customer operations', 'Design review', 'Incident room',
    ])

    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    expect(wrapper.text()).toContain('Compact operations view')
    expect(wrapper.text()).toContain('Jordan Lee is responding')
    expect(wrapper.findAll('.compact-row b').map((badge) => badge.text())).toEqual(['2', '99+'])
    expect(wrapper.findAll('.compact-row__dot')).toHaveLength(1)
    expect(row(wrapper, 'Design review').find('.compact-row__dot').attributes('aria-label')).toBe('Unread')
    expect(wrapper.find('[aria-label="0 unread"]').exists()).toBe(false)
  })
})
