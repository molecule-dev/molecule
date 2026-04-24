import type { ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'

interface MedicationRowProps {
  /** Drug name. */
  name: ReactNode
  /** Dosage display ("10mg", "1 tablet"). */
  dosage?: ReactNode
  /** Form (tablet, capsule, liquid, etc.). */
  form?: ReactNode
  /** Optional accent color (typically used to differentiate pill colors). */
  color?: string
  /** Instructions text ("Take with food"). */
  instructions?: ReactNode
  /** Prescriber display. */
  prescriber?: ReactNode
  /** Days of supply remaining. */
  supplyDays?: number
  /** Refills remaining. */
  refills?: number
  /** Right-side actions (Mark taken, Refill, Edit). */
  actions?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Medication record row — drug name, dosage/form, instructions,
 * prescriber, supply countdown, refills remaining. Used in
 * medication-reminder, patient-facing health portals, pharmacy
 * dashboards.
 * @param root0
 * @param root0.name
 * @param root0.dosage
 * @param root0.form
 * @param root0.color
 * @param root0.instructions
 * @param root0.prescriber
 * @param root0.supplyDays
 * @param root0.refills
 * @param root0.actions
 * @param root0.className
 */
export function MedicationRow({
  name,
  dosage,
  form,
  color,
  instructions,
  prescriber,
  supplyDays,
  refills,
  actions,
  className,
}: MedicationRowProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Card className={className}>
      <div className={cm.flex({ align: 'start', gap: 'md' })}>
        {color && (
          <span
            aria-hidden
            className={cm.cn(cm.shrink0, cm.roundedFull)}
            style={{ width: 24, height: 24, background: color }}
          />
        )}
        <div className={cm.cn(cm.flex1, cm.stack(1 as const))}>
          <header className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
            <h3 className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{name}</h3>
            {dosage && (
              <span className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{dosage}</span>
            )}
            {form && <span className={cm.textSize('xs')}>{form}</span>}
          </header>
          {instructions && <p className={cm.textSize('sm')}>{instructions}</p>}
          <div className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {prescriber && (
              <span className={cm.textSize('xs')}>
                {t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' })} {prescriber}
              </span>
            )}
            {supplyDays !== undefined && (
              <span className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                ·{' '}
                {t(
                  'medication.supplyDays',
                  { days: supplyDays },
                  { defaultValue: `${supplyDays} day supply` },
                )}
              </span>
            )}
            {refills !== undefined && (
              <span className={cm.textSize('xs')}>
                · {t('medication.refills', { refills }, { defaultValue: `${refills} refills` })}
              </span>
            )}
          </div>
        </div>
        {actions && <div className={cm.shrink0}>{actions}</div>}
      </div>
    </Card>
  )
}
