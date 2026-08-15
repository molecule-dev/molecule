---
'@molecule/app-ide-react': patch
---

ask_user option recovery also handles mangled pseudo-JSON with mixed escaping (a failed parse retries with collapsed escapes, then falls back to extracting the label key), so a weak model's malformed option payloads still render as readable labels.
