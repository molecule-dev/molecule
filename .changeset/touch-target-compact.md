---
'@molecule/app-ui': minor
'@molecule/app-ui-tailwind': minor
'@molecule/app-ui-nativewind': minor
'@molecule/app-ide-react': patch
---

Add `UIClassMap.touchTargetCompact` — a 36px coarse-pointer hit-area floor for inline CTAs in dense surfaces (banner/chat-card actions) where the full 44px `touchTarget` is visually heavy; chat notice-card actions with a semantic `color` now use it.
