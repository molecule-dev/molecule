---
'@molecule/app-ui-angular': minor
---

A `data-mol-id` bound on a component's host reaches its element in the change detection that bound it, and follows a change (Modal, Tooltip, Input, Switch, Checkbox, Textarea, Table, Select); the component's own `automationId` still wins. Adds `adoptHostDataMolId` for components that render the id on an inner element.
