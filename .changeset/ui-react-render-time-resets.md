---
'@molecule/app-ui-react': patch
---

`Dropdown` reports `onOpenChange` only for a real change (a toggle, a selection, Escape, a route change), so a controlled menu whose owner follows it stays open after opening or mounting open; `Dropdown`, `UserMenu`, `UserMenuPopover`, `SidebarUserCard`, `ResponsiveAppShell` and `PromptDialog` reset on a route change or reopen in the render that sees it.
