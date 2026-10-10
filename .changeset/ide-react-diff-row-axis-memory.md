---
'@molecule/app-ide-react': patch
---

The edit-card line-diff bound is now enforced on the axis it documents: the two LCS rows are sized by the shorter of the two line lists, so the diff's memory stays bounded by the cell cap instead of growing with the longer side.
