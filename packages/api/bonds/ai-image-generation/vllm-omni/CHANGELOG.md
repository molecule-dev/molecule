# @molecule/api-ai-image-generation-vllm-omni

## 1.1.0

### Minor Changes

- Serves MiniMax-H3-Image through the vLLM-Omni bond: requested sizes snap to its native ~16 MP grid (4096x4096 to 6272x2688), edits accept up to 16 references, and its fixed sampling rules (6 steps, no CFG, PNG output, no mask or negative prompt) are validated before any request.

## 1.0.1

### Patch Changes

- cdcdabb: Republished through trusted publishing; no code changes.

## 1.0.0

### Major Changes

- Adds @molecule/api-ai-image-generation-vllm-omni, a vLLM-Omni provider for @molecule/api-ai-image-generation that generates and edits images (Qwen-Image-2.1 by default) on a self-hosted server via fetch, with zero dependencies.
