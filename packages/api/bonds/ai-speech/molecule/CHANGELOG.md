# @molecule/api-ai-speech-molecule

## 1.1.2

### Patch Changes

- The services URL now accepts plain http to private-network hosts (RFC 1918 and *.docker.internal, e.g. an in-sandbox app reaching its platform's gateway) — public cleartext is still refused.

## 1.1.1

### Patch Changes

- e6e1154: The hosted-services provider now refuses a plain-http `MOLECULE_SERVICES_URL` at construction with a clear error, because the project API key rides as a Bearer token on every call — only https URLs (or http to localhost / 127.0.0.1 for a locally running services instance) are accepted.

## 1.1.0

### Minor Changes

- 42db6a6: New provider: text-to-speech and transcription hosted by molecule.dev and billed to your molecule project, with no vendor account.
