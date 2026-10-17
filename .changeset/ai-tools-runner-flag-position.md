---
'@molecule/api-ai-tools': patch
---

`streamingBackgroundCommand` writes the flags it adds at the end of the suite runner's own arguments — inside a subshell or a brace group, and before a trailing redirection — instead of at the end of the command text, where a flag written after a group's `)` was a shell syntax error.
