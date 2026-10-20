---
'@molecule/api-deploy-rollout-fly': major
---

Return per-Machine `machineVersions` instead of a shared `version` from `assertHomogeneousFlyMachines`, allowing rolling deployments to bind patches to each Machine's own instance.
