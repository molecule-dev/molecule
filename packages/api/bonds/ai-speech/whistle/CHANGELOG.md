# @molecule/api-ai-speech-whistle

## 1.1.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.1.2

### Patch Changes

- 19c9ca2: Loading the speech engine with a different `needle.wasm` URL now loads that build instead of reusing an engine already loaded for another wasm URL.
- 1fbc648: The streaming resampler keeps the last buffered input sample across a flush, so audio pushed after a flush is interpolated continuously instead of starting with a sample computed against silence.
- 61a6907: An engine-file download that dies mid-transfer now releases its connection by cancelling the reader that holds the stream, so a failed download no longer leaves a connection open.
- 5a8278e: The streaming resampler no longer shifts its timeline when a chunk boundary lands just before a block's advance, so audio pushed in chunks is resampled to the same samples and the same count as the same audio pushed at once.

## 1.1.1

### Patch Changes

- 86fec8e: A failed engine or weights download now releases the error response before surfacing its typed error, instead of holding the connection until garbage collection.

## 1.1.0

### Minor Changes

- d24e60a: Adds `@molecule/api-ai-speech-whistle` — Cactus Compute's 16.9 MB seven-language speech-to-text running in-process on CPU via the needle WASM engine, with word timestamps, keyword biasing and streaming, and no server or API key.

### Patch Changes

- 15ce483: A `transcribeStream` session that is aborted while it waits for the engine's stream no longer writes its final partial block into the engine (or emits transcripts for a cancelled dictation); the session queued behind it no longer inherits that audio.
- b53912a: Reject a `FloatBlockResampler` blockSize that is zero, negative or non-finite at construction. Such a block size never advances the emit loop's position, so the first `push()` would emit blocks forever — an event-loop hang with an unbounded block array. The constructor now refuses it with the same error shape it already applies to a non-positive sample rate.
- d0ed83f: Concurrent `transcribeStream` calls are serialized: the engine keeps ONE live stream per process, so two transcriptions at once no longer interleave their audio into a single shared transcript. A session holds the engine from its first block to its stop; a concurrent call queues until it is free.
- 1350e9c: Engine-file downloads that die mid-stream (and glue fetches that answer non-2xx or carry non-JavaScript bodies) now fail with the typed `WhistleEngineError` (`download-failed` / `load-failed`) instead of a raw network error, and the app voice bond's `speak()` no longer lets a replaced utterance's end event idle the replacement while it is still speaking.
- d6b112b: The WAV decoder treats its input as hostile: RIFF chunk size fields are read as unsigned 32-bit (a header declaring `0xFFFFFFF8` no longer traps the parser in an endless scan that hung `transcribe()`), and source sample rates outside 4000–384000 Hz are rejected as `unsupported-format` instead of scaling the 16 kHz resample into a crash or an out-of-memory allocation.
- 970c701: A WAV file that names the RIFF/WAVE container but ends inside it now fails as `WhistleWavError` code `truncated` (missing chunks), as the error's documented contract promises — the old 44-byte acceptance floor classified every cut-off file as `not-wav`, leaving no input that could reach the `truncated` code. Files too short to name a container at all are still `not-wav`.
