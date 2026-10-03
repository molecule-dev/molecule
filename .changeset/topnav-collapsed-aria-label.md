---
'@molecule/app-top-nav-layout-react': patch
---

Give every nav link an `aria-label`: below the `md` breakpoint the visible label hides and the link collapses to an icon-only target whose icon is `aria-hidden`, so screen readers previously announced an unnamed link.
