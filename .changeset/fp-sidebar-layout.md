---
'@molecule/app-sidebar-layout-react': patch
---

The primary navigation region's aria-label now comes from the `sidebarLayout.aria.primaryNavigation` translation key, defaulting to the English 'Primary navigation'. Passing `navAriaLabel` still overrides it.
