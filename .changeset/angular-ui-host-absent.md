---
'@molecule/app-ui-angular': minor
---

Add createDomContext, a context found through the rendered tree that each provider creates for itself (provideDomContext, removeDomContext, findDomContext and findDomContextIncludingSelf are deprecated); Switch, Toast, Tooltip, PanelCloseProvider and ResponsiveAppShell render with no host element, UserMenuPopover's host is its card, FormField places its field with no wrapper, and what a caller binds on the tag of Modal, Switch, Tooltip, LanguagePicker, ConfirmDialog and PromptDialog lands on the element React spreads it onto and follows later changes (Modal's and Tooltip's onDoubleClick input is deprecated: bind (dblclick) on the tag).
