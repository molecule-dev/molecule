---
'@molecule/app-ide-react': patch
---

Tool cards no longer render raw tool input. A model-supplied field of the wrong type — for example an `ask_user` option sent as `{ label }` instead of a string — is coerced to its text rather than reaching JSX, and each chat timeline item renders inside its own error boundary so one unrenderable item cannot blank the chat. `ChatPanel` accepts `onRenderError` to report a caught item error to the host.
