# @molecule/api-resource-journal-entry

## 1.0.7

### Patch Changes

- Types validation middleware against the journal entry route schemas.

## 1.0.6

### Patch Changes

- Read the session and route parameters through `@molecule/api-resource`, so installing this resource no longer installs the Express bond bundle.

## 1.0.4

### Patch Changes

- 6e60d60: - `@molecule/api-resource-api-key`: the setup SQL now ships at `src/__setup__/api_keys.sql`, the path its README states.
  - `@molecule/api-resource-article`: the README names `src/__setup__/` as the directory its four setup SQL files ship in.
  - `@molecule/api-resource-device`: the setup SQL now ships at `src/__setup__/devices.sql`, the path its README states.
  - `@molecule/api-resource-firmware`: the README names `src/__setup__/firmware.sql` as the setup SQL path.
  - `@molecule/api-resource-journal-entry`: the README names `src/__setup__/journal_entries.sql` as the setup SQL path.
  - `@molecule/api-resource-payment`: the setup SQL now ships at `src/__setup__/payments.sql`, the path its README states.
  - `@molecule/api-resource-status-page`: the setup SQL now ships under `src/__setup__/`, the path its README states.
  - `@molecule/api-resource-user`: the setup SQL now ships at `src/__setup__/users.sql` and `src/__setup__/usersSecrets.sql`, the paths its README states.

## 1.0.3

### Patch Changes

- 83cdaa5: The package now publishes its table SQL, so a project installing it from npm can create its tables.

## 1.0.1

### Patch Changes

- Ship the generated package documentation.

  1.0.0 published with `files: ["dist"]`, so no package carried a README and every
  npm page read "This package does not have a README". The generated doc (formerly
  MOLECULE.md, now README.md) is now included in the tarball, giving both humans and
  coding agents the full API reference from node_modules.

- Updated dependencies
  - @molecule/api-bonds-default-express@1.0.1
  - @molecule/api-database@1.0.1
  - @molecule/api-encryption@1.0.1
  - @molecule/api-i18n@1.0.1
  - @molecule/api-logger@1.0.1
  - @molecule/api-middleware-validation@1.0.1
