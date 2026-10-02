# @molecule/api-ai-image-generation-molecule

## 1.1.1

### Patch Changes

- The services URL now accepts plain http to private-network hosts (RFC 1918 and *.docker.internal, e.g. an in-sandbox app reaching its platform's gateway) — public cleartext is still refused.

## 1.1.0

### Minor Changes

- New bond: `@molecule/api-ai-image-generation-molecule` generates images through molecule.dev's hosted image-generation service and bills each image to your molecule project — no image-vendor account. It is an ordinary provider on the `@molecule/api-ai-image-generation` core, swappable with the OpenAI and Stability bonds without code changes. Every image passes molecule.dev's moderation classifier before it returns; `quality` is explicit (`low`/`medium`/`high`) so each served call has a deterministic per-image price.
