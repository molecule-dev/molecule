---
'@molecule/app-admin-table-react': patch
---

Each row's select checkbox, the select and actions column headers and the row-actions menu now have accessible names, translated through the locale bond and overridable with `rowActionsAriaLabel`. Clickable rows keep their table row role, and Enter or Space on a row's checkbox or actions button works normally instead of triggering the row click.
