---
'@molecule/app-tour-shepherd': patch
'@molecule/api-emails-inbound-ses': patch
---

Upgrades `shepherd.js` to 15.3.0 and `mailparser` to 3.9.28, the first releases of each that accept `deepmerge-ts` 8, clearing the stack-exhaustion advisory GHSA-ggr8-5vv4-36mx from both dependency chains.
