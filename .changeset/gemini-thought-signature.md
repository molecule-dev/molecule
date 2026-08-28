---
'@molecule/api-ai': minor
'@molecule/api-ai-google': minor
---

Tool-use blocks and events carry an optional provider-opaque `signature` replay token. The Google bond captures Gemini 3.x's part-level `thoughtSignature` on function calls and echoes it on replayed calls — without it, Gemini rejects the second request of any tool round-trip (400 "Function call is missing a thought_signature"). The Google bond also sends `thinking.effort` as `thinkingLevel` (previously the effort value was silently ignored and a fixed token budget was sent), and forwards the `google_search` server tool with `includeServerSideToolInvocations` when function tools ride along.
