/**
 * Solid medication record row — drug name + dosage/form, instructions,
 * prescriber, days-of-supply and refills-remaining readouts, optional
 * pill-color dot and right-side actions.
 *
 * Solid counterpart of `@molecule/app-medication-row-react`'s `MedicationRow`
 * — the same props (React names), the same ClassMap tokens, and the same DOM
 * for the same input.
 *
 * @module
 */

import { type Component, Show } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Card } from '@molecule/app-ui-solid'

import type { MedicationRowProps } from './types.js'

/**
 * Medication record row — drug name, dosage/form, instructions, prescriber,
 * supply countdown, refills remaining. Used in medication-reminder,
 * patient-facing health portals, pharmacy dashboards.
 *
 * The "Prescribed by" / "N day supply" / "N refills" labels route through
 * `t()` with the same keys and default values React uses.
 *
 * @param props - Component props (see {@link MedicationRowProps}).
 * @returns The rendered medication row.
 */
export const MedicationRow: Component<MedicationRowProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  return (
    <Card className={props.className}>
      <div class={cm.flex({ align: 'start', gap: 'md' })}>
        <Show when={props.color}>
          <span
            aria-hidden="true"
            class={cm.cn(cm.shrink0, cm.roundedFull)}
            style={{ width: '24px', height: '24px', background: props.color }}
          />
        </Show>
        <div class={cm.cn(cm.flex1, cm.stack(1))}>
          <header class={cm.flex({ align: 'baseline', gap: 'sm', wrap: 'wrap' })}>
            <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('bold'))}>{props.name}</h3>
            <PresentWhileNode node={props.dosage}>
              {(dosage) => (
                <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}>{dosage()}</span>
              )}
            </PresentWhileNode>
            <PresentWhileNode node={props.form}>
              {(form) => <span class={cm.textSize('xs')}>{form()}</span>}
            </PresentWhileNode>
          </header>
          <PresentWhileNode node={props.instructions}>
            {(instructions) => <p class={cm.textSize('sm')}>{instructions()}</p>}
          </PresentWhileNode>
          <div class={cm.flex({ align: 'center', gap: 'sm', wrap: 'wrap' })}>
            <PresentWhileNode node={props.prescriber}>
              {(prescriber) => (
                <span class={cm.textSize('xs')}>
                  {t('medication.prescribedBy', {}, { defaultValue: 'Prescribed by' })}{' '}
                  {prescriber()}
                </span>
              )}
            </PresentWhileNode>
            <Show when={props.supplyDays !== undefined}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {'· '}
                {t(
                  'medication.supplyDays',
                  { days: props.supplyDays ?? 0 },
                  { defaultValue: '{{days}} day supply' },
                )}
              </span>
            </Show>
            <Show when={props.refills !== undefined}>
              <span class={cm.textSize('xs')}>
                {'· '}
                {t(
                  'medication.refills',
                  { refills: props.refills ?? 0 },
                  { defaultValue: '{{refills}} refills' },
                )}
              </span>
            </Show>
          </div>
        </div>
        <PresentWhileNode node={props.actions}>
          {(actions) => <div class={cm.shrink0}>{actions()}</div>}
        </PresentWhileNode>
      </div>
    </Card>
  )
}
