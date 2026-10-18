---
'@molecule/api-server-default-express': patch
---

The API server now keeps an idle keep-alive connection longer than a proxy's connection pool does, so a request is never reused onto a socket the server is closing.
