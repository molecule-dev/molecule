# @molecule/api-agent-transcript-autodetect

## 1.2.2

### Patch Changes

- e5980ba: Widen the Pi peer range to `^1.0.0` — 1.2.1 pinned the optional peer to `1.0.1`, but the bond's source version is 1.0.0, so the range refused the only version that exists (and would refuse the first published one if it lands as 1.0.0).

## 1.2.1

### Patch Changes

- 843cc59: Make the Pi reader an optional dynamic import instead of a dependency: 1.2.0 shipped a hard dependency on `@molecule/api-agent-transcript-pi`, which is not yet published to the public registry, making every registry install of autodetect fail outright (E404 resolving the install graph). The Pi reader now joins `harnessReaders` only when the consuming project ships the bond itself.

## 1.2.0

### Minor Changes

- Recognizes and reads Pi session files and `pi --mode json` output.

### Patch Changes

- Updated dependencies
  - @molecule/api-agent-transcript-pi@1.0.0

## 1.1.2

### Patch Changes

- Depends on the Aider, Cline, Cursor, Gemini CLI and OpenCode readers at 1.0.1.

## 1.1.1

### Patch Changes

- Depends on the Copilot Chat and Markdown chat readers 1.0.1, which carry their compiled code.

## 1.1.0

### Minor Changes

- Also reads Gemini CLI, Cline / Roo Code, OpenCode, GitHub Copilot Chat, Cursor and Aider transcripts, and — tried last — any plain Markdown / text chat with User / Assistant markers. `harnessReaders` is the list without the generic reader.

## 1.0.1

### Patch Changes

- README leads with a complete, tested example that reads a post's transcript exports and attributes its paragraphs.
