#!/usr/bin/env bash
# The Release workflow and local tests execute the same committed-tree guard.
set -eu
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(git rev-parse --show-toplevel)"
MOL_CHANGESET_ROOT="$ROOT" exec node "$SCRIPT_DIR/check-changesets-consumed.mjs" --release-workflow
