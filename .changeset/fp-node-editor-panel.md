---
'@molecule/app-node-editor-panel-react': patch
---

Sections take a new `htmlFor` prop so a single control beside a label gets a name; the slider uses it for its range input, which also reports a text value display to assistive technology. The toggle switch is named by its title and described by its subtitle.
