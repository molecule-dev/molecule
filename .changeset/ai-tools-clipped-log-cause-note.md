---
'@molecule/api-ai-tools': patch
---

A failure-causes note built from a clipped log (a tail that begins `…(N earlier characters omitted)`) now says the log was clipped and that its count covers only the last part, instead of calling those failures the run's failures.
