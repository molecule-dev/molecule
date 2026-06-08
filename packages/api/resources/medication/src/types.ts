/**
 * Describes how often a medication is taken (e.g. daily, twice daily, as needed).
 */
export type MedicationFrequency =
  | 'once'
  | 'daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'as_needed'
  | 'weekly'
  | 'custom'

/**
 * Database row shape for a medication record.
 */
export interface MedicationRow {
  id: string
  owner_id: string
  name: string
  generic_name: string | null
  dosage: string
  unit: string | null
  frequency: MedicationFrequency
  times_of_day: string[]
  start_date: string | Date | null
  end_date: string | Date | null
  notes: string | null
  is_active: boolean
  created_at: string | Date
  updated_at: string | Date
}

/**
 * Database row shape for a medication intake log entry.
 */
export interface MedicationLogRow {
  id: string
  medication_id: string
  owner_id: string
  taken_at: string | Date
  status: 'taken' | 'skipped' | 'late' | 'missed'
  notes: string | null
  created_at: string | Date
}
