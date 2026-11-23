---
'@molecule/app-ui-react': patch
'@molecule/app-ui-angular': patch
'@molecule/app-ui-vue': patch
'@molecule/app-ui-svelte': patch
'@molecule/app-ui-solid': patch
---

ConfirmDialog and PromptDialog point the dialog at their heading only while the title renders something, and PromptDialog's input label follows a projected title as it changes.
