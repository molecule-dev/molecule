---
'@molecule/app-forum-thread-row-angular': patch
'@molecule/app-forum-thread-row-react': patch
'@molecule/app-forum-thread-row-solid': patch
'@molecule/app-forum-thread-row-svelte': patch
'@molecule/app-forum-thread-row-vue': patch
---

The pin and lock marker labels and the votes, replies and views text go through i18n, with the locale bond carrying them in every language. With a click handler the whole row becomes one native button named by the thread title, so Enter and Space activate it.
