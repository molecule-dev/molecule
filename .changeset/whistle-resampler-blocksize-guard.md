---
'@molecule/api-ai-speech-whistle': patch
---

Reject a `FloatBlockResampler` blockSize that is zero, negative or non-finite at construction. Such a block size never advances the emit loop's position, so the first `push()` would emit blocks forever — an event-loop hang with an unbounded block array. The constructor now refuses it with the same error shape it already applies to a non-positive sample rate.
