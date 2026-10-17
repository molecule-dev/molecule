---
'@molecule/api-ai-tools': patch
---

A background suite run now drops an output-only pipe (`| tail -5`, `| grep …`) that sits before a trailing statement such as `; echo done`, so its log keeps the run's failure list instead of only the tally.
