---
'@molecule/api-ai-tools': patch
---

The failure-trace note now leads each failing test's row with the requests the test's last action caused — API requests first, each with its response body — and excludes the page's static assets from those slots, exposed as `TraceArtifact.lastAction`.
