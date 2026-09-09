---
'@molecule/app-ui-tailwind': patch
---

`appLayout` no longer pads the top by 55px (the shell's header renders in flow, so the pad cleared a header that never overlapped) and `headerBar` carries no background or shadow by default — apps that want a chrome bar pass their own header classes.
