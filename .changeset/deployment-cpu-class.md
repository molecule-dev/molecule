---
'@molecule/api-code-sandbox': minor
'@molecule/api-code-sandbox-flyio': patch
---

Allow each sandbox's resource request to select its CPU class. Fly now uses that
class for both Machine creation and volume placement instead of always using the
provider default. Omitted values preserve existing sizing.
