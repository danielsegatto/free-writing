# V1 Verification Checklist

Use this checklist before treating the current Firebase-backed PWA as a stable v1 checkpoint.

## Automated checks

Run:

```bash
npm run test
npm run build
```

Expected result:

- Vitest passes for search, conversation service writes, sidebar drag reordering, message service writes, image-only messages, composer image selection/paste, inline edit image paste, message copy feedback, composer keyboard conversion behavior including draft English sends with pasted images, inline editing, reorder controls, desktop and touch drag-handle reorder behavior including body-scroll protection, insertion markers, gap drop zones, and edge autoscroll, selected-block merge, English conversion UI/service behavior, and the forward/move modal.
- The production build completes without TypeScript or Vite errors.

## English conversion setup

Before testing hosted real conversion, deploy the Cloudflare Worker and configure its server-side secrets:

```bash
npx wrangler secret put GROQ_API_KEY
npx wrangler secret put FIREBASE_API_KEY
npx wrangler deploy
```

For local Vite-only testing, put `GROQ_API_KEY` in ignored `.env` without the `VITE_` prefix and also ensure Firebase values, especially `VITE_FIREBASE_PROJECT_ID`, are present in `.env`. Restart the dev server, then confirm the browser calls `/api/to-english`; in Vite dev this is local middleware.

For hosted Firebase testing, set `VITE_TRANSLATION_API_URL` in ignored `.env.production.local` to the deployed Worker URL before `npm run build`, then deploy Firebase Hosting only. The current Worker URL is:

```env
VITE_TRANSLATION_API_URL=https://free-writing-translation.free-writing-danielsegatto.workers.dev
```

## Firestore rules

Deploy or test `firebase.rules` before sharing a deployed app URL.

Expected result:

- Signed-out users cannot read or write `users/{userId}` documents.
- A signed-in user can read and write only under `users/{theirUid}`.
- A signed-in user cannot read, create, update, or delete another user's conversations or messages.

Suggested manual paths:

```text
users/{uid}
users/{uid}/conversations/{conversationId}
users/{uid}/conversations/{conversationId}/messages/{messageId}
```

## Real-browser offline QA

Run against a configured Firebase project in Chrome or Safari after visiting the app once while online.

1. Sign in with Google.
2. Create two conversations.
3. Create several messages in the first conversation.
4. Confirm the conversation list shows conversation titles and last updated times without message previews.
5. Drag one conversation row by its handle, confirm the visible order changes, then reload and confirm the conversation order persists.
6. Add an image to a new block with the file picker.
7. Paste a copied image into the composer and confirm the preview appears.
8. If testing on a touch device/browser with clipboard support, use the paste-image button and confirm the preview appears; if clipboard read is unavailable, confirm it falls back to file selection.
9. Send an image-only block and confirm it remains visible after reload.
10. Click a saved image preview and confirm nothing opens.
11. Edit one message inline inside its message block; confirm the bottom composer keeps any new-message draft unchanged and the edit field expands to show the whole text without an internal scrollbar.
12. Paste a copied image while editing a block, save, and confirm the image is appended to that same block.
13. Copy one text message and confirm clipboard feedback appears.
14. Delete one message.
15. Forward one message to the second conversation.
16. Move one message to the second conversation.
17. Reorder messages with the up/down controls.
18. On desktop, use the block's drag handle to drag one text block between other blocks and confirm the visible order changes, the dragged block follows the pointer, and an insertion marker shows the exact landing space.
19. On desktop, release a dragged block over a gap, padding, or near-miss spot in the message list and confirm it still moves to the nearest insertion marker.
20. In a long conversation on desktop, drag a block handle near the top and bottom edges of the visible message list and confirm the list auto-scrolls while the drag stays active.
21. On a phone or touch emulator, scroll by swiping the body of a long text block and confirm it scrolls normally without starting a reorder.
22. On a phone or touch emulator, use the block's drag handle to drag one text block between other blocks and confirm the visible order changes, the dragged block follows the pointer, and an insertion marker shows the exact landing space.
23. In a long conversation on a touch device or emulator, drag a block handle near the top and bottom edges of the visible message list and confirm the list auto-scrolls while the drag stays active.
24. Select at least two messages, including a block with an image when possible, merge them, and confirm one unified block replaces the originals and keeps selected attachments.
25. Create or use a long conversation and confirm scrolling moves only the message list while the conversation header, merge toolbar, and bottom composer remain visible.
26. Confirm the active conversation header shows the conversation title without a message-count subtitle.
27. Convert one message to English, choose non-default options for at least one segment, confirm the picker shows only the scrollable segment option list without a separate assembled preview, and create the English block.
28. Confirm the English block appears directly below the original and remains after reload.
29. Convert another message to English and replace the source block with the selected English text.
30. Enter draft text in the composer, paste or select a small image, convert the draft to English, choose an option, and confirm `Send English` creates the selected English text as a new message with the image attached, clears the composer image preview, and does not first place the English text in the composer.
31. Search for text that exists in loaded messages.
32. Disconnect the browser from the network.
33. Reload the app.
34. Confirm the app shell opens and cached conversations/messages remain readable.
35. While offline, create, edit, paste or select a small image where supported, copy, delete, forward, move, reorder conversations, reorder messages by controls, reorder messages by drag handle where supported, and merge messages.
36. Confirm requesting a new English conversion while offline fails gracefully without creating, replacing, sending, or changing draft text.
37. Reconnect to the network.
38. Confirm all queued changes sync and remain visible after another reload.

