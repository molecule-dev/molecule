---
'@molecule/api-resource-device': minor
'@molecule/api-resource-user': patch
---

Logging out or deleting a device now refuses that session's token on the very next request, instead of after the session cache expires.
