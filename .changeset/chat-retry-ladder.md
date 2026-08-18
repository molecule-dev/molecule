---
'@molecule/app-react': patch
---

useChat: the auto-retry after a 5XX / transport drop now runs up to 8 attempts (5s, 10s, 20s, then 30s holds) so an interrupted turn resumes across a server restart.
