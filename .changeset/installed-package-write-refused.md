---
'@molecule/api-ai-tools': patch
---

The file tools refuse a write whose target is inside an installed package: `write_file`, `edit_file`, `delete_file`, `rename_file` and `create_directory` answer with the package's name and one line saying why — a `node_modules` path is not the app's code, the next install replaces it and a deploy never carries it — plus how to restore the package if a file there was already overwritten. Reading those files is unchanged. The refusal is exported as `installedPackageWriteRefusal` so a consumer's shell guard can apply the same one.
