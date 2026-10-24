/**
 * MotherDuck DataStore — the duckdb bond's store, unchanged.
 *
 * MotherDuck runs DuckDB SQL, so the entire DataStore translation
 * (`?` placeholders, LIKE contract, JSON-column parsing) is identical; only
 * where statements execute differs, and the pool owns that.
 *
 * @module
 */

// Subpath import (not the barrel) so importing this bond does NOT fire the
// duckdb bond's own lifecycle registration on its default pool — the same
// rule the d1 bond follows for @molecule/api-database-sqlite.
export { createStore } from '@molecule/api-database-duckdb/store.js'
