---
'@molecule/api-analytics-http': patch
'@molecule/api-code-sandbox-flyio-sprites': patch
'@molecule/api-database-d1': patch
'@molecule/api-git-provider-gitea': patch
'@molecule/api-git-provider-github': patch
'@molecule/api-git-provider-gitlab': patch
'@molecule/api-git-provider-smolforge': patch
'@molecule/api-model-hosting-modal': patch
'@molecule/api-project-archive-external-state-d1': patch
'@molecule/api-scheduler-cloudflare': patch
'@molecule/api-uploads-mirror': patch
'@molecule/api-git-provider': patch
'@molecule/api-agent-runtime-claude-code': patch
'@molecule/api-ai-speech-audio8': patch
'@molecule/api-ai-speech-confucius4': patch
'@molecule/api-ai-speech-llm': patch
'@molecule/api-ai-speech-nemo-speech': patch
---

Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.
