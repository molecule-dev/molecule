---
'@molecule/app-ide-react': minor
---

`ShareLinkManager` accepts a `refreshSignal` prop so a host's live-update channel can reload the link list in place, and the ChatPanel's settings re-read signal now refreshes the full agent-behavior bag (per-mode models, effort, regions, max tool loops, auto-fix, auto-approve) — so pickers and toggles reflect changes another collaborator just made instead of holding stale values.