Expected result:

- `Ctrl+Enter` on Windows/Linux and `Cmd+Enter` on macOS/iPad keyboards opens draft English conversion from the composer and saves an inline edit from the message edit field.
- Plain `Enter` inserts a newline in the composer.
- Small images can be added without Firebase Storage; if an image is too large for inline Firestore storage, the UI shows a clear error and keeps the unsent draft/edit.
- Saved image previews are inert when clicked.
- Forwarded messages are labeled `Forwarded`; moved messages are labeled `Moved`.
- Structured conversation and quote reference cards navigate to their source conversation or source text block when the source is still loaded; unavailable sources remain readable from their stored snapshot.
- Reordered conversations keep their order after reconnect and reload.
- Reordered messages keep their order after reconnect and reload, whether reordered by explicit controls or the drag handle on desktop and mobile/touch devices.
- Drag reordering continues smoothly when the intended drop target starts off-screen by auto-scrolling the message list near its top or bottom edge, and message-list gaps resolve to the nearest insertion slot instead of cancelling the drop.
- Merged messages keep the selected text in display order, and the original selected blocks remain removed after reconnect and reload.
- English conversion can keep the original message unchanged by creating a new block, or replace the original when `Replace block` is chosen.
- Draft English conversion sends the selected English result directly as a new message, preserves current composer image attachments and references, clears sent previews, and leaves the composer out of that send step.
- Long conversations keep the composer and merge action reachable without scrolling the whole page.

## Known follow-up if a step fails

- If offline reload fails, inspect service worker registration and generated PWA assets.
- If cached reads or queued writes fail, inspect Firestore persistent local cache setup in `src/firebase.ts`.
- If cross-user access succeeds, stop and fix `firebase.rules` before deployment.
- If English conversion returns 404 in Vite dev, restart the Vite dev server so local `/api/to-english` middleware is active.
- If English conversion returns 401, confirm Google sign-in succeeded, `VITE_FIREBASE_PROJECT_ID` matches the signed-in app, and the current preview/hosting domain is in Firebase Authentication authorized domains.
- If English conversion returns 500/502, confirm `GROQ_API_KEY` and `FIREBASE_API_KEY` are configured in the correct Worker runtime and inspect Worker or Vite server logs.
