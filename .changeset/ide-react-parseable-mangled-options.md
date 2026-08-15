---
'@molecule/app-ide-react': patch
---

ask_user option recovery prefers whichever JSON parse yields a recognized text key: a mangled option whose stray escapes make it parse into a label-less object now recovers its label via the collapsed-escape re-parse instead of rendering raw JSON.
