/**
 * Self-hosted translation provider for molecule.dev, built on Google's
 * MADLAD-400 model.
 *
 * Implements the `@molecule/api-ai-translation` contract against a small HTTP
 * server that runs MADLAD-400 3B (int8) in CTranslate2. CTranslate2 has no
 * Node binding, so the model runs in that server — which ships inside this
 * package (`sidecar/`: `server.py`, `requirements.txt`, `Dockerfile`) — and the
 * provider only needs its URL.
 *
 * @example
 * ```bash
 * # Start the sidecar (downloads the 2.96 GB model into the volume on first start):
 * docker build -t madlad-sidecar node_modules/@molecule/api-ai-translation-madlad/sidecar
 * docker run -d -p 8765:8765 -v madlad-model:/model madlad-sidecar
 * # …or without Docker (Python 3.10+):
 * pip install -r node_modules/@molecule/api-ai-translation-madlad/sidecar/requirements.txt
 * python node_modules/@molecule/api-ai-translation-madlad/sidecar/server.py
 * ```
 *
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { createProvider } from '@molecule/api-ai-translation-madlad'
 *
 * setProvider(createProvider({ baseUrl: 'http://madlad:8765' })) // or MADLAD_BASE_URL
 *
 * const { translations } = await requireProvider().translate({
 *   text: ['{{count}} items in your cart', 'Checkout'],
 *   targetLang: 'kk',
 *   protect: ['{{count}}'],
 * })
 * ```
 *
 * @remarks
 * - **Languages: over 400 targets**, including all of molecule's 79 UI languages
 *   (`zh-TW` maps to MADLAD's `zh_Hant`, `nb` to `no`, `es-MX`/`pt-BR` to `es`/`pt` —
 *   MADLAD has no regional variants). The source language is read from the text;
 *   `sourceLang` is only echoed back as `detectedSourceLang`.
 * - **Needs the sidecar running.** `baseUrl` (`MADLAD_BASE_URL`, default
 *   `http://127.0.0.1:8765`); if the sidecar was started with `MADLAD_API_KEY`, give the
 *   provider the same key (`apiKey` or the same env var). Keep the sidecar on a private
 *   network — without a key anyone who can reach it can translate on your CPU.
 * - **`protect` placeholders are the weak spot.** MADLAD has no markup mode and drops or
 *   rewrites placeholders more often than DeepL/Google. Each placeholder is sent as an
 *   indexed marker (`[0]`, then `<x0/>`, then `⟦0⟧` for texts that lost one); a text that
 *   still loses one is translated in pieces around its placeholders, which always keeps
 *   them but can read like English word order. **Check every result before storing it.**
 * - **Speed: CPU-bound and slow for its size.** Expect a few short strings per second
 *   on a many-core CPU (the sidecar uses every core per batch by default; see
 *   `MADLAD_INTRA_THREADS` / `MADLAD_INTER_THREADS`). For bulk jobs run the sidecar on a
 *   GPU (`MADLAD_DEVICE=cuda`, `MADLAD_COMPUTE_TYPE=int8_float16`). Requests time out
 *   after `timeoutMs` (default 10 minutes).
 * - Sentence-level model: translate UI strings or single paragraphs; split long
 *   documents first (`maxLength`, default 256 tokens, caps the output).
 * - `formality`, `glossaryId`, `context`, `modelType`, `preserveFormatting` and
 *   `tagHandling` have no MADLAD equivalent and are ignored.
 * - Licences: MADLAD-400 weights Apache-2.0 (Google); the int8 conversion used by default
 *   (`Nextcloud-AI/madlad400-3b-mt-ct2-int8`, pinned by commit and SHA-256) Apache-2.0;
 *   CTranslate2 MIT; SentencePiece Apache-2.0 — all fine for a commercial service.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './languages.js'
export * from './protect.js'
export * from './provider.js'
export * from './types.js'
