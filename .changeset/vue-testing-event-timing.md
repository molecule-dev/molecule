---
'@molecule/app-vue': minor
---

Add `@molecule/app-vue/testing/setup`, a vitest setup file that keeps a test's events from landing in the millisecond of the render before them and fails a test when a component fires an event into a listener mounted in the same task.
