import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ShowcaseApp from './ShowcaseApp.vue'

/** The rendered row for a fixture room, whichever variant (default or slot rows) is showing. */
function row(wrapper: VueWrapper, title: string) {
  return wrapper.findAll('[role="listitem"]').find((item) => item.text().includes(title))!
}

/** The package's default chat row for a fixture message (it carries `data-message-id`). */
function messageRow(wrapper: VueWrapper, id: string) {
  return wrapper.find(`[data-message-id="${id}"]`)
}

/** The compact variant's custom chat row (the `#message` slot) containing `text`, if it is still rendered. */
function compactLine(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('.compact-message').find((item) => item.text().includes(text))
}

// Choosing a variant rewrites `?variant=`, which the next mount would read back: start every test at the standard one.
beforeEach(() => window.history.replaceState({}, '', '/'))
afterEach(() => vi.restoreAllMocks())

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

  it('edits and deletes the viewer\'s own rows through the standard view\'s default rows and composer', async () => {
    const wrapper = mount(ShowcaseApp)
    // `Edited` is the package's label, from `revision`, for any sender; only the viewer's own rows offer actions.
    expect(messageRow(wrapper, 'message-2').find('.ckui-message-edited').text()).toBe('Edited')
    expect(wrapper.findAll('.ckui-message-edited')).toHaveLength(1)
    expect(messageRow(wrapper, 'message-1').find('.ckui-message-actions').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-3').find('.ckui-message-actions').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-2').find('[aria-label="Edit message"]').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-4').find('[aria-label="Delete message"]').exists()).toBe(true)
    // Edit: the default composer enters edit mode with the row's text and saves instead of sending.
    await messageRow(wrapper, 'message-4').get('[aria-label="Edit message"]').trigger('click')
    const banner = wrapper.get('.ckui-composer__editing')
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('Editing message')
    expect(banner.text()).toContain('I linked this conversation to the support case.')
    const field = wrapper.get('textarea')
    expect((field.element as HTMLTextAreaElement).value).toBe('I linked this conversation to the support case.')
    expect(wrapper.find('[aria-label="Save message"]').exists()).toBe(true)
    await field.setValue('I linked this conversation to the support case and the runbook.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    // The fixture `onSaveEdit` bumped the row's revision, so the package now labels it too.
    expect(messageRow(wrapper, 'message-4').find('.ckui-message-text').text())
      .toBe('I linked this conversation to the support case and the runbook.')
    expect(messageRow(wrapper, 'message-4').find('.ckui-message-edited').exists()).toBe(true)
    expect(wrapper.find('.ckui-composer__editing').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Send message"]').exists()).toBe(true)
    expect((field.element as HTMLTextAreaElement).value).toBe('')
    // Cancel leaves the row alone.
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    await wrapper.get('[aria-label="Cancel editing"]').trigger('click')
    expect(wrapper.find('.ckui-composer__editing').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-2').find('.ckui-message-text').text())
      .toBe('Great. I approved the copy and shared the release notes.')
    // Delete: the package's inline prompt first; only "Delete" removes the row.
    await messageRow(wrapper, 'message-4').get('[aria-label="Delete message"]').trigger('click')
    const prompt = wrapper.get('[aria-label="Delete this message?"]')
    expect(prompt.attributes('role')).toBe('group')
    await prompt.get('[aria-label="Cancel delete"]').trigger('click')
    expect(messageRow(wrapper, 'message-4').exists()).toBe(true)
    await messageRow(wrapper, 'message-4').get('[aria-label="Delete message"]').trigger('click')
    await wrapper.get('[aria-label="Confirm delete"]').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-4').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Ticket CK-4821')
    wrapper.unmount()
  })

  it('leaves edit mode when the row being edited is deleted', async () => {
    const wrapper = mount(ShowcaseApp)
    // Enter edit mode on message-2, then delete that same row through the package's inline prompt.
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    expect(wrapper.get('.ckui-composer__editing').text()).toContain('Great. I approved the copy')
    await messageRow(wrapper, 'message-2').get('[aria-label="Delete message"]').trigger('click')
    await wrapper.get('[aria-label="Confirm delete"]').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-2').exists()).toBe(false)
    // The fixture `onDeleteMessage` clears `editingMessage` too, as the library's own store does: the composer is
    // back to sending, with no banner, no prefilled text and no Save action for a row that no longer exists.
    expect(wrapper.find('.ckui-composer__editing').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Save message"]').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Send message"]').exists()).toBe(true)
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toBe('')
    wrapper.unmount()
  })

  it('shows the edit banner in the branded custom composer and saves through its own button', async () => {
    const wrapper = mount(ShowcaseApp)
    await wrapper.findAll('.variant-tabs button')[1]!.trigger('click')
    expect(wrapper.find('.branded-composer__editing').exists()).toBe(false)
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    // The `#composer` slot reads `editing` / `cancelEdit`; `send` saves while editing, no branching needed.
    const banner = wrapper.get('.branded-composer__editing')
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('Great. I approved the copy and shared the release notes.')
    const input = wrapper.get('.branded-composer input')
    expect((input.element as HTMLInputElement).value).toBe('Great. I approved the copy and shared the release notes.')
    expect(wrapper.get('.branded-composer > div button:last-child').text()).toBe('Save')
    await banner.get('[aria-label="Cancel editing"]').trigger('click')
    expect(wrapper.find('.branded-composer__editing').exists()).toBe(false)
    expect(wrapper.get('.branded-composer > div button:last-child').text()).toBe('Send')
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    await wrapper.get('.branded-composer input').setValue('Approved. Release notes attached.')
    await wrapper.get('.branded-composer > div button:last-child').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-2').find('.ckui-message-text').text()).toBe('Approved. Release notes attached.')
    expect(messageRow(wrapper, 'message-2').find('.ckui-message-edited').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-2').find('.ckui-media-card--image').exists()).toBe(true) // attachments stay
    expect(wrapper.find('.branded-composer__editing').exists()).toBe(false)
    wrapper.unmount()
  })

  it('passes isEdited, edit and remove through the compact custom rows and confirms deletion with confirmDelete', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(ShowcaseApp)
    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    // The custom row renders its own `Edited` marker from `isEdited`, and actions only where `edit` / `remove` exist.
    expect(compactLine(wrapper, 'Great. I approved')!.find('.compact-message__edited').text()).toBe('Edited')
    expect(wrapper.findAll('.compact-message__edited')).toHaveLength(1)
    expect(compactLine(wrapper, 'The final launch checklist')!.find('.compact-message__actions').exists()).toBe(false)
    expect(compactLine(wrapper, 'Attaching the final')!.find('.compact-message__actions').exists()).toBe(false)
    expect(compactLine(wrapper, 'I linked this conversation')!.find('[aria-label="Edit message"]').exists()).toBe(true)
    // Edit through the custom composer: banner, Save, then the row reads `Edited`.
    await compactLine(wrapper, 'I linked this conversation')!.get('[aria-label="Edit message"]').trigger('click')
    expect(wrapper.get('.compact-composer__editing').text()).toContain('Editing message')
    const input = wrapper.get('.compact-composer input')
    expect((input.element as HTMLInputElement).value).toBe('I linked this conversation to the support case.')
    expect(wrapper.find('.compact-composer [aria-label="Send"]').exists()).toBe(false)
    await input.setValue('I linked this conversation to the support case (updated).')
    await wrapper.get('.compact-composer [aria-label="Save"]').trigger('click')
    await flushPromises()
    expect(compactLine(wrapper, 'I linked this conversation')!.text()).toContain('(updated).')
    expect(compactLine(wrapper, 'I linked this conversation')!.find('.compact-message__edited').exists()).toBe(true)
    expect(wrapper.find('.compact-composer__editing').exists()).toBe(false)
    expect(wrapper.find('.compact-composer [aria-label="Send"]').exists()).toBe(true)
    // `remove()` asks the view's `confirmDelete` first (no inline prompt): a refusal keeps the row.
    await compactLine(wrapper, 'I linked this conversation')!.get('[aria-label="Delete message"]').trigger('click')
    await flushPromises()
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(compactLine(wrapper, 'I linked this conversation')).toBeDefined()
    confirm.mockReturnValue(true)
    await compactLine(wrapper, 'I linked this conversation')!.get('[aria-label="Delete message"]').trigger('click')
    await flushPromises()
    expect(compactLine(wrapper, 'I linked this conversation')).toBeUndefined()
    wrapper.unmount()
  })
})
