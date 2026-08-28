---
'@molecule/api-ai-zhipu': minor
---

Send server tools in Zhipu's native nested schema (`{ type: 'web_search', web_search: {} }`) instead of the abstract `{ type, name }` marker, which the API rejects. New `supportsServerTools: false` config drops server tools for OpenAI-compatible hosts that don't serve them, so tool-carrying requests succeed there.
