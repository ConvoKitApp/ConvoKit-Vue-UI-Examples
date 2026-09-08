import { flushPromises, mount } from '@vue/test-utils'
import type { ConvoKitClient } from '@convokitapp/sdk'
import * as uiLibrary from '@convokitapp/vue-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LiveExample from './LiveExample.vue'
import LiveConversation from './LiveConversation.vue'
import { DemoModel } from './demo'
import { conversations, messages } from './fixtures'

vi.mock('@convokitapp/vue-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@convokitapp/vue-ui')>()
  return { ...actual, createConvoKitUiClient: vi.fn(actual.createConvoKitUiClient) }
})

function fakeUiClient(): uiLibrary.ConvoKitUiClient {
  const subscription = () => ({ closed: false, unsubscribe: vi.fn(async () => undefined) })
  return {
    sessionIdentity: {},
    currentUserId: 'maya',
    getConversations: vi.fn(async () => conversations),
    getConversation: vi.fn(async () => conversations[0]!),
    getMessages: vi.fn(async () => []),
    getMessage: vi.fn(async () => messages[0]!),
    sendMessage: vi.fn(async (input) => ({ ...messages[1]!, ...input, id: 'uploaded-message' })),
    markConversationRead: vi.fn(async () => undefined),
    sendTyping: vi.fn(async () => undefined),
    onConnectionEvent: subscription,
    onMessage: subscription,
    onMessageDeleted: subscription,
    onReadReceipt: subscription,
    onTyping: subscription,
  }
}

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
  it('receives the published UI controller event and sends uploaded files', async () => {
    const ui = fakeUiClient()
    const uploadMessageMedia = vi.fn(async () => 'https://media.example.com/check.txt')
    const sdk = { uploadMessageMedia } as unknown as ConvoKitClient
    const wrapper = mount(LiveConversation, { props: { ui, sdk, roomId: 'product-launch' } })
    try {
      await flushPromises()
      const file = new File(['Synthetic test'], 'check.txt', { type: 'text/plain' })
      const input = wrapper.get('input[type="file"]')
      Object.defineProperty(input.element, 'files', { value: [file], configurable: true })
      await input.trigger('change')
      await flushPromises()
      expect(uploadMessageMedia).toHaveBeenCalledWith({
        conversationId: 'product-launch', fileName: 'check.txt', bytes: file, contentType: 'text/plain',
      })
      expect(ui.sendMessage).toHaveBeenCalledWith(expect.objectContaining({
        conversationId: 'product-launch',
        media: [expect.objectContaining({ type: 'file', name: 'check.txt' })],
      }))
      expect(wrapper.text()).toContain('check.txt')
    } finally {
      wrapper.unmount()
    }
  })
  it('receives the inbox controller event for wrapper search and refresh', async () => {
    const ui = fakeUiClient()
    vi.spyOn(DemoModel.prototype, 'start').mockImplementation(async function (this: DemoModel) {
      Object.assign(this.getSnapshot(), { sdk: {} as ConvoKitClient, userId: 'maya' })
      this.log('Connected test client')
    })
    vi.mocked(uiLibrary.createConvoKitUiClient).mockReturnValueOnce(ui)
    const wrapper = mount(LiveExample)
    try {
      await flushPromises()
      expect(wrapper.text()).toContain('Product launch')
      await wrapper.get('input[aria-label="Search conversations"]').setValue('Incident')
      await flushPromises()
      expect(wrapper.text()).toContain('Incident room')
      expect(wrapper.text()).not.toContain('Product launch')
      vi.mocked(ui.getConversations).mockClear()
      await wrapper.get('.demo-panel-title button').trigger('click')
      await flushPromises()
      expect(ui.getConversations).toHaveBeenCalled()
    } finally {
      wrapper.unmount()
    }
  })
})
