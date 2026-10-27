---
'@molecule/app-storage': minor
'@molecule/app-storage-localstorage': minor
---

Reads that lose to a newer write, remove, external change or provider swap are now discarded, and `refresh()` keeps the render-time snapshot coherent after a direct provider write. The localStorage bond accepts per-key codecs, so values an earlier raw-string helper persisted stay readable.
