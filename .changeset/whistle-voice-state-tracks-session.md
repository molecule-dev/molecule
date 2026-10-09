---
'@molecule/app-ai-voice-whistle': patch
---

The voice provider's reported state now tracks the session: a pass that succeeds after a transient transcription failure returns the state to `listening` (it used to stick at `error` while dictation kept working), `dispose()` reports `idle` instead of the stale in-session state, and an engine download that fails after the user already pressed stop no longer reports a start failure for the abandoned session.
