---
'@molecule/api-payments-stripe': patch
---

Changing the plan of an existing subscription now charges the prorated difference immediately and fails the whole change if the charge fails, instead of deferring it to the next renewal invoice. A subscription that is past due, unpaid, incomplete or paused is no longer changed in place.
