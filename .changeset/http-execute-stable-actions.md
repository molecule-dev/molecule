---
'@molecule/app-react': patch
---

Keep `useHttp`'s `execute` stable across rerenders and inline options so it can be listed in a `useEffect` dependency array without repeating its request; headers, body, signal and callbacks are read from the latest render when it runs.
