---
'@molecule/app-ui-angular': patch
---

Modal, Dropdown, PromptDialog and ResponsiveAppShell move focus after Angular renders, the open drawer returns focus when it is destroyed, `Grid` no longer erases the caller's style properties, Table moves `id`, `title` and other rest attributes onto its `<table>`, and Alert, EmptyState, PageHeader, Toast and OptimisticToggleButton leave no `title` or `value` attribute on their host.
