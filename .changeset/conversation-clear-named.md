---
'@molecule/api-resource-ai-conversation': patch
---

Clearing a chat deletes the conversation named by `?conversationId=` (looked up within the project) instead of whichever conversation the project listed first; with no id and several conversations it answers 400.
