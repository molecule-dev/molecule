# @molecule/api-ai-summarization-molecule

## 1.1.0

### Minor Changes

- 0b07324: First release of the molecule.dev hosted AI summarization bond: summarize text into a paragraph, bulleted list or one-sentence TL;DR — hard word caps enforced by the service — billed to your molecule project with `MOLECULE_API_KEY`, no AI-vendor account, with the service limits mirrored locally so a bad call never leaves the process.

### Patch Changes

- a67ae21: Reject malformed summary responses and preserve typed HTTP failures for empty or non-object error bodies.
