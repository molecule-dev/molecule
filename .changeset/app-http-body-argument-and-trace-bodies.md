---
'@molecule/app-http': patch
'@molecule/app-http-axios': patch
'@molecule/api-ai-tools': patch
---

`@molecule/app-http`'s docs state the call shape every body-taking verb uses — `post(url, data, config)`, `put(url, data, config)`, `patch(url, data, config)`: the body is the SECOND argument, never `{ data: body }` (which sends `{"data":…}` as the body). A failed run's trace read now quotes the body a 4xx request sent beside the status and the response, so a wrapped body is visible in one line.
