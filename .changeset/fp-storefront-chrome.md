---
'@molecule/app-storefront-chrome-react': patch
---

The sign-out, avatar and account-menu labels fall back to translated defaults, so the nav reads in the visitor's language without the caller passing strings. The decorative avatar icon is hidden from screen readers so the button's label names the control.
