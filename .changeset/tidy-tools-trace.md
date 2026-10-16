---
'@molecule/api-ai': patch
'@molecule/api-ai-deepseek': patch
'@molecule/api-ai-alibaba': patch
'@molecule/api-ai-moonshot': patch
'@molecule/api-ai-zhipu': patch
'@molecule/api-ai-xai': patch
'@molecule/api-ai-minimax': patch
'@molecule/api-ai-openai': patch
'@molecule/api-ai-anthropic': patch
'@molecule/api-ai-google': patch
'@molecule/api-ai-local': patch
---

Each call carries a per-request id and reports the response's own id, trace id and served model back on `done`, so a reply that does not belong to the request that asked for it can be identified and traced.
