---
'@molecule/app-ide-svelte': patch
---

Bug reports, sharing, quick pickers, the keyboard shortcuts reference and the chat panel overlay open as kit modals: Escape closes only the top one, focus stays inside and returns to the opener, and the page behind stops scrolling. Requires `@molecule/app-ai-models` 1.2.0, `@molecule/app-i18n` 1.2.0 and `@molecule/app-ui` 1.10.0 or later.
