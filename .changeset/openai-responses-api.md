---
'@molecule/api-ai-openai': minor
---

Call OpenAI's Responses API (`/v1/responses`) on OpenAI's own endpoint, which lets reasoning models use function tools with reasoning enabled and forwards `serverTools` such as `web_search`; other base URLs keep `/v1/chat/completions`, and the new `api` option overrides the choice.
