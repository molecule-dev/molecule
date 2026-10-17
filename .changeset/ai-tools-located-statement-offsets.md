---
'@molecule/api-ai-tools': patch
---

Adds `locatedCommandSegments`, which reports each shell statement's offset and its own leading `NAME=value` words, so an environment assignment can be placed in the statement that runs a command.
