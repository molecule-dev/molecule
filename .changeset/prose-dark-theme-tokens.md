---
'@molecule/app-ui-tailwind': patch
---

Dark theme: inline `code`, blockquote text, captions, and `kbd` hints inside `cm.prose` content now use theme tokens — they previously kept the typography plugin's light-theme ink and were nearly unreadable on dark backgrounds.
