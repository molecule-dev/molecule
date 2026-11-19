---
'@molecule/api-ai-image-generation-vllm-omni': minor
---

Serves MiniMax-H3-Image through the vLLM-Omni bond: requested sizes snap to its native ~16 MP grid (4096x4096 to 6272x2688), edits accept up to 16 references, and its fixed sampling rules (6 steps, no CFG, PNG output, no mask or negative prompt) are validated before any request.
