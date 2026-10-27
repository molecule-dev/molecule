---
'@molecule/app-forms': major
'@molecule/app-react': major
'@molecule/app-react-native': major
'@molecule/app-vue': major
'@molecule/app-solid': major
'@molecule/app-svelte': major
'@molecule/app-angular': major
---

Accept an ordinary `interface` as a form's values type: every form entrypoint now constrains it to the exported `FormValuesConstraint<T>` instead of `Record<string, unknown>`, while primitives, arrays, functions and `Date` stay rejected. Generic forwarders that name `Record<string, unknown>` or `object` must copy that constraint.
