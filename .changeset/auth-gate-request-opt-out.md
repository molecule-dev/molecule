---
'@molecule/app-http': patch
'@molecule/app-http-axios': patch
---

A request can opt out of the auth gate with `skipAuthGate: true`. That is what a request the gate itself depends on must set: a gate that waits for a session restore whose own request goes through the same client waits on itself, holding the very request it is waiting for, and every request it holds stalls until the gate times out. That bound is now 3 s (was 10 s, measured against a normal restore's one round trip) and a timeout with requests held is reported at error level naming `skipAuthGate`, instead of a console warning.
