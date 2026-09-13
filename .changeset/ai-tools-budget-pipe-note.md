---
'@molecule/api-ai-tools': patch
---

exec_command: when a command stops at the tool budget with a `| tail`/`| head` pipe, the error explains that the pipe held the output back and says to run it without the pipe.
