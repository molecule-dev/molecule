/**
 * Address business logic service.
 *
 * Persistence is handled exclusively through the abstract `@molecule/api-database`
 * DataStore — no raw SQL.
 *
 * @module
 */

import {
  count,
  create as dbCreate,
  deleteById,
  findById,
  findMany,
  findOne,
  updateById,
  updateMany,
} from '@molecule/api-database'

import type {
  Address,
  CreateAddressInput,
  DefaultAddressKind,
  UpdateAddressInput,
} from './types.js'

/** Backing table name. */
const TABLE = 'addresses'

/**
 * Creates an address for a user.
 *
 * If the input flags `isDefaultShipping` or `isDefaultBilling`, this also
 * unsets that flag on every other address belonging to the same user, so the
 * default invariant ("at most one default per kind per user") holds.
 *
 * @param input - The address creation input. `userId` must be set.
 * @returns The created address.
 */
export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const normalized = normalizeForWrite(input)

  if (normalized.isDefaultShipping) {
    await clearDefault(normalized.userId, 'shipping')
  }
  if (normalized.isDefaultBilling) {
    await clearDefault(normalized.userId, 'billing')
  }

  const result = await dbCreate<Address>(TABLE, normalized as unknown as Record<string, unknown>)

  if (!result.data) {
    throw new Error('Database create returned no data')
  }

  return result.data
}

/**
 * Lists all addresses owned by a user, defaults first, then most recent.
 *
 * @param userId - The user ID.
 * @returns The user's addresses.
 */
export async function listAddresses(userId: string): Promise<Address[]> {
  return findMany<Address>(TABLE, {
    where: [{ field: 'userId', operator: '=', value: userId }],
    orderBy: [
      { field: 'isDefaultShipping', direction: 'desc' },
      { field: 'isDefaultBilling', direction: 'desc' },
      { field: 'createdAt', direction: 'desc' },
    ],
  })
}

/**
 * Loads a single address by ID, scoped to a user.
 *
 * @param userId - The user that must own the address.
 * @param addressId - The address ID.
 * @returns The address, or `null` if not found / not owned by the user.
 */
export async function getAddress(userId: string, addressId: string): Promise<Address | null> {
  const address = await findById<Address>(TABLE, addressId)
  if (!address || address.userId !== userId) return null
  return address
}

/**
 * Updates an address, scoped to a user.
 *
 * Toggling `isDefaultShipping` or `isDefaultBilling` to `true` will also clear
 * the matching flag on the user's other addresses.
 *
 * @param userId - The user that must own the address.
 * @param addressId - The address ID.
 * @param patch - Fields to change.
 * @returns The updated address, or `null` if not found / not owned by the user.
 */
export async function updateAddress(
  userId: string,
  addressId: string,
  patch: UpdateAddressInput,
): Promise<Address | null> {
  const existing = await getAddress(userId, addressId)
  if (!existing) return null

  if (patch.isDefaultShipping === true) {
    await clearDefault(userId, 'shipping', addressId)
  }
  if (patch.isDefaultBilling === true) {
    await clearDefault(userId, 'billing', addressId)
  }

  const result = await updateById<Address>(
    TABLE,
    addressId,
    normalizeForWrite(patch) as unknown as Record<string, unknown>,
  )

  return result.data ?? null
}

/**
 * Deletes an address, scoped to a user.
 *
 * @param userId - The user that must own the address.
 * @param addressId - The address ID.
 * @returns `true` if the address was deleted, `false` if not found / not owned.
 */
export async function deleteAddress(userId: string, addressId: string): Promise<boolean> {
  const existing = await getAddress(userId, addressId)
  if (!existing) return false

  const result = await deleteById(TABLE, addressId)
  return (result.affected ?? 0) > 0
}

/**
 * Sets the given address as the user's default for the given kind, clearing
 * the same flag on every other address owned by the user.
 *
 * @param userId - The user that must own the address.
 * @param addressId - The address ID to flag as default.
 * @param kind - Which default to set (`'shipping'` or `'billing'`).
 * @returns `true` if the flag was set, `false` if the address was not found.
 */
export async function setDefault(
  userId: string,
  addressId: string,
  kind: DefaultAddressKind,
): Promise<boolean> {
  const existing = await getAddress(userId, addressId)
  if (!existing) return false

  await clearDefault(userId, kind, addressId)

  const field = kind === 'shipping' ? 'isDefaultShipping' : 'isDefaultBilling'
  await updateById(TABLE, addressId, { [field]: true })

  return true
}

/**
 * Counts a user's addresses.
 *
 * @param userId - The user ID.
 * @returns The number of saved addresses.
 */
export async function countAddresses(userId: string): Promise<number> {
  return count(TABLE, [{ field: 'userId', operator: '=', value: userId }])
}

/**
 * Gets the user's current default address for a given kind, if any.
 *
 * @param userId - The user ID.
 * @param kind - Which default to look up.
 * @returns The default address, or `null` if none is set.
 */
export async function getDefaultAddress(
  userId: string,
  kind: DefaultAddressKind,
): Promise<Address | null> {
  const field = kind === 'shipping' ? 'isDefaultShipping' : 'isDefaultBilling'
  return findOne<Address>(TABLE, [
    { field: 'userId', operator: '=', value: userId },
    { field, operator: '=', value: true },
  ])
}

/**
 * Clears the given default flag on every address owned by the user, except
 * optionally one address that should be left untouched (e.g. because it is
 * about to become the new default).
 */
async function clearDefault(
  userId: string,
  kind: DefaultAddressKind,
  exceptAddressId?: string,
): Promise<void> {
  const field = kind === 'shipping' ? 'isDefaultShipping' : 'isDefaultBilling'
  const where = [
    { field: 'userId', operator: '=' as const, value: userId },
    { field, operator: '=' as const, value: true },
    ...(exceptAddressId ? [{ field: 'id', operator: '!=' as const, value: exceptAddressId }] : []),
  ]
  await updateMany(TABLE, where, { [field]: false })
}

/**
 * Normalizes optional/undefined fields to `null` and uppercases the country
 * ISO code so storage is consistent.
 */
function normalizeForWrite<T extends Partial<CreateAddressInput>>(input: T): T {
  const out: Record<string, unknown> = { ...input }
  if ('label' in input) out.label = input.label ?? null
  if ('line2' in input) out.line2 = input.line2 ?? null
  if ('region' in input) out.region = input.region ?? null
  if ('phone' in input) out.phone = input.phone ?? null
  if (typeof input.countryIso === 'string') {
    out.countryIso = input.countryIso.toUpperCase()
  }
  if ('isDefaultShipping' in input && input.isDefaultShipping === undefined) {
    out.isDefaultShipping = false
  }
  if ('isDefaultBilling' in input && input.isDefaultBilling === undefined) {
    out.isDefaultBilling = false
  }
  return out as T
}
