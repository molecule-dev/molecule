---
'@molecule/app-countdown-react': patch
---

`useCountdown` reads the clock as an external store: a new target reads it afresh (also with `tickMs` 0), and the returned object keeps its identity between ticks.
