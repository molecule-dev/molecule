/**
 * `@molecule/app-survey-question-react` cases: the multi-type survey-question
 * renderer, one case family per branch — every question kind, the required
 * indicator and error, help text, read-only mode, each callback, and the
 * file-dropzone delegation.
 *
 * @module
 */

import type { FeatureCases } from '../spec.js'

/** A file the file-upload cases list and drop. */
const readme = new File(['contents'], 'a.txt', { type: 'text/plain' })
/** A second file, so a list case has more than one row. */
const notes = new File(['notes'], 'notes.md', { type: 'text/markdown' })

/** A short-text question with every optional field absent. */
const short = { id: 's1', kind: 'short-text', prompt: 'What is your name?' }

/** A single-pick question with two options. */
const single = {
  id: 'mc1',
  kind: 'multi-choice-single',
  prompt: 'Pick one',
  options: [
    { value: 'a', label: 'Option A' },
    { value: 'b', label: 'Option B' },
  ],
}

/** A multi-pick question with three options. */
const multi = {
  id: 'mm1',
  kind: 'multi-choice-multi',
  prompt: 'Pick many',
  options: [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
    { value: 'c', label: 'C' },
  ],
}

/**
 * The submit button below a question's input: React renders it in a plain
 * `<div>` that directly follows the input wrapper while no help text or error
 * is showing.
 *
 * @param id - The question id.
 * @returns A CSS selector for the submit button.
 */
const submitButton = (id: string): string =>
  `div[data-mol-id="survey-question-${id}-input"] + div > button`

/** A matrix question with two rows and two columns. */
const matrix = {
  id: 'mx1',
  kind: 'matrix',
  prompt: 'Rate each',
  rows: [
    { id: 'r1', label: 'Row 1' },
    { id: 'r2', label: 'Row 2' },
  ],
  columns: [
    { value: '1', label: 'Bad' },
    { value: '2', label: 'Good' },
  ],
}

