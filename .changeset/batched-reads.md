---
'@molecule/api-ai-tools': minor
---

`read_file` now accepts `paths` (an array) as well as `path`, returning one entry per file with its own content or error. An agent that issues one tool call per round-trip pays a full round-trip per file; batched, a project survey costs one call per 25 files.
