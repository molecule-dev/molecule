# @molecule/api-deploy-rollout-fly

## 2.0.0

### Major Changes

- 0bc0b7c: Return per-Machine `machineVersions` instead of a shared `version` from `assertHomogeneousFlyMachines`, allowing rolling deployments to bind patches to each Machine's own instance.

## 1.1.0

### Minor Changes

- 770b742: Fly Machines provider for rolling deploys: in-place restarts with a restore path, grow-then-shrink clones, and the homogeneous Machine-list refusal.
