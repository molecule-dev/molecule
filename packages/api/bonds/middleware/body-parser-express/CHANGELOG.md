# @molecule/api-middleware-body-parser-express

## 2.1.1

### Patch Changes

- Types the Express adapter for custom JSON parser options.

## 2.1.0

### Minor Changes

- Publishes the changes listed under the previous version, which was not released to npm.

## 2.0.0

### Major Changes

- Leave `multipart/form-data` bodies unread app-wide so a route's upload parser can stream them, add `uploadParserFactory`, and parse URL-encoded bodies that carry a charset.

### Patch Changes

- Reads bodies with `busboy` directly: a multipart body without a boundary is refused with 400, and an empty URL-encoded form passes with an empty `req.body`.
- A storage can refuse a file with an `onError` error carrying a 4xx `status` and an `errorKey` (`StorageRefusal`); the upload parser answers it as JSON with that status.
- The upload parser removes a request's files when the route answers 400 or more and accepts a file of exactly `maxFileBytes`; a URL-encoded body past the field limits is answered with 413 instead of being cut.

## 1.0.5

### Patch Changes

- The docs name packages that exist, and the link-preview and oEmbed cache examples convert their millisecond TTL for `@molecule/api-cache`.

## 1.0.3

### Patch Changes

- 240411e: Declares `@types/express-serve-static-core`, whose types it augments.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bond@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-middleware-body-parser@1.0.1
