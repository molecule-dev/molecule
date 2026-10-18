---
'@molecule/api-ai-tools': patch
---

`list_files` answers a package catalog, or any listing larger than one tool result, with its entry count and the first names plus a pointer to `find_package`/`read_molecule_doc`, instead of thousands of names.
