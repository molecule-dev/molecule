---
'@molecule/app-ui-react-native': patch
---

`Skeleton` and `Toast` create their `Animated.Value` once per mount in a lazy state initializer instead of on every render.
