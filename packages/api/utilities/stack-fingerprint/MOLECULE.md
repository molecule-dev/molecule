# @molecule/api-stack-fingerprint

Error stack-trace fingerprinting — group similar errors by SHA-1 of normalized frames.

## Type
`utility`

## What it does

Pure functions that turn a JavaScript `Error` (or its `message` + `stack` text) into a
deterministic fingerprint hash plus a stable grouping key. Use it to dedupe noisy
production errors, build issue-tracker UIs, or implement a Sentry-style "group by
stack-trace shape" pipeline.

The fingerprint is SHA-1 hex of the top N normalized frames. Normalization strips
line numbers, column numbers, hex / hash-suffixed module paths, OS-specific tmp
directories, absolute on-disk paths, and Node's `node:` builtin module suffix —
so the same logical error path produces the same fingerprint across builds,
machines, and Node versions.

## Public API

- `fingerprintError({ message, stack, type? }, options?): string`
- `parseStackFrames(stack): StackFrame[]` (V8 + SpiderMonkey/Firefox formats)
- `normalizeFrame(frame, options?): NormalizedFrame`
- `groupErrors(errors, options?): ErrorGroup[]`

## Injection Notes

### Requirements
- None

### Post-Injection Steps
- Run `npm install` to install dependencies
- Run `npm run build` to compile

### Known Limitations
- Stack-frame parser handles V8 (`at fn (file:line:col)`) and SpiderMonkey/Firefox
  (`fn@file:line:col`). Other engines fall through to "raw frame" handling, which
  still fingerprints deterministically but loses structural awareness.
- Only the first N frames (default 5) are used; bottom-of-stack noise is
  intentionally ignored.
