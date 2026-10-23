---
'@molecule/api-ai-summarization-llm': patch
---

`createProvider({ aiProvider, model })` builds the same LLM summarizer over an explicitly injected `ai` provider (how molecule.dev's hosted summarization service runs it) with a default model; the module-level `provider` is unchanged.
