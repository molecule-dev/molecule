---
'@molecule/app-ui-react': patch
---

`ResponsiveAppShell.TopBar` suppresses itself on desktop whenever a `Sidebar` is part of the composition, even without `mobileOnly` — a non-mobileOnly bar rendered beside the sidebar in the shell's flex-row came out as a squeezed column (the artifact already-adopted apps shipped). Top-nav-only shells (no `Sidebar`) keep the always-on bar. `mobileOnly` stays the explicit form.
