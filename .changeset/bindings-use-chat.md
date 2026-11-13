---
'@molecule/app-vue': minor
'@molecule/app-solid': minor
'@molecule/app-svelte': minor
'@molecule/app-angular': minor
---

Adds `useChat`, `useChatProvider`, `convergeHistory`, `localOnlyMessages`, `resetChatStoresForTests` and the agent identity defaults with React's behavior, backed by the shared chat session of `@molecule/app-ai-chat` (now a required peer, as is `@molecule/app-ai-models`); `useChat` accepts reactive options, and the composition root takes a `chat` provider.
