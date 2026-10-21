---
'@molecule/api-ai-tools': patch
---

Read an inline `node -e`/`python3 -c` program's own code instead of the whole command text, so importing a module whose path looks like a server no longer refuses the command as a foreground server launch.
