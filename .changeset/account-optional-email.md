---
'@molecule/app-settings-panel-react': patch
---

AccountSection saves the name of accounts without an email, validates a non-empty email inline, and never sends a blank email.
