---
'@molecule/api-resource-project': patch
---

`PATCH /projects/:id` now persists the starting-point fields its input type advertises (`projectType`, `framework`, `packages`, `templateSlug`, `brandingSpec`). The handler silently dropped them, so a caller persisting a chosen flagship through the route scaffolded the blank starter instead — every template demo preview deployed the generic "project-app" under the template's URL.
