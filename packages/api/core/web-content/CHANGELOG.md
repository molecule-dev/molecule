# @molecule/api-web-content

## 1.1.0

### Minor Changes

- beff5dc: First release of the web content core: the `WebContentProvider` interface — `fetch({url})` reads a page and `extract({html})` reads HTML you already have, returning the article as clean markdown or plain text plus title, description and optional links — with a JavaScript-off raw mode, a browser mode for script-rendered pages, and a 500,000-character content cap.
