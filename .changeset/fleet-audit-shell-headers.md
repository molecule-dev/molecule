---
'@molecule/app-auth-brand-header-react': patch
'@molecule/app-auth-shell-react': patch
'@molecule/app-billing-react': patch
'@molecule/app-legal-pages-react': patch
---

Fleet audit fixes: stop emitting secondary `<header>` elements from shared shells — the auth brand header and legal ContentPageShell hero now render `<div>`/`<section>` (apps with their own top bar rendered two banners), the billing PricingPage heading/tier cards no longer use `<header>`, and AuthShellCardColumn gains `min-w-0` so wide auth forms no longer push pages past the mobile viewport.
