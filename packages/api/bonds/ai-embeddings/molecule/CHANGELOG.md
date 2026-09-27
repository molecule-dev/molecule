# @molecule/api-ai-embeddings-molecule

## 1.1.1

### Patch Changes

- e6e1154: The hosted-services provider now refuses a plain-http `MOLECULE_SERVICES_URL` at construction with a clear error, because the project API key rides as a Bearer token on every call — only https URLs (or http to localhost / 127.0.0.1 for a locally running services instance) are accepted.

## 1.1.0

### Minor Changes

- fee1c2d: New provider: embeddings hosted by molecule.dev and billed to your molecule project, with no vendor account.
