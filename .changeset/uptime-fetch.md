---
'@molecule/api-uptime-fetch': minor
---

First release of the in-process uptime provider: probes a URL with Node's own http/https stack — whole-probe deadline, up to 3 re-verified redirect hops, a 1 MB body-read cap for `expectText`, and TLS-certificate inspection. Public-only dialing by default (every resolved address must be global unicast, and the probe dials the verified address, so DNS rebinding has nothing to switch to); `allowPrivateTargets` opts in for probing your own internal hosts.
