---
'@molecule/app-ui-react': patch
---

`ResponsiveAppShell` closes its drawer on same-route navigations too — the fleet's `#top` safe-target pattern appends a hash when the current nav item is re-tapped, which changed neither pathname nor search, and the drawer previously stayed open over the page.
