# @molecule/api-database-remote

## 1.0.7

### Patch Changes

- Checks lazy database driver loading against the installed driver declarations.

## 1.0.6

### Patch Changes

- The examples read the database password from the environment instead of writing it into the URL.

## 1.0.5

### Patch Changes

- Peer dependency ranges now include the versions these packages are tested with (vue-router 5, better-sqlite3 13).

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
