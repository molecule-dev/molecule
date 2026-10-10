# @molecule/api-ai-video-generation-ltx

## 1.1.2

### Patch Changes

- 800dd64: The upload response body is released after a successful upload, so the connection returns to the pool instead of waiting for garbage collection.

## 1.1.1

### Patch Changes

- d5760f6: `generate()` refuses a non-finite `durationSeconds` with a 400 instead of serializing it to `duration: null`, which the 2.5 tiers read as automatic duration.
- 1350e9c: A non-finite `fps` is refused with a 400 `LtxVideoError` before the submit, instead of being serialized to JSON `null`.
- 125a26c: `getStatus()` rejects job ids whose tail contains dot segments (literal or percent-encoded), empty, `?` or `#` segments, and percent-encodes each tail segment when building the poll URL. A 2xx response with a non-JSON body fails as an `LtxVideoError` instead of a raw `SyntaxError`. A completed job whose result carries no `video_url` fails with a typed error instead of reporting success with an empty result.
- d20265f: `generate()` refuses a job id it could never poll back (dot segments, empty segments, `?` or `#`) instead of minting a handle `getStatus()` rejects, and an error response whose body dies mid-stream still fails as an `LtxVideoError` carrying the status instead of a raw `TypeError`.

## 1.1.0

### Minor Changes

- 501132c: Adds @molecule/api-ai-video-generation-ltx, a Lightricks LTX-2.5/LTX-2.3 provider for @molecule/api-ai-video-generation over the hosted async V2 job API (REST via fetch, zero dependencies).
