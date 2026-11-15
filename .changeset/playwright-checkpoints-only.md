---
'@molecule/api-ai-tools': major
---

`createPlaywrightFeedback` no longer re-runs tests in the background after a write: `check()` is the only place it runs tests, and the `onFailures`, `debounceMs` and `yieldRetryMs` options, the `pause()`, `settled()` and `takeFailures()` methods, the run callback's `mode` argument and the result's `unfinishedTests` field are removed.
