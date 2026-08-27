---
'@molecule/app-ide-react': minor
'@molecule/app-locales-ide': patch
---

ChatPanel gains a `canEdit` prop (default `true`): when `false` — a read-only project viewer — the composer blocks a plain message or write-command with a read-only note (team `/teamsay` and viewer-safe commands still pass), slash commands default-deny unless the command registry flags them `viewerSafe`, the plan/fast mode toggles disable, and a view-only note shows above the composer. `CommandDef` gains a `viewerSafe` flag. The `/model` picker now refreshes when the custom-model catalog changes (editing a BYO provider no longer leaves the old model shown), and a removed custom model re-points to the same provider before a platform fallback. Also renders teammates' human-only team notes (the `message` stream event) and matches side-channel command aliases. app-locales-ide adds the read-only-viewer strings.
