---
'@molecule/api-ai-tools': patch
---

An inline interpreter program that only touches local files (`python3 -c`, `python3 - <<EOF`, `node -e`) now gets a 20 s budget, and a cut tells the model the transform is stuck rather than telling it to run the command in the background.
