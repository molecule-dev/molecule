---
'@molecule/api-ai-tools': patch
---

`read_file` refuses a binary file (images, fonts, archives) by kind and size instead of returning its bytes as replacement characters.
