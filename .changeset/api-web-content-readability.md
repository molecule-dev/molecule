---
'@molecule/api-web-content-readability': minor
---

First release of the self-hosted web content bond: Mozilla Readability + Turndown (GFM) in your own process — a bounded fetch (3 MB body cap, 30 s timeout, no JavaScript execution) plus in-process extraction from HTML, with the service limits mirrored locally. The bond has no egress guard: point `fetch` only at URLs you control.
