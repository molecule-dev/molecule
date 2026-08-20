---
'@molecule/app-ide-react': minor
'@molecule/app-locales-ide': patch
---

Share modal now reflects a project's current public link: when one exists it shows the full, absolute URL with click-to-copy and a Revoke control and no longer offers to create another; when none exists it offers create. Adds a reusable `ShareLinkManager` component (export) so a host can render the same UI in its own team/access panel.
