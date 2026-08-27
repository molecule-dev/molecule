---
'@molecule/app-ai-chat': minor
'@molecule/app-react': minor
---

Add team-only chat messages: `ChatMessage` gains a `teamOnly` flag (a human-only note the model never sees, rendered with author attribution) and the chat stream gains a `{ type: 'message'; message: ChatMessage }` event that appends a complete, non-streaming message to the transcript. The React `useChat` binding handles the new event via `appendCompleteMessage`, with the same id-based dedupe as card messages so a live team note is byte-identical to what history reloads.
