---
'@molecule/api-payments-stripe': patch
---

Subscription updates now set the line item quantity explicitly, so a seat-count change applies and a switch to a flat-priced plan no longer inherits the old quantity.