/** `@molecule/app-survey-question-react`. */
export const surveyQuestionFeature: FeatureCases = {
  package: '@molecule/app-survey-question-react',
  families: [
    {
      component: 'SurveyQuestion',
      cases: [
        {
          name: 'required short-text with a submit button',
          props: { question: { ...short, required: true }, value: '' },
          callbacks: ['onChange', 'onSubmit'],
        },
        {
          name: 'description, helpText, className and data attributes',
          props: {
            question: {
              ...short,
              description: 'desc-here',
              helpText: 'help-here',
            },
            className: 'parity-token',
          },
        },
        {
          name: 'not required and no source of optional text',
          props: { question: { ...short, required: false } },
        },
        {
          name: 'a question without an id in the DOM',
          props: {
            question: { id: 'odd id', kind: 'short-text', prompt: 'Anything?' },
          },
        },
        {
          name: 'multi-choice-single: no selection',
          props: { question: single },
          callbacks: ['onChange'],
        },
        {
          name: 'multi-choice-single: a selected option',
          props: { question: single, value: 'b' },
        },
        {
          name: 'multi-choice-single: clicking an option reports it',
          props: { question: single },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-mc1-b"]' }],
        },
        {
          name: 'multi-choice-single: value changes mark the other option',
          props: { question: single, value: 'a' },
          interactions: [{ type: 'props', props: { value: 'b' } }],
        },
        {
          name: 'multi-choice-single: readOnly',
          props: { question: single, value: 'a', readOnly: true },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-mc1-b"]' }],
        },
        {
          name: 'multi-choice-multi: none selected',
          props: { question: multi },
          callbacks: ['onChange'],
        },
        {
          name: 'multi-choice-multi: two selected',
          props: { question: multi, value: ['a', 'c'] },
        },
        {
          name: 'multi-choice-multi: clicking toggles an option on',
          props: { question: multi, value: ['a'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-mm1-c"]' }],
        },
        {
          name: 'multi-choice-multi: clicking toggles a selected option off',
          props: { question: multi, value: ['a', 'b'] },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-mm1-a"]' }],
        },
        {
          name: 'multi-choice-multi: readOnly',
          props: { question: multi, value: [], readOnly: true },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-mm1-a"]' }],
        },
        {
          name: 'true-false: default labels',
          props: { question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' } },
          callbacks: ['onChange'],
        },
        {
          name: 'true-false: custom labels',
          props: {
            question: {
              id: 'tf1',
              kind: 'true-false',
              prompt: 'Agree?',
              trueLabel: 'Yes',
              falseLabel: 'No',
            },
          },
        },
        {
          name: 'true-false: true selected',
          props: {
            question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' },
            value: true,
          },
        },
        {
          name: 'true-false: false selected',
          props: {
            question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' },
            value: false,
          },
        },
        {
          name: 'true-false: clicking true reports it',
          props: { question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-tf1-true"]' }],
        },
        {
          name: 'true-false: clicking false reports it',
          props: { question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-tf1-false"]' }],
        },
        {
          name: 'true-false: readOnly',
          props: {
            question: { id: 'tf1', kind: 'true-false', prompt: 'Is the sky blue?' },
            readOnly: true,
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-tf1-true"]' }],
        },
        {
          name: 'short-text: placeholder and maxLength',
          props: {
            question: { ...short, placeholder: 'Your name', maxLength: 12 },
          },
        },
        {
          name: 'short-text: typing reports every change',
          props: { question: short },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-s1"]', value: 'hello' },
          ],
        },
        {
          name: 'short-text: a value change fills the field',
          props: { question: short, value: 'before' },
          interactions: [
            { type: 'props', props: { value: 'after' } },
            { type: 'input', selector: '[data-mol-id="survey-input-s1"]', value: 'typ' },
          ],
        },
        {
          name: 'short-text: readOnly',
          props: { question: short, value: 'fixed', readOnly: true },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-s1"]', value: 'x' },
          ],
        },
        {
          name: 'long-text: default rows',
          props: { question: { id: 'lt1', kind: 'long-text', prompt: 'tell us' } },
        },
        {
          name: 'long-text: custom rows, placeholder and maxLength',
          props: {
            question: {
              id: 'lt1',
              kind: 'long-text',
              prompt: 'tell us',
              rows: 6,
              placeholder: 'Details',
              maxLength: 500,
            },
          },
        },
        {
          name: 'long-text: typing reports every change',
          props: { question: { id: 'lt1', kind: 'long-text', prompt: 'tell us', rows: 3 } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-lt1"]', value: 'two words' },
          ],
        },
        {
          name: 'long-text: a value change fills the field',
          props: {
            question: { id: 'lt1', kind: 'long-text', prompt: 'tell us', rows: 3 },
            value: 'before',
          },
          interactions: [{ type: 'props', props: { value: 'after' } }],
        },
        {
          name: 'long-text: readOnly',
          props: {
            question: { id: 'lt1', kind: 'long-text', prompt: 'tell us', rows: 3 },
            value: 'fixed',
            readOnly: true,
          },
          callbacks: ['onChange'],
        },
        {
          name: 'numeric: no unit',
          props: { question: { id: 'n1', kind: 'numeric', prompt: 'how many?' } },
          callbacks: ['onChange'],
        },
        {
          name: 'numeric: unit, min, max and step',
          props: {
            question: {
              id: 'n1',
              kind: 'numeric',
              prompt: 'how many?',
              unit: 'kg',
              min: 0,
              max: 100,
              step: 5,
            },
            value: 10,
          },
        },
        {
          name: 'numeric: typing a number reports it',
          props: { question: { id: 'n1', kind: 'numeric', prompt: 'how many?', unit: 'kg' } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-n1"]', value: '42' },
          ],
        },
        {
          name: 'numeric: clearing the input reports an empty value',
          props: {
            question: { id: 'n1', kind: 'numeric', prompt: 'how many?', unit: 'kg' },
            value: 7,
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'input', selector: '[data-mol-id="survey-input-n1"]', value: '' }],
        },
        {
          name: 'numeric: unparseable text reports nothing',
          props: { question: { id: 'n1', kind: 'numeric', prompt: 'how many?' }, value: 7 },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-n1"]', value: 'abc' },
          ],
        },
        {
          name: 'numeric: a value change fills the field',
          props: { question: { id: 'n1', kind: 'numeric', prompt: 'how many?' }, value: 1 },
          interactions: [{ type: 'props', props: { value: 2 } }],
        },
        {
          name: 'numeric: readOnly',
          props: {
            question: { id: 'n1', kind: 'numeric', prompt: 'how many?' },
            value: 3,
            readOnly: true,
          },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-n1"]', value: '4' },
          ],
        },
        {
          name: 'rating-scale: default 1-5',
          props: { question: { id: 'r1', kind: 'rating-scale', prompt: 'rate' } },
          callbacks: ['onChange'],
        },
        {
          name: 'rating-scale: low and high labels',
          props: {
            question: {
              id: 'r1',
              kind: 'rating-scale',
              prompt: 'rate',
              lowLabel: 'Bad',
              highLabel: 'Good',
            },
          },
        },
        {
          name: 'rating-scale: custom min and max',
          props: {
            question: { id: 'r2', kind: 'rating-scale', prompt: 'rate', min: 1, max: 10 },
          },
        },
        {
          name: 'rating-scale: a selected value',
          props: { question: { id: 'r1', kind: 'rating-scale', prompt: 'rate' }, value: 3 },
        },
        {
          name: 'rating-scale: clicking a value reports it',
          props: { question: { id: 'r3', kind: 'rating-scale', prompt: 'rate' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-r3-3"]' }],
        },
        {
          name: 'rating-scale: readOnly',
          props: {
            question: { id: 'r3', kind: 'rating-scale', prompt: 'rate' },
            readOnly: true,
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-r3-3"]' }],
        },
        {
          name: 'nps: default labels',
          props: { question: { id: 'nps1', kind: 'nps', prompt: 'how likely?' } },
          callbacks: ['onChange'],
        },
        {
          name: 'nps: custom labels',
          props: {
            question: {
              id: 'nps1',
              kind: 'nps',
              prompt: 'how likely?',
              lowLabel: 'Never',
              highLabel: 'Always',
            },
          },
        },
        {
          name: 'nps: a selected value',
          props: { question: { id: 'nps1', kind: 'nps', prompt: 'how likely?' }, value: 9 },
        },
        {
          name: 'nps: clicking a value reports it',
          props: { question: { id: 'nps1', kind: 'nps', prompt: 'how likely?' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-nps1-10"]' }],
        },
        {
          name: 'nps: readOnly',
          props: {
            question: { id: 'nps1', kind: 'nps', prompt: 'how likely?' },
            readOnly: true,
          },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-option-nps1-10"]' }],
        },
        {
          name: 'date: a value',
          props: {
            question: { id: 'd1', kind: 'date', prompt: 'When?' },
            value: '2026-01-15',
          },
        },
        {
          name: 'date: min and max',
          props: {
            question: {
              id: 'd1',
              kind: 'date',
              prompt: 'When?',
              min: '2026-01-01',
              max: '2026-12-31',
            },
          },
        },
        {
          name: 'date: changing the date reports it',
          props: { question: { id: 'd1', kind: 'date', prompt: 'When?' } },
          callbacks: ['onChange'],
          interactions: [
            { type: 'input', selector: '[data-mol-id="survey-input-d1"]', value: '2026-02-03' },
          ],
        },
        {
          name: 'date: readOnly',
          props: {
            question: { id: 'd1', kind: 'date', prompt: 'When?' },
            value: '2026-01-15',
            readOnly: true,
          },
          callbacks: ['onChange'],
        },
        {
          name: 'file-upload: no files',
          props: { question: { id: 'f1', kind: 'file-upload', prompt: 'upload' } },
          callbacks: ['onChange'],
        },
        {
          name: 'file-upload: lists the chosen files',
          props: {
            question: { id: 'f1', kind: 'file-upload', prompt: 'upload' },
            value: [readme, notes],
          },
          callbacks: ['onChange'],
        },
        {
          name: 'file-upload: accept, multiple and maxSize',
          props: {
            question: {
              id: 'f1',
              kind: 'file-upload',
              prompt: 'upload',
              accept: 'image/*',
              multiple: true,
              maxSize: 1024,
            },
          },
          callbacks: ['onChange'],
        },
        {
          name: 'file-upload: dropping a file reports it',
          props: { question: { id: 'f1', kind: 'file-upload', prompt: 'upload' } },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'transfer',
              selector: 'div[data-mol-id="file-dropzone"]',
              event: 'drop',
              files: [{ name: 'photo.png', type: 'image/png', content: 'png' }],
            },
          ],
        },
        {
          name: 'file-upload: readOnly',
          props: {
            question: { id: 'f1', kind: 'file-upload', prompt: 'upload' },
            value: [readme],
            readOnly: true,
          },
          callbacks: ['onChange'],
          interactions: [
            {
              type: 'transfer',
              selector: 'div[data-mol-id="file-dropzone"]',
              event: 'drop',
              files: [{ name: 'photo.png', type: 'image/png', content: 'png' }],
            },
          ],
        },
        {
          name: 'matrix: no selection',
          props: { question: matrix },
          callbacks: ['onChange'],
        },
        {
          name: 'matrix: a selected cell',
          props: { question: matrix, value: { r1: '2' } },
        },
        {
          name: 'matrix: clicking a cell reports the row mapping',
          props: { question: matrix, value: {} },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-matrix-mx1-r1-2"]' }],
        },
        {
          name: 'matrix: clicking moves the selection in a row',
          props: { question: matrix, value: { r1: '1' } },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-matrix-mx1-r1-2"]' }],
        },
        {
          name: 'matrix: a value change selects another cell',
          props: { question: matrix, value: { r1: '1' } },
          interactions: [{ type: 'props', props: { value: { r1: '2', r2: '1' } } }],
        },
        {
          name: 'matrix: readOnly',
          props: { question: matrix, value: {}, readOnly: true },
          callbacks: ['onChange'],
          interactions: [{ type: 'click', selector: '[data-mol-id="survey-matrix-mx1-r2-1"]' }],
        },
        {
          name: 'submit with an answer reports the value',
          props: { question: { ...short, required: true }, value: 'hello' },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'click', selector: submitButton('s1') }],
        },
        {
          name: 'submit without an answer shows the required error',
          props: { question: { ...short, required: true }, value: '' },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'click', selector: submitButton('s1') }],
        },
        {
          name: 'the error clears on the next change',
          props: { question: { ...short, required: true } },
          callbacks: ['onChange', 'onSubmit'],
          interactions: [
            { type: 'click', selector: submitButton('s1') },
            { type: 'input', selector: '[data-mol-id="survey-input-s1"]', value: 'x' },
          ],
        },
        {
          name: 'a numeric zero counts as an answer',
          props: { question: { id: 'n1', kind: 'numeric', prompt: 'how many?', required: true } },
          callbacks: ['onSubmit'],
          interactions: [
            { type: 'props', props: { value: 0 } },
            { type: 'click', selector: submitButton('n1') },
          ],
        },
        {
          name: 'a false true/false answer counts as an answer',
          props: {
            question: { id: 'tf1', kind: 'true-false', prompt: 'Agree?', required: true },
            value: false,
          },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'click', selector: submitButton('tf1') }],
        },
        {
          name: 'an empty multi-choice answer fails the required check',
          props: { question: { ...multi, required: true }, value: [] },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'click', selector: submitButton('mm1') }],
        },
        {
          name: 'an empty matrix answer fails the required check',
          props: { question: { ...matrix, required: true }, value: {} },
          callbacks: ['onSubmit'],
          interactions: [{ type: 'click', selector: submitButton('mx1') }],
        },
        {
          name: 'no submit button without onSubmit',
          props: { question: short },
        },
        {
          name: 'readOnly hides the submit button',
          props: { question: short, readOnly: true },
          callbacks: ['onSubmit'],
        },
      ],
    },
  ],
}
