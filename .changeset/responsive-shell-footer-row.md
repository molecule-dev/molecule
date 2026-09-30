---
'@molecule/app-ui-react': patch
---

ResponsiveAppShell.Sidebar footer now renders as a horizontal `justify-between` row (UserMenu left, ThemeToggle right) instead of stacking them vertically. Apps that pass `<UserMenu />` and `<ThemeToggle />` into the footer slot get a properly spaced bottom bar without a wrapper div.
