---
'@molecule/app-contact-display-angular': minor
'@molecule/app-contact-display-react': patch
'@molecule/app-contact-display-solid': patch
'@molecule/app-contact-display-svelte': patch
'@molecule/app-contact-display-vue': patch
---

With `onClick` set, a transparent native button covers the whole row, named by the contact name, so a click, Enter or Space activates the contact. The mail and phone links and the `actions` slot sit above that button and keep their own clicks; in the Angular port the handler now takes no click event.
