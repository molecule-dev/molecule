# @molecule/api-ai-speech-nemo-speech

## 1.0.1

### Patch Changes

- 22f9459: Importing this server-only package into a browser bundle now fails immediately with a message naming the package, instead of a confusing error from deep inside a dependency.

## 1.0.0

### Major Changes

- Adds @molecule/api-ai-speech-nemo-speech, an NVIDIA NeMo-Speech.cpp provider for @molecule/api-ai-speech with batch and streaming speech-to-text plus speaker diarization on a self-hosted server (fetch and WebSocket, zero dependencies).
