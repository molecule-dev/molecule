---
'@molecule/app-ui-angular': minor
---

ConfirmDialog and PromptDialog are named by their title and described by their description, the SidebarUserCard drawer is named "Account", and Tabs sets `aria-controls` only on the tab whose panel is rendered. Modal now passes updated `aria-*` and `data-*` attributes to its dialog, and `reapplyRestAttributes` takes an `includeDescribedBy` option.
