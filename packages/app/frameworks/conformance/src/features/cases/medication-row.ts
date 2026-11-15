/**
 * `@molecule/app-medication-row-react` cases: the medication record row —
 * drug name, dosage/form, instructions, pill-color dot, prescriber, days of
 * supply, refills remaining and the right-side actions.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** An actions cluster: one button, the way a caller fills the `actions` slot. */
const actions = [
  {
    tag: 'button',
    attrs: { 'data-actions': '', type: 'button' },
    children: ['Mark taken'],
  },
]

/** Node-valued prescriptions for the slot-prop cases. */
const nameNode = [{ tag: 'strong', attrs: { 'data-node': 'name' }, children: ['Lisinopril'] }]
const dosageNode = [{ tag: 'em', attrs: { 'data-node': 'dosage' }, children: ['10mg'] }]
const formNode = [{ tag: 'span', attrs: { 'data-node': 'form' }, children: ['tablet'] }]
const instructionsNode = [
  { tag: 'span', attrs: { 'data-node': 'instructions' }, children: ['Take with water'] },
]
const prescriberNode = [
  { tag: 'strong', attrs: { 'data-node': 'prescriber' }, children: ['Dr. Sarah Chen'] },
]

/** `@molecule/app-medication-row-react`. */
export const medicationRowFeature: FeatureCases = {
  package: '@molecule/app-medication-row-react',
  families: [
    {
      component: 'MedicationRow',
      cases: [
        { name: 'name only', props: { name: 'Lisinopril' } },
        { name: 'name and dosage', props: { name: 'Lisinopril', dosage: '10mg' } },
        { name: 'name and form', props: { name: 'Lisinopril', form: 'tablet' } },
        {
          name: 'dosage and form together',
          props: { name: 'Lisinopril', dosage: '1 tablet', form: 'tablet' },
        },
        {
          name: 'instructions',
          props: { name: 'Lisinopril', instructions: 'Take with water in the morning' },
        },
        { name: 'pill color dot', props: { name: 'Lisinopril', color: '#4ade80' } },
        { name: 'prescriber', props: { name: 'Lisinopril', prescriber: 'Dr. Sarah Chen' } },
        { name: 'a zero day supply still renders', props: { name: 'Lisinopril', supplyDays: 0 } },
        {
          name: 'a zero refill count still renders',
          props: { name: 'Lisinopril', refills: 0 },
        },
        {
          name: 'supply days and refills',
          props: { name: 'Lisinopril', supplyDays: 14, refills: 2 },
        },
        {
          name: 'prescriber, supply days and refills',
          props: {
            name: 'Lisinopril',
            prescriber: 'Dr. Sarah Chen',
            supplyDays: 30,
            refills: 3,
          },
        },
        { name: 'actions slot', props: { name: 'Lisinopril' }, slots: { actions } },
        {
          name: 'every prop together',
          props: {
            name: 'Lisinopril',
            dosage: '10mg',
            form: 'tablet',
            color: '#4ade80',
            instructions: 'Take with water in the morning',
            prescriber: 'Dr. Sarah Chen',
            supplyDays: 14,
            refills: 2,
            className: 'parity-token',
          },
          slots: { actions },
        },
        {
          name: 'node name, dosage, form and instructions',
          slots: {
            name: nameNode,
            dosage: dosageNode,
            form: formNode,
            instructions: instructionsNode,
          },
        },
        {
          name: 'node prescriber and actions',
          slots: { prescriber: prescriberNode, actions },
        },
        {
          name: 'empty strings omit their branches',
          props: {
            name: 'Lisinopril',
            dosage: '',
            form: '',
            color: '',
            instructions: '',
            prescriber: '',
            className: '',
          },
        },
        {
          name: 'className only',
          props: { name: 'Lisinopril', className: 'parity-token' },
        },
        {
          name: 'dosage, form and instructions appear on change',
          props: { name: 'Lisinopril' },
          interactions: [
            {
              type: 'props',
              props: { dosage: '10mg', form: 'tablet', instructions: 'Take with food' },
            },
          ],
        },
        {
          name: 'the supply countdown updates',
          props: { name: 'Lisinopril', supplyDays: 14, refills: 2 },
          interactions: [{ type: 'props', props: { supplyDays: 7, refills: 1 } }],
        },
        {
          name: 'the pill color dot is removed',
          props: { name: 'Lisinopril', color: '#4ade80' },
          interactions: [{ type: 'props', props: { color: null } }],
        },
        {
          name: 'prescriber and instructions are removed',
          props: {
            name: 'Lisinopril',
            instructions: 'Take with food',
            prescriber: 'Dr. Sarah Chen',
          },
          interactions: [{ type: 'props', props: { instructions: '', prescriber: '' } }],
        },
        {
          name: 'labels follow a locale switch',
          props: {
            name: 'Lisinopril',
            prescriber: 'Dr. Sarah Chen',
            supplyDays: 14,
            refills: 2,
          },
          context: {
            translations: {
              'en-XA': {
                medication: {
                  prescribedBy: 'Prescrit par',
                  supplyDays: '{{days}} jours de fourniture',
                  refills: '{{refills}} renouvellements',
                },
              },
            },
          },
          interactions: [{ type: 'locale', locale: 'en-XA' }],
        },
      ],
    },
  ],
}
