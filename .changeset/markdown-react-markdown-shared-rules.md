---
'@molecule/app-markdown-react-markdown': major
---

`sanitize: false` now renders raw HTML in the source as elements (pass it only for trusted content) and still drops `javascript:` and `vbscript:` links; the provider also renders the shared markdown DOM: unique ids and a `toc` for every rendered heading, refused links and images as their text, `tel:` links, footnotes and task lists without class names, and `elementAttributes`, and a `components` entry that is not a component throws.
