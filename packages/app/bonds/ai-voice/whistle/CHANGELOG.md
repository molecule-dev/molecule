# @molecule/app-ai-voice-whistle

## 1.1.0

### Minor Changes

- d24e60a: Adds `@molecule/app-ai-voice-whistle` — on-device speech-to-text in the browser via Cactus Compute's 16.9 MB Whistle WASM model (CPU-only, seven languages, no WebGPU, audio never leaves the device).

### Patch Changes

- 15ce483: A start superseded by stop-then-start while the microphone was still opening now releases the microphone it opened: the abandoned setup used to build a second capture graph under the live session's fields and leave its stream running.
- 1350e9c: Engine-file downloads that die mid-stream (and glue fetches that answer non-2xx or carry non-JavaScript bodies) now fail with the typed `WhistleEngineError` (`download-failed` / `load-failed`) instead of a raw network error, and the app voice bond's `speak()` no longer lets a replaced utterance's end event idle the replacement while it is still speaking.
- 970c701: The voice provider's reported state now tracks the session: a pass that succeeds after a transient transcription failure returns the state to `listening` (it used to stick at `error` while dictation kept working), `dispose()` reports `idle` instead of the stale in-session state, and an engine download that fails after the user already pressed stop no longer reports a start failure for the abandoned session.
