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

/** jsdom implements no scroll method; the package centres the row a jump landed on with `scrollIntoView`. */
const scrollIntoView = vi.fn()
Element.prototype.scrollIntoView = scrollIntoView

// Choosing a variant rewrites `?variant=`, which the next mount would read back: start every test at the standard one.
beforeEach(() => {
  window.history.replaceState({}, '', '/')
  scrollIntoView.mockClear()
})
afterEach(() => vi.restoreAllMocks())

describe('Vue UI showcase', () => {
  it('renders each configurable component variant', async () => {
    const wrapper = mount(ShowcaseApp)
    expect(wrapper.text()).toContain('Standard components')
    expect(wrapper.text()).toContain('launch-handoff.pdf')
    // The package's default rows render the preview, time and unread badge from `summaries`.
    expect(wrapper.text()).toContain('You: Ignore the draft I deleted, this thread has the current plan.')
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
      'You: Ignore the draft I deleted, this thread has the current plan.',
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
    // `Edited` is the package's label, from `revision`, for any sender; only the viewer's own rows offer editing
    // and deletion, while every confirmed row offers the 0.9.0 reply action.
    expect(messageRow(wrapper, 'message-2').find('.ckui-message-edited').text()).toBe('Edited')
    expect(wrapper.findAll('.ckui-message-edited')).toHaveLength(1)
    expect(messageRow(wrapper, 'message-1').find('[aria-label="Edit message"]').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-1').find('[aria-label="Delete message"]').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-3').find('[aria-label="Edit message"]').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-3').find('[aria-label="Delete message"]').exists()).toBe(false)
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

  it('shows the reply strip in the branded custom composer and keeps the draft under it', async () => {
    const wrapper = mount(ShowcaseApp)
    await wrapper.findAll('.variant-tabs button')[1]!.trigger('click')
    expect(wrapper.find('.branded-composer__replying').exists()).toBe(false)
    const input = wrapper.get('.branded-composer input')
    await input.setValue('Looking now.')
    // The `#composer` slot reads `replying` / `cancelReply`; unlike edit mode the field is left alone.
    await messageRow(wrapper, 'message-3').get('[aria-label="Reply to message"]').trigger('click')
    const banner = wrapper.get('.branded-composer__replying')
    expect(banner.attributes('role')).toBe('status')
    expect(banner.text()).toContain('Replying to Jordan Lee')
    expect(banner.text()).toContain('Attaching the final handoff document.')
    expect((input.element as HTMLInputElement).value).toBe('Looking now.')
    // Entering edit mode replaces the strip with the edit banner: the view never shows both.
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    expect(wrapper.find('.branded-composer__replying').exists()).toBe(false)
    expect(wrapper.find('.branded-composer__editing').exists()).toBe(true)
    await wrapper.get('[aria-label="Cancel editing"]').trigger('click')
    // Cancelling the edit leaves the reply target dropped, and the strip's own Cancel drops a fresh one.
    expect(wrapper.find('.branded-composer__replying').exists()).toBe(false)
    await messageRow(wrapper, 'message-3').get('[aria-label="Reply to message"]').trigger('click')
    await wrapper.get('.branded-composer__replying [aria-label="Cancel reply"]').trigger('click')
    expect(wrapper.find('.branded-composer__replying').exists()).toBe(false)
    wrapper.unmount()
  })

  it('passes isEdited, edit and remove through the compact custom rows and confirms deletion with confirmDelete', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const wrapper = mount(ShowcaseApp)
    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    // The custom row renders its own `Edited` marker from `isEdited`, and actions only where `edit` / `remove` /
    // `reply` exist: another member's row carries the reply action alone.
    expect(compactLine(wrapper, 'Great. I approved')!.find('.compact-message__edited').text()).toBe('Edited')
    expect(wrapper.findAll('.compact-message__edited')).toHaveLength(1)
    expect(compactLine(wrapper, 'The final launch checklist')!.find('[aria-label="Edit message"]').exists()).toBe(false)
    expect(compactLine(wrapper, 'The final launch checklist')!.find('[aria-label="Reply to message"]').exists()).toBe(true)
    expect(compactLine(wrapper, 'Attaching the final')!.find('[aria-label="Delete message"]').exists()).toBe(false)
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

  it('quotes any member\'s row and sends the reply through the standard view\'s default rows and composer', async () => {
    const wrapper = mount(ShowcaseApp)
    // A reply renders the package's quoted block above its own text, resolved from `replyPreviewByMessageId`.
    const quoted = messageRow(wrapper, 'message-8').get('.ckui-message-quote')
    expect(quoted.attributes('data-reply-to')).toBe('message-2')
    expect(quoted.attributes('aria-label')).toBe('Quoted message from Maya Chen')
    expect(quoted.text()).toContain('Great. I approved the copy and shared the release notes.')
    // A quoted message that was deleted keeps the reference and reads the package's placeholder.
    const gone = messageRow(wrapper, 'message-10').get('.ckui-message-quote')
    expect(gone.attributes('data-reply-to')).toBe('message-deleted')
    expect(gone.classes()).toContain('ckui-message-quote--unavailable')
    expect(gone.text()).toBe('Original message unavailable')
    // Any member's row can be quoted, not only the viewer's own (unlike editing and deleting).
    await messageRow(wrapper, 'message-1').get('[aria-label="Reply to message"]').trigger('click')
    const strip = wrapper.get('.ckui-composer__replying')
    expect(strip.attributes('role')).toBe('status')
    expect(strip.text()).toContain('Replying to Alex Rivera')
    expect(strip.text()).toContain('The final launch checklist is ready for review.')
    // Quoting leaves the draft alone, unlike edit mode, and the send stamps the target on the new row.
    const field = wrapper.get('textarea')
    expect((field.element as HTMLTextAreaElement).value).toBe('')
    await field.setValue('The checklist looks complete to me.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(messageRow(wrapper, 'message-sent-1').get('.ckui-message-quote').attributes('data-reply-to')).toBe('message-1')
    expect(wrapper.find('.ckui-composer__replying').exists()).toBe(false)
    expect((field.element as HTMLTextAreaElement).value).toBe('')
    // A send appends to the live window and never re-slices it: the second one evicts no rendered row.
    await field.setValue('Handing the checklist back to you.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(messageRow(wrapper, 'message-sent-2').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-sent-1').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-1').exists()).toBe(true)
    // Cancelling drops the quote; entering edit mode drops it too (the two are mutually exclusive).
    await messageRow(wrapper, 'message-2').get('[aria-label="Reply to message"]').trigger('click')
    expect(wrapper.get('.ckui-composer__replying').text()).toContain('Replying to Maya Chen')
    await wrapper.get('[aria-label="Cancel reply"]').trigger('click')
    expect(wrapper.find('.ckui-composer__replying').exists()).toBe(false)
    await messageRow(wrapper, 'message-2').get('[aria-label="Reply to message"]').trigger('click')
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    expect(wrapper.find('.ckui-composer__replying').exists()).toBe(false)
    expect(wrapper.find('.ckui-composer__editing').exists()).toBe(true)
    wrapper.unmount()
  })

  it('keeps a reply and its reference when the quoted message is edited and then deleted', async () => {
    const wrapper = mount(ShowcaseApp)
    const quote = () => messageRow(wrapper, 'message-8').get('.ckui-message-quote')
    // An edit never changes what a reply points at, and the quote reads the message as it is now.
    await messageRow(wrapper, 'message-2').get('[aria-label="Edit message"]').trigger('click')
    await wrapper.get('textarea').setValue('Approved, and the release notes are shared.')
    await wrapper.get('form').trigger('submit')
    await flushPromises()
    expect(quote().text()).toContain('Approved, and the release notes are shared.')
    // Deleting it leaves the reply in place: the reference stays and only the quoted text is lost.
    await messageRow(wrapper, 'message-2').get('[aria-label="Delete message"]').trigger('click')
    await wrapper.get('[aria-label="Confirm delete"]').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-2').exists()).toBe(false)
    expect(messageRow(wrapper, 'message-8').exists()).toBe(true)
    expect(quote().attributes('data-reply-to')).toBe('message-2')
    expect(quote().text()).toBe('Original message unavailable')
    wrapper.unmount()
  })

  it('jumps to a quoted message outside the loaded window and back to the latest page', async () => {
    const wrapper = mount(ShowcaseApp, { attachTo: document.body })
    // The quoted message is older than the page the showcase opens with.
    expect(messageRow(wrapper, 'message-0').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Jump to latest messages"]').exists()).toBe(false)
    expect(wrapper.get('[role="log"]').attributes('aria-busy')).toBeUndefined()
    await messageRow(wrapper, 'message-9').get('.ckui-message-quote').trigger('click')
    await flushPromises()
    // The window was replaced by the rows around the target, which is centred, focused and highlighted.
    expect(messageRow(wrapper, 'message-0').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-10').exists()).toBe(false)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'instant' })
    expect(document.activeElement).toBe(messageRow(wrapper, 'message-0').element)
    expect(messageRow(wrapper, 'message-0').classes()).toContain('ckui-message-highlight')
    // The package offers the way back as soon as the view has `onReturnToLatest`.
    await wrapper.get('[aria-label="Jump to latest messages"]').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-10').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-0').exists()).toBe(false)
    expect(wrapper.find('[aria-label="Jump to latest messages"]').exists()).toBe(false)
    // A quoted row already on screen is highlighted without changing the window.
    // Wait for the first jump's short guard to expire before selecting another quote.
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(wrapper.get('[role="log"]').attributes('aria-busy')).toBeUndefined()
    scrollIntoView.mockClear()
    await messageRow(wrapper, 'message-8').get('.ckui-message-quote').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-2').classes()).toContain('ckui-message-highlight')
    expect(messageRow(wrapper, 'message-10').exists()).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('passes canReply, reply, replyPreview and jumpToReplyTarget through the compact custom rows', async () => {
    const wrapper = mount(ShowcaseApp)
    await wrapper.findAll('.variant-tabs button')[2]!.trigger('click')
    // The custom row renders the quoted parent itself, in the state the preview map gives it.
    const line = compactLine(wrapper, 'Still tracking those kickoff dates')!
    expect(line.get('.compact-message__quote').text())
      .toBe('Alex Rivera: Kickoff notes: we ship on the 4th and freeze the pricing page on the 1st.')
    expect(compactLine(wrapper, 'Ignore the draft')!.get('.compact-message__quote').text())
      .toBe('Original message unavailable')
    // `reply()` is present on every confirmed row; the custom composer reads `replying` / `cancelReply`.
    await line.get('[aria-label="Reply to message"]').trigger('click')
    expect(wrapper.get('.compact-composer__replying').text()).toContain('Replying to Jordan Lee')
    await wrapper.get('.compact-composer__replying [aria-label="Cancel reply"]').trigger('click')
    expect(wrapper.find('.compact-composer__replying').exists()).toBe(false)
    // `jumpToReplyTarget()` from a custom row, and back through the `#jump-to-latest` slot. The slot wrapper the
    // package puts around a custom row carries `data-message-id`, so the rendered window is readable from it.
    await line.get('.compact-message__quote').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-0').exists()).toBe(true)
    expect(messageRow(wrapper, 'message-0').classes()).toContain('ckui-message-highlight')
    expect(wrapper.find('.ckui-conversation-jump').exists()).toBe(false)
    await wrapper.get('.compact-jump').trigger('click')
    await flushPromises()
    expect(messageRow(wrapper, 'message-0').exists()).toBe(false)
    expect(wrapper.find('.compact-jump').exists()).toBe(false)
    wrapper.unmount()
  })
})
