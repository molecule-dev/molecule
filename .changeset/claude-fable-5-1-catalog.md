---
'@molecule/api-resource-ai-models': minor
---

Adds `claude-fable-5-1` (Anthropic's current latest; same $10/$50 per MTok as `claude-fable-5`, with $0.25/MTok cache reads) and marks `claude-fable-5` as legacy. `claude-sonnet-5` is now listed at its standard $2/$10 rate. Model ids with a dash-separated minor version (e.g. `claude-fable-5-1`) now parse as a newer generation of their family instead of a sibling.
