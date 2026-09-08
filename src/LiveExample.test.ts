import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LiveExample from './LiveExample.vue'
import { DemoModel } from './demo'

beforeEach(() => localStorage.clear())
afterEach(() => vi.restoreAllMocks())
describe('Vue live demo', () => {
  it('renders the branded launch flow and links all three demos', () => {
    const wrapper = mount(LiveExample)
    expect(wrapper.text()).toContain('Your workspace awaits')
    expect(wrapper.find('.demo-platforms a').attributes('href')).toBe(
      'https://convokit-react-demo.vercel.app',
    )
    expect(wrapper.text()).toContain('open testing workspace')
    wrapper.unmount()
  })
  it('connects the selected persona through demo orchestration', async () => {
    const connect = vi.spyOn(DemoModel.prototype, 'connect').mockResolvedValue()
    const wrapper = mount(LiveExample)
    await wrapper.findAll('.demo-personas button')[1]!.trigger('click')
    await wrapper.find('form').trigger('submit')
    expect(connect).toHaveBeenCalledWith('convokit_open_alex')
    wrapper.unmount()
  })
})
