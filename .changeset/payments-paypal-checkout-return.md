---
'@molecule/api-payments-paypal': patch
---

Approval now returns the buyer to the app's `/plan-updated` page instead of the API's verify endpoint, whose host holds no session cookie (the redirect answered 401 and the plan was never granted).
