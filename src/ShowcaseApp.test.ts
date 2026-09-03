import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ShowcaseApp from './ShowcaseApp.vue'

describe('Vue UI showcase', () => {
  it('renders each configurable component variant', async () => {
    const wrapper = mount(ShowcaseApp)
    expect(wrapper.text()).toContain('Standard components')
    expect(wrapper.text()).toContain('launch-handoff.pdf')

    await wrapper.findAll('.variant-tabs button')[1]!.trigger('click')
    expect(wrapper.text()).toContain('Branded customer support')
    expect(wrapper.text()).toContain('Priority support')
    expect(wrapper.text()).toContain('Ticket CK-4821')

    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    expect(wrapper.text()).toContain('Compact operations view')
    expect(wrapper.text()).toContain('Jordan Lee is responding')
  })
})
