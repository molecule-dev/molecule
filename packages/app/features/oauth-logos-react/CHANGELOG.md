# @molecule/app-oauth-logos-react

## 1.1.0

### Minor Changes

- Each logo's root SVG now carries `translate="no"`, so brand names in accessible labels and titles stay as written in every language. The Angular package also exports the `OAuthProviderLogoProps` type.

## 1.0.4

### Patch Changes

- Preserve authored TypeScript declarations in generated API documentation.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.
