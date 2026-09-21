import { flushPromises, mount } from '@vue/test-utils'
import type { ConvoKitClient, EditMessageInput, Message } from '@convokitapp/sdk'
import * as uiLibrary from '@convokitapp/vue-ui'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import LiveExample from './LiveExample.vue'
import LiveConversation from './LiveConversation.vue'
import { DemoModel } from './demo'
import { conversations, messages, summaries } from './fixtures'

vi.mock('@convokitapp/vue-ui', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@convokitapp/vue-ui')>()
  return { ...actual, createConvoKitUiClient: vi.fn(actual.createConvoKitUiClient) }
})

/** A legacy-shaped adapter (the list falls back to `getConversations`). `inbox: true` adds the optional 0.6/0.7
 * members, so the list pages the fixture summaries and can mark a room unread through the published controller;
 * `edits: true` adds the optional 0.8 members, so the room's default rows offer the viewer's own messages for editing
 * and deletion. The edit fake answers like the backend: the new text and the revision moved up by one.
 */
function fakeUiClient(options: { inbox?: boolean; edits?: boolean } = {}): uiLibrary.ConvoKitUiClient {
  const subscription = () => ({ closed: false, unsubscribe: vi.fn(async () => undefined) })
  return {
    ...(options.edits ? {
      editMessage: vi.fn(async (messageId: string, input: EditMessageInput) => ({
        ...messages.find((message) => message.id === messageId)!,
        text: input.text, revision: input.revision + 1, updatedAt: new Date('2026-08-26T12:01:00Z'),
      })),
      deleteMessage: vi.fn(async () => undefined),
    } : {}),
    ...(options.inbox ? {
      listInbox: vi.fn(async () => ({
        entries: conversations.map((conversation) => ({ conversation, ...summaries.get(conversation.id)! })),
        nextCursor: null,
      })),
      onInboxActivity: subscription,
      markConversationUnread: vi.fn(async (conversationId: string) => ({
        conversationId, unreadMarkedAt: new Date('2026-08-26T12:00:00Z'), privateStateVersion: 1,
      })),
      clearConversationUnread: vi.fn(async (conversationId: string) => ({
        conversationId, cleared: true, unreadMarkedAt: null, privateStateVersion: 2,
      })),
    } : {}),
    sessionIdentity: {},
    currentUserId: 'maya',
    getConversations: vi.fn(async () => conversations),
    getConversation: vi.fn(async () => conversations[0]!),
    getMessages: vi.fn(async (): Promise<Message[]> => []),
    getMessage: vi.fn(async () => messages[0]!),
    sendMessage: vi.fn(async (input) => ({ ...messages[1]!, ...input, id: 'uploaded-message' })),
    markConversationRead: vi.fn(async () => undefined),
    sendTyping: vi.fn(async () => undefined),
    onConnectionEvent: subscription,
    onInboxChanged: subscription,
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
  it('marks the open room unread through the published list controller and renders the package dot', async () => {
    const ui = fakeUiClient({ inbox: true })
    vi.spyOn(DemoModel.prototype, 'start').mockImplementation(async function (this: DemoModel) {
      Object.assign(this.getSnapshot(), { sdk: {} as ConvoKitClient, userId: 'maya' })
      this.log('Connected test client')
    })
    vi.mocked(uiLibrary.createConvoKitUiClient).mockReturnValueOnce(ui)
    const wrapper = mount(LiveExample)
    const productLaunch = () =>
      wrapper.findAll('[role="listitem"]').find((row) => row.text().includes('Product launch'))!
    try {
      await flushPromises()
      // The fixture inbox already carries one marked room (design review); the rest show counts or nothing.
      expect(wrapper.findAll('.ckui-unread-badge--dot')).toHaveLength(1)
      expect(productLaunch().find('.ckui-unread-badge--dot').exists()).toBe(false)
      await productLaunch().get('button').trigger('click')
      await flushPromises()
      expect(wrapper.find('[aria-label="Back to conversations"]').exists()).toBe(true)
      await wrapper.get('[aria-label="Mark unread"]').trigger('click')
      await flushPromises()
      expect(ui.markConversationUnread).toHaveBeenCalledWith('product-launch')
      // The controller patched the row's summary; the package's default row renders the numberless dot.
      expect(productLaunch().find('.ckui-unread-badge--dot').attributes('aria-label')).toBe('Unread')
      expect(productLaunch().find('[data-unread]').exists()).toBe(true)
      expect(wrapper.find('[aria-label="0 unread"]').exists()).toBe(false)
      expect(wrapper.findAll('.ckui-unread-badge--dot')).toHaveLength(2)
      // The demo leaves the room so reopening it acknowledges (and clears) with a freshly captured version.
      expect(wrapper.find('[aria-label="Back to conversations"]').exists()).toBe(false)
      expect(wrapper.text()).toContain('Marked unread · product-')
    } finally {
      wrapper.unmount()
    }
  })
  it('edits and deletes the viewer\'s own messages through the package defaults and the 0.8 adapter members', async () => {
    const ui = fakeUiClient({ edits: true })
    vi.mocked(ui.getMessages).mockResolvedValue([...messages].reverse())
    const wrapper = mount(LiveConversation, { props: { ui, sdk: {} as ConvoKitClient, roomId: 'product-launch' } })
    const rowOf = (id: string) => wrapper.find(`[data-message-id="${id}"]`)
    try {
      await flushPromises()
      // The package's default rows: `Edited` from `revision`, actions only on the viewer's own confirmed rows.
      expect(rowOf('message-2').find('.ckui-message-edited').text()).toBe('Edited')
      expect(rowOf('message-1').find('.ckui-message-actions').exists()).toBe(false)
      expect(rowOf('message-3').find('.ckui-message-actions').exists()).toBe(false)
      expect(rowOf('message-4').find('[aria-label="Edit message"]').exists()).toBe(true)
      await rowOf('message-4').get('[aria-label="Edit message"]').trigger('click')
      await flushPromises()
      // The default composer prefilled the row's text without a typing update.
      expect(wrapper.get('.ckui-composer__editing').text()).toContain('I linked this conversation to the support case.')
      expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('I linked this conversation to the support case.')
      expect(ui.sendTyping).not.toHaveBeenCalled()
      await wrapper.get('textarea').setValue('I linked this conversation to the support case and the runbook.')
      await wrapper.get('form').trigger('submit')
      await flushPromises()
      // The room controller sent the snapshot's revision; the response row replaced the message and reads `Edited`.
      expect(ui.editMessage).toHaveBeenCalledExactlyOnceWith('message-4', {
        text: 'I linked this conversation to the support case and the runbook.', revision: 0,
      })
      expect(rowOf('message-4').find('.ckui-message-text').text()).toBe('I linked this conversation to the support case and the runbook.')
      expect(rowOf('message-4').find('.ckui-message-edited').exists()).toBe(true)
      expect(wrapper.find('.ckui-composer__editing').exists()).toBe(false)
      expect(wrapper.find('[aria-label="Send message"]').exists()).toBe(true)
      // Delete: the package's inline prompt, then the adapter, then the row is gone.
      await rowOf('message-4').get('[aria-label="Delete message"]').trigger('click')
      expect(ui.deleteMessage).not.toHaveBeenCalled()
      await wrapper.get('[aria-label="Confirm delete"]').trigger('click')
      await flushPromises()
      expect(ui.deleteMessage).toHaveBeenCalledExactlyOnceWith('message-4')
      expect(rowOf('message-4').exists()).toBe(false)
      expect(wrapper.find('.demo-error').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })
})
