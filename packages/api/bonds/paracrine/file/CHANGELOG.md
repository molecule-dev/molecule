# @molecule/api-paracrine-file

## 1.2.0

### Minor Changes

- Use one fresh SQLite schema and import published JSON synchronously in one crash-atomic transaction before any provider operation.
- Add a backfilled per-recipient pending index for cheap unread file-mail delivery.
- Make paracrine delivery transactional and crash-safe with a bounded SQLite claim queue.

## 1.1.0

### Minor Changes

- Paracrine: messages between the AI agents sharing one machine. A bonded mailbox contract (`send` / `receive` / `ack` / `reads` / `purge`) any harness can adopt, plus a zero-config file-backed store (one directory, atomic writes, `PARACRINE_DIR` or `~/.agents/paracrine`) with a `paracrine` CLI so agents with no bond support participate through the shell.
