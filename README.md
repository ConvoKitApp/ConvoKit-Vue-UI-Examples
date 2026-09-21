# ConvoKit Vue UI examples

Public, runnable examples showing how an application can configure
[`@convokitapp/vue-ui`](https://www.npmjs.com/package/@convokitapp/vue-ui)
without copying or modifying the private package source.

This repository contains application code only. It depends on the published
Vue UI package and the core [`@convokitapp/sdk`](https://www.npmjs.com/package/@convokitapp/sdk).

## Live open-chatroom demo

This example consumes the published 0.8.0 core and UI packages. The SDK-backed
conversation list pages the inbox in activity order and renders each room's
latest-message preview, activity time and unread badge by itself, refreshing on
room/membership changes and on new activity. A room you mark unread shows a
numberless dot (never an invented count) that only you can see; the room bar's
"Mark unread" button calls the list controller's `markUnread(conversationId)`,
and reopening the room clears the marker through the chat view's own
acknowledgement, which carries the version captured when the room opened. Your
own messages carry the package's "Edit message" and "Delete message" actions
(revealed on hover or focus with a mouse, always visible on touch); editing
turns the composer into edit mode with the message text, saves with the
`revision` you saw and shows "Edited" beside the time for every member, while a
conflicting edit from another device is reported and keeps your draft.
Deleting asks first, then removes the row for every member. The chat view
replaces pending messages when their matching live/history confirmation
arrives. No demo-side polling, preview or unread bookkeeping, text matching,
edit or revision bookkeeping, or duplicate-bubble workaround is required.

[Open the Vue demo](https://convokit-vue-demo.vercel.app). It uses the same backend, demo personas and
room IDs as the [Flutter demo](https://convokit-open-chatroom.vercel.app).
The default page is now the real SDK-backed app; no environment variables are
required to try the shared demo.

- Choose Maya, Alex, Sam or Taylor, or enter your own demo user ID.
- Create a conversation and copy its room ID, or join an existing room by ID.
- Open another framework/device with a different persona to test messages,
  typing, read receipts, images and files. Attachments are limited to 20 MB.
- Open a room and press "Mark unread" in the room bar: the list shows the dot
  at once, another device signed in as the same user picks it up from the
  activity signal, and other members never see it. Open the room again to
  clear it.
- Hover or focus one of your own messages and press "Edit message" or "Delete
  message". Edits keep the attachments (an empty caption clears it), show
  "Edited" on every device without a reload, and a stale edit (the message
  changed elsewhere first) is reported while your text stays in the composer;
  save again to apply it over the fresh copy. Deleting cannot be undone; files
  other members already received are not retracted.
- Reload restores the user and selected room. Switch user ends that SDK session.
- The inbox and chat are the published UI package's components/controllers.
  App code only supplies branding, the demo identity/room flow and upload/download hooks.

This is deliberately an **open testing environment**. Anyone who knows a room ID
can join. Do not post confidential information. No client secret is bundled into
these public apps; it stays in the existing server-side token/join broker.

## Component showcase

The offline showcase uses local fixture data. Start the app and open
\`?mode=showcase\` to use it without connecting to a backend:

```bash
npm install
npm run dev
```

Use the selector to compare configurations, or open `?variant=standard`,
`?variant=branded`, or `?variant=compact` directly.

### Standard components

![Standard ConvoKit Vue conversation list and chat components](doc/screenshots/standard-components.png)

Web-native, shadcn-inspired package defaults plus inbox previews and unread
badges from `summaries`/`currentUserId` (a count, `99+` when capped, or the
package's numberless dot for a room marked unread with nothing new), refresh,
attachment, read-position, image/file rendering, and bottom-anchored messages.
The fixture rows carry `revision` (one is edited, so the default row shows its
"Edited" label), and the controlled view receives `editingMessage`,
`onEditMessage`, `onSaveEdit`, `onCancelEdit` and `onDeleteMessage` backed by
local fixture state, so the package's row actions, inline delete prompt and
composer edit mode are all live in the showcase.

### Branded customer support

![Branded ConvoKit Vue customer support interface](doc/screenshots/branded-support.png)

A restrained product-branded support workspace built with the `conversation-item`, `header`,
`media`, `read-receipt`, and `composer` named slots. The custom rows read the
`summary` and `currentUserId` slot props for their preview line, unread count
and, from `summary.isUnread`, their own dot for a marked room without a count.
The custom composer reads the `editing` and `cancelEdit` slot props for its
"Editing message" banner and Cancel button; its Send button calls the same
`send`, which saves while a message is being edited.

### Compact operations

![Compact ConvoKit Vue operations interface](doc/screenshots/compact-operations.png)

A dense dashboard built with `density="compact"`, custom rows with unread
badges and the mark-unread dot, message lines, typing state, composer, and
`stick-to-bottom="false"`. The custom message lines read the `isEdited`, `edit`
and `remove` slot props for their own "Edited" marker and Edit/Delete buttons
(present only on the viewer's own confirmed rows), and the view's
`confirmDelete` replaces the package's inline prompt with a dialog.

The complete configuration is in [`src/ShowcaseApp.vue`](src/ShowcaseApp.vue).

## Live SDK-backed example

To use your own app instead of the shared demo, override all matching public
frontend settings (`?mode=live` remains supported):

```bash
VITE_CONVOKIT_CLIENT_ID=public-client-id
VITE_CONVOKIT_TOKEN_ENDPOINT=https://app.example.com/api/convokit-token
VITE_CONVOKIT_JOIN_ENDPOINT=https://app.example.com/api/chatrooms
```

The managed `https://api.convokit.app` endpoint is automatic. Optionally set
`VITE_CONVOKIT_BACKEND_URL` only for local testing or self-hosting.

The token endpoint runs on your backend and must authenticate the host user.
It can return `{ token }` or `{ data: { token } }`. The join endpoint receives
`POST /:roomId/join` with `{ appUserId, displayName }`; your backend must authorize
membership before the UI opens the room. Replace this open-demo policy in a real product.
Never expose the ConvoKit client secret in a Vue application or Vite variable.

## Verification

```bash
npm ci
npm run validate
```

## Vercel deployment

The checked-in `vercel.json` builds this Vite app and supports direct navigation.
The production build rejects insecure/localhost API or broker endpoints. Local
loopback overrides are accepted only by the development build.

```bash
npm ci
npm run validate
vercel link --project convokit-vue-demo --team techpools-projects
vercel deploy --prod
```

Shared live demos: [React](https://convokit-react-demo.vercel.app) ·
[Vue](https://convokit-vue-demo.vercel.app) ·
[Flutter](https://convokit-open-chatroom.vercel.app).
