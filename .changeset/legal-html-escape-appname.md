---
'@molecule/app-legal-pages-react': patch
'@molecule/app-footer-react': patch
---

The `appName` interpolated into legal HTML (content page, legal modals, footer modals) is now HTML-escaped before it reaches `dangerouslySetInnerHTML`, so a markup-carrying app name renders inert instead of executing inside the legal content.
