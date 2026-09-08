---
'@molecule/api-ai-tools': patch
---

`exec_command` no longer blocks `env -u KEY cmd`, `env KEY=value cmd` or `env -i cmd` as environment dumps; only a bare, piped or redirected `env` is.
