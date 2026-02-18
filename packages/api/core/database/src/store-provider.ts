/**
 * DataStore bond accessor and convenience functions for database-agnostic CRUD.
 *
 * These functions delegate to the bonded `DataStore` implementation, allowing
 * resource handlers and application code to perform CRUD operations without
 * knowing which database engine is in use.
 *
 * @module
 */

import { bond, isBonded, require as bondRequire } from '@molecule/api-bond'

import type { DataStore, FindManyOptions, MutationResult, WhereCondition } from './store.js'

const BOND_TYPE = 'datastore'

/**
 * Registers a DataStore implementation as the active singleton. Called by
 * bond packages during application startup.
 *
 * @param store - The DataStore implementation to bond.
 */
export const setStore = (store: DataStore): void => {
  bond(BOND_TYPE, store)
}

/**
 * Retrieves the bonded DataStore, throwing if none is configured.
 *
 * @returns The bonded DataStore implementation.
 * @throws {Error} If no DataStore has been bonded.
 */
export const getStore = (): DataStore => {
  return bondRequire<DataStore>(BOND_TYPE)
}

/**
 * Checks whether a DataStore is currently bonded.
 *
 * @returns `true` if a DataStore is bonded.
 */
export const hasStore = (): boolean => {
  return isBonded(BOND_TYPE)
}

/**
 * Finds a single record by its primary key (`id` column).
 *
 * @param table - The database table name.
 * @param id - The primary key value to look up.
 * @returns The matching record cast to `T`, or `null` if not found.
 * @throws {Error} If no DataStore has been bonded.
 */
export const findById = async <T = Record<string, unknown>>(
  table: string,
  id: string | number,
): Promise<T | null> => {
  return getStore().findById<T>(table, id)
}

/**
 * Finds a single record matching the given filter conditions. Returns the
 * first match if multiple rows satisfy the conditions.
 *
 * @param table - The database table name.
 * @param where - Array of filter conditions to match against.
 * @returns The matching record cast to `T`, or `null` if none found.
 * @throws {Error} If no DataStore has been bonded.
 */
export const findOne = async <T = Record<string, unknown>>(
  table: string,
  where: WhereCondition[],
): Promise<T | null> => {
  return getStore().findOne<T>(table, where)
}

/**
 * Finds multiple records with optional filtering, sorting, pagination,
 * and column selection.
 *
 * @param table - The database table name.
 * @param options - Query options including `where`, `orderBy`, `limit`, `offset`, and `select`.
 * @returns Array of matching records cast to `T`.
 * @throws {Error} If no DataStore has been bonded.
 */
export const findMany = async <T = Record<string, unknown>>(
  table: string,
  options?: FindManyOptions,
): Promise<T[]> => {
  return getStore().findMany<T>(table, options)
}

/**
 * Counts records matching the given filter conditions, or all records
 * if no conditions are specified.
 *
 * @param table - The database table name.
 * @param where - Optional filter conditions.
 * @returns The number of matching records.
 * @throws {Error} If no DataStore has been bonded.
 */
export const count = async (table: string, where?: WhereCondition[]): Promise<number> => {
  return getStore().count(table, where)
}

/**
 * Inserts a new record into the table. Returns the inserted row and
 * the number of affected rows (always 1 on success).
 *
 * @param table - The database table name.
 * @param data - The column values to insert as key-value pairs.
 * @returns A `MutationResult` with the inserted row and affected count.
 * @throws {Error} If no DataStore has been bonded.
 */
export const create = async <T = Record<string, unknown>>(
  table: string,
  data: Record<string, unknown>,
): Promise<MutationResult<T>> => {
  return getStore().create<T>(table, data)
}

/**
 * Updates a record identified by its primary key. Returns the updated row
 * and the number of affected rows.
 *
 * @param table - The database table name.
 * @param id - The primary key value of the record to update.
 * @param data - The column values to update as key-value pairs.
 * @returns A `MutationResult` with the updated row and affected count.
 * @throws {Error} If no DataStore has been bonded.
 */
export const updateById = async <T = Record<string, unknown>>(
  table: string,
  id: string | number,
  data: Record<string, unknown>,
): Promise<MutationResult<T>> => {
  return getStore().updateById<T>(table, id, data)
}

/**
 * Updates all records matching the given filter conditions.
 *
 * @param table - The database table name.
 * @param where - Filter conditions to select records to update.
 * @param data - The column values to update as key-value pairs.
 * @returns A `MutationResult` with the affected count.
 * @throws {Error} If no DataStore has been bonded.
 */
export const updateMany = async (
  table: string,
  where: WhereCondition[],
  data: Record<string, unknown>,
): Promise<MutationResult> => {
  return getStore().updateMany(table, where, data)
}

/**
 * Deletes a record identified by its primary key.
 *
 * @param table - The database table name.
 * @param id - The primary key value of the record to delete.
 * @returns A `MutationResult` with the affected count (1 if deleted, 0 if not found).
 * @throws {Error} If no DataStore has been bonded.
 */
export const deleteById = async (table: string, id: string | number): Promise<MutationResult> => {
  return getStore().deleteById(table, id)
}

/**
 * Deletes all records matching the given filter conditions.
 *
 * @param table - The database table name.
 * @param where - Filter conditions to select records to delete.
 * @returns A `MutationResult` with the number of deleted rows.
 * @throws {Error} If no DataStore has been bonded.
 */
export const deleteMany = async (
  table: string,
  where: WhereCondition[],
): Promise<MutationResult> => {
  return getStore().deleteMany(table, where)
}
