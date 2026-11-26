# @molecule/api-ai-translation-google

## 1.0.3

### Patch Changes

- Requires `@molecule/api-ai-translation` 1.1.0 (`protect`) or later, the first release that declares what it uses.

## 1.0.1

### Patch Changes

- 503405b: The Google Translate bond sends its API key in the `X-goog-api-key` request header instead of the URL query string, so the key no longer appears in access logs or error reports that record full URLs.
