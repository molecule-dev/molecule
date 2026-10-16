---
'@molecule/api-ai-tools': patch
---

`find_files` searches the directory a pattern names instead of walking the whole search root, and a timed-out search is reported in the tool's own words — what was searched, the limit, and a narrower `path` to try — instead of the sandbox's timeout option.
