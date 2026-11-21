---
'@molecule/app-typing-indicator-angular': patch
'@molecule/app-typing-indicator-react': patch
'@molecule/app-typing-indicator-solid': patch
'@molecule/app-typing-indicator-svelte': patch
'@molecule/app-typing-indicator-vue': patch
---

The accessible label is looked up through the translation key `typingIndicator.aria.label` instead of a fixed English string, and an `ariaLabel` prop still overrides it.
