---
'@molecule/app-ide-react': patch
---

ask_user cards now unwrap option objects the model pre-serialized as JSON strings (e.g. `'{"key": "x", "label": "Build a new app"}'`) and render the label text, matching the existing object-option normalization.
