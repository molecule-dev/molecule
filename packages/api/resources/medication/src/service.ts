/**
 * Medication-tracking service.
 *
 * @module
 */

import {
  count,
  create,
  deleteById,
  findById,
  findMany,
  type OrderBy,
  updateById,
  type WhereCondition,
} from '@molecule/api-database'

import type { MedicationFrequency, MedicationLogRow, MedicationRow } from './types.js'

const MEDS_TABLE = 'medications'
const LOGS_TABLE = 'medication_logs'

/** Returns all medications belonging to the given owner, optionally including inactive ones. */
export async function listMedicationsForOwner(
  ownerId: string,
  opts: { include_inactive?: boolean } = {},
): Promise<MedicationRow[]> {
  const where: WhereCondition[] = [{ field: 'owner_id', operator: '=', value: ownerId }]
  if (!opts.include_inactive) where.push({ field: 'is_active', operator: '=', value: true })
  const orderBy: OrderBy[] = [{ field: 'name', direction: 'asc' }]
  return findMany<MedicationRow>(MEDS_TABLE, { where, orderBy })
}

/** Fetches a single medication by ID, returning null if not found or not owned by the given owner. */
export async function getMedicationForOwner(
  medicationId: string,
  ownerId: string,
): Promise<MedicationRow | null> {
  const row = await findById<MedicationRow>(MEDS_TABLE, medicationId)
  if (!row || row.owner_id !== ownerId) return null
  return row
}

/** Creates a new medication record owned by the given owner and returns the persisted row. */
export async function createMedicationForOwner(
  ownerId: string,
  data: {
    name: string
    generic_name?: string | null
    dosage: string
    unit?: string | null
    frequency?: MedicationFrequency
    times_of_day?: string[]
    start_date?: string | null
    end_date?: string | null
    notes?: string | null
  },
): Promise<MedicationRow> {
  const result = await create<MedicationRow>(MEDS_TABLE, {
    owner_id: ownerId,
    name: data.name,
    generic_name: data.generic_name ?? null,
    dosage: data.dosage,
    unit: data.unit ?? null,
    frequency: data.frequency ?? 'daily',
    times_of_day: data.times_of_day ?? [],
    start_date: data.start_date ?? null,
    end_date: data.end_date ?? null,
    notes: data.notes ?? null,
    is_active: true,
  } as Partial<MedicationRow>)
  return result.data!
}

/** Applies a partial patch to a medication, returning the updated row or null if not found or not owned. */
export async function updateMedicationForOwner(
  medicationId: string,
  ownerId: string,
  patch: Partial<MedicationRow>,
): Promise<MedicationRow | null> {
  const existing = await findById<MedicationRow>(MEDS_TABLE, medicationId)
  if (!existing || existing.owner_id !== ownerId) return null
  await updateById(MEDS_TABLE, medicationId, patch)
  return findById<MedicationRow>(MEDS_TABLE, medicationId)
}

/** Deletes a medication by ID, returning true on success or false if not found or not owned. */
export async function deleteMedicationForOwner(
  medicationId: string,
  ownerId: string,
): Promise<boolean> {
  const row = await findById<MedicationRow>(MEDS_TABLE, medicationId)
  if (!row || row.owner_id !== ownerId) return false
  await deleteById(MEDS_TABLE, medicationId)
  return true
}

/** Log a dose. If `status` not provided, infers from `taken_at` vs scheduled times. */
export async function logDose(
  medicationId: string,
  ownerId: string,
  data: {
    taken_at?: string
    status?: 'taken' | 'skipped' | 'late' | 'missed'
    notes?: string | null
  },
): Promise<MedicationLogRow | null> {
  const med = await getMedicationForOwner(medicationId, ownerId)
  if (!med) return null
  const result = await create<MedicationLogRow>(LOGS_TABLE, {
    medication_id: medicationId,
    owner_id: ownerId,
    taken_at: data.taken_at ?? new Date().toISOString(),
    status: data.status ?? 'taken',
    notes: data.notes ?? null,
  } as Partial<MedicationLogRow>)
  return result.data!
}

/** Returns dose logs for a medication within an optional time window, or null if the medication is not found or not owned. */
export async function listLogs(
  medicationId: string,
  ownerId: string,
  opts: { from?: string; to?: string; limit?: number } = {},
): Promise<MedicationLogRow[] | null> {
  const med = await getMedicationForOwner(medicationId, ownerId)
  if (!med) return null
  const where: WhereCondition[] = [
    { field: 'medication_id', operator: '=', value: medicationId },
    { field: 'owner_id', operator: '=', value: ownerId },
  ]
  if (opts.from) where.push({ field: 'taken_at', operator: '>=', value: opts.from })
  if (opts.to) where.push({ field: 'taken_at', operator: '<=', value: opts.to })
  return findMany<MedicationLogRow>(LOGS_TABLE, {
    where,
    orderBy: [{ field: 'taken_at', direction: 'desc' }],
    limit: opts.limit ?? 200,
  })
}

/** Adherence summary: percentage of `taken` logs out of all logs in window. */
export async function adherenceRate(
  ownerId: string,
  from: string,
  to: string,
): Promise<{ taken: number; total: number; rate: number }> {
  const where: WhereCondition[] = [
    { field: 'owner_id', operator: '=', value: ownerId },
    { field: 'taken_at', operator: '>=', value: from },
    { field: 'taken_at', operator: '<=', value: to },
  ]
  const total = await count(LOGS_TABLE, where)
  const taken = await count(LOGS_TABLE, [
    ...where,
    { field: 'status', operator: '=', value: 'taken' },
  ])
  return { taken, total, rate: total > 0 ? taken / total : 0 }
}
