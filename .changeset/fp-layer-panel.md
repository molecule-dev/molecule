---
'@molecule/app-layer-panel-react': patch
---

The layer panel exposes its rows as a plain list, and the active layer's name button carries `aria-current` instead of listbox selection roles, so assistive technology announces the layer stack correctly.
