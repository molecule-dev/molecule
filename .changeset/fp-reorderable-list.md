---
'@molecule/app-reorderable-list-react': patch
---

Keyboard reordering now runs from a row's move-up and move-down buttons with Alt+ArrowUp / Alt+ArrowDown, and focus moves to the other button once a move disables the one used. Each row's buttons also announce the item's position, and the list container no longer repeats its implicit list role.
