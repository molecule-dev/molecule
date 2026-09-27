---
'@molecule/api-ai-embeddings-molecule': patch
'@molecule/api-ai-speech-molecule': patch
'@molecule/api-ai-translation-molecule': patch
'@molecule/api-content-moderation-molecule': patch
'@molecule/api-ocr-molecule': patch
'@molecule/api-web-search-molecule': patch
---

The hosted-services provider now refuses a plain-http `MOLECULE_SERVICES_URL` at construction with a clear error, because the project API key rides as a Bearer token on every call — only https URLs (or http to localhost / 127.0.0.1 for a locally running services instance) are accepted.
