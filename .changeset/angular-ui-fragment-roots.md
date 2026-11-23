---
'@molecule/app-ui-angular': patch
---

Tooltip, Dropdown, UserMenu and SidebarUserCard render their trigger where the component stands with no host element, as React's fragment does; the Dropdown trigger follows its projected content, and the UserMenuPopover panel is a single card element present only while open; a FormField child the consumer adds again is labelled again.
