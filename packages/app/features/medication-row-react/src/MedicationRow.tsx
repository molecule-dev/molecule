import type { JSX, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-react'
import { Box, Text } from '@molecule/app-ui-react/elements'

/** Props for {@link MedicationRow}. */
export interface MedicationRowProps {
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
 * @param props - Component props (see {@link MedicationRowProps}).
 */
export function MedicationRow({
  name,
  dosage: dosageProp,
  form: formProp,
  color,
  instructions: instructionsProp,
  prescriber: prescriberProp,
  supplyDays,
  refills,
  actions: actionsProp,
  className,
}: MedicationRowProps): JSX.Element {
  const dosage = slot(dosageProp)
  const form = slot(formProp)
  const instructions = slot(instructionsProp)
  const prescriber = slot(prescriberProp)
  const actions = slot(actionsProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Card className={className}>
      <Box as="div" className={cm.flex({ align: 'start', gap: 'md' })}>
        {color && (
          <Box
            as="span"
            aria-hidden
            className={cm.cn(cm.shrink0, cm.roundedFull)}
            style={{ width: 24, height: 24 }}
            webStyle={{ background: color }}
          />
        )}
        <Box as="div" className={cm.cn(cm.flex1, cm.stack(1 as const))}>
          <Box as="header" className={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
            <Text as="h3" className={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>
              {name}
            </Text>
            {dosage && (
              <Box as="span" className={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>
                {dosage}
              </Box>
            )}
            {form && (
              <Box as="span" className={cm.textSize('xs')}>
                {form}
              </Box>
            )}
          </Box>
          {instructions && (
            <Text as="p" className={cm.textSize('sm')}>
              {instructions}
            </Text>
          )}
          <Box as="div" className={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            {prescriber && (
              <Box as="span" className={cm.textSize('xs')}>
                {t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' })} {prescriber}
              </Box>
            )}
            {supplyDays !== undefined && (
              <Text as="span" className={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                ·{' '}
                {t(
                  'medication.supplyDays',
                  { days: supplyDays },
                  { defaultValue: '{{days}} day supply' },
                )}
              </Text>
            )}
            {refills !== undefined && (
              <Text as="span" className={cm.textSize('xs')}>
                · {t('medication.refills', { refills }, { defaultValue: '{{refills}} refills' })}
              </Text>
            )}
          </Box>
        </Box>
        {actions && (
          <Box as="div" className={cm.shrink0}>
            {actions}
          </Box>
        )}
      </Box>
    </Card>
  )
}
