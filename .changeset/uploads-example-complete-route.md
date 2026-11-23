---
'@molecule/api-uploads': patch
---

The usage example is now a complete Express route: it parses the upload with busboy, waits for the write to finish, and removes a file that was rejected or over the size cap.
