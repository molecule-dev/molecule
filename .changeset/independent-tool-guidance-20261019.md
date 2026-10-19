---
'@molecule/api-ai-tools': patch
---

The write_file, edit_file and read_file descriptions ask the model to send independent calls in one reply, so a build spends fewer model round trips waiting on one file at a time.
