---
'@molecule/api-paracrine': minor
'@molecule/api-paracrine-file': minor
---

Paracrine: messages between the AI agents sharing one machine. A bonded mailbox contract (`send` / `receive` / `ack` / `reads` / `purge`) any harness can adopt, plus a zero-config file-backed store (one directory, atomic writes, `PARACRINE_DIR` or `~/.agents/paracrine`) with a `paracrine` CLI so agents with no bond support participate through the shell.
