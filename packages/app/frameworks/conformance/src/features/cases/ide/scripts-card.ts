/**
 * `ScriptsCard` cases: the `/scripts` browser's every state — the listing
 * arriving after the loading state (and the shapes a reply may take), the rows
 * themselves (name, description, the per-script Run action), the search filter
 * and the pre-seeded query, the empty states, the "New script" creator (open,
 * cancel, the client-side validation failure, the POST that normalizes its
 * payload and reloads), a script run's lifecycle (plain runs, the captured
 * output in every shape, a param script's option form with its typed options,
 * the cancel and the seed-once values), the replaced `projectId` that
 * re-fetches, the unmount that leaves a late reply unapplied, and the chrome
 * (embedded, light theme, locale).
 *
 * Every scripted reply succeeds: a failing reply makes the React card log a
 * warning through its module-level logger, which the reference run refuses.
 *
 * @module
 */

import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'

import type { FeatureComponentCases } from '../../spec.js'

/**
 * The listing most cases share: a plain script, an enum option that is
 * required, a string option with a default beside an optional enum, and a
 * required string option on a script with no description.
 */
const SCRIPTS: ScriptInfo[] = [
  {
    name: 'run-tests',
    description: 'Run the unit tests',
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    name: 'setup-ci',
    description: 'Add a CI/CD workflow.',
    createdAt: '2026-06-02T00:00:00Z',
    builtin: true,
    params: [
      {
        name: 'platform',
        type: 'enum',
        description: 'Which CI',
        required: true,
        options: ['github', 'gitlab'],
      },
    ],
  },
  {
    name: 'deploy',
    description: 'Ship the current branch.',
    createdAt: '2026-06-03T00:00:00Z',
    params: [
      {
        name: 'env',
        type: 'string',
        description: 'Target environment',
        required: false,
        default: 'staging',
      },
      {
        name: 'region',
        type: 'enum',
        description: 'Region',
        required: false,
        options: ['eu', 'us'],
      },
    ],
  },
  {
    name: 'migrate',
    description: '',
    createdAt: '2026-06-04T00:00:00Z',
    params: [{ name: 'target', type: 'string', description: 'Target database', required: true }],
  },
]

/** The listing plus the script the save-reload case creates. */
const SCRIPTS_WITH_SHIP_IT: ScriptInfo[] = [
  ...SCRIPTS,
  { name: 'ship-it', description: 'Ship it.', createdAt: '2026-06-05T00:00:00Z' },
]

/** The `GET` that loads the listing of project `p1`. */
const P1_LIST = { method: 'GET', url: '/projects/p1/scripts' }

/**
 * The `POST` that runs one of project `p1`'s scripts.
 *
 * @param name - The script's name.
 * @returns The run route.
 */
const runOf = (name: string): { method: string; url: string } => ({
  method: 'POST',
  url: `/projects/p1/scripts/${encodeURIComponent(name)}/run`,
})

/** The props every case starts from; per-case fields follow. */
const listed = { projectId: 'p1', initialQuery: '', isLight: false } as const

/** `ScriptsCard`. */
export const scriptsCardCases: FeatureComponentCases = {
  component: 'ScriptsCard',
  cases: [
    // ── The listing ─────────────────────────────────────────────────────────
    {
      name: 'the rows arrive after the loading state',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS }, defer: true }] },
      interactions: [{ type: 'http', ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }],
    },
    {
      name: 'the listing renders names, descriptions and run actions',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
    },
    {
      name: 'a reply without a scripts array lists nothing',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: {} }] },
    },
    {
      name: 'no scripts yet, with the agent’s default name in the empty state',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: [] } }] },
    },
    {
      name: 'an agentName reaches the empty state',
      props: { ...listed, agentName: 'Alfred' },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: [] } }] },
    },

    // ── The filter ──────────────────────────────────────────────────────────
    {
      name: 'the search box filters rows as you type',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'input', selector: '[data-mol-id="scripts-search"]', value: 'ci' },
        { type: 'input', selector: '[data-mol-id="scripts-search"]', value: 'zzz' },
        { type: 'input', selector: '[data-mol-id="scripts-search"]', value: '   ' },
      ],
    },
    {
      name: 'a pre-seeded query opens the card filtered',
      props: { ...listed, initialQuery: 'deploy' },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
    },
    {
      name: 'a later initialQuery prop never reseeds the box',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'input', selector: '[data-mol-id="scripts-search"]', value: 'run' },
        { type: 'props', props: { initialQuery: 'migrate' } },
      ],
    },

    // ── The creator ─────────────────────────────────────────────────────────
    {
      name: 'the creator opens and cancels',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="scripts-new-toggle"]' },
        { type: 'click', selector: '[data-mol-id="scripts-cancel"]' },
      ],
    },
    {
      name: 'a save without a body is rejected without a request',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="scripts-new-toggle"]' },
        { type: 'input', selector: '[data-mol-id="scripts-new-name"]', value: 'Ship It!' },
        { type: 'click', selector: '[data-mol-id="scripts-save"]' },
      ],
    },
    {
      name: 'a valid save posts the normalized payload and reloads',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            method: 'POST',
            url: '/projects/p1/scripts',
            status: 200,
            data: { ok: true },
            defer: true,
          },
          {
            ...P1_LIST,
            status: 200,
            data: { scripts: SCRIPTS_WITH_SHIP_IT },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="scripts-new-toggle"]' },
        { type: 'input', selector: '[data-mol-id="scripts-new-name"]', value: 'Ship It!' },
        { type: 'input', selector: '[data-mol-id="scripts-new-description"]', value: ' Ship it. ' },
        {
          type: 'input',
          selector: '[data-mol-id="scripts-new-body"]',
          value: '#!/bin/sh\nnpm test\n\n',
        },
        { type: 'click', selector: '[data-mol-id="scripts-save"]' },
        { type: 'http', method: 'POST', url: '/projects/p1/scripts', status: 200, data: {} },
        { type: 'http', ...P1_LIST, status: 200, data: { scripts: SCRIPTS_WITH_SHIP_IT } },
      ],
    },

    // ── Runs ────────────────────────────────────────────────────────────────
    {
      name: 'a plain script runs on Run and reports its output',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('run-tests'),
            status: 200,
            data: { stdout: 'ok\n', stderr: '', exitCode: 0 },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-run-tests"]' },
        {
          type: 'http',
          ...runOf('run-tests'),
          status: 200,
          data: { stdout: 'ok', stderr: '', exitCode: 0 },
        },
      ],
    },
    {
      name: 'a failing run names its exit code and keeps the stderr',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('run-tests'),
            status: 200,
            data: { stdout: '', stderr: 'no such file\n', exitCode: 1 },
          },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-run-tests"]' }],
    },
    {
      name: 'a run with no output says so',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          { ...runOf('run-tests'), status: 200, data: { stdout: '', stderr: '', exitCode: 2 } },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-run-tests"]' }],
    },
    {
      name: 'stdout and stderr render together, a blank line between',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('run-tests'),
            status: 200,
            data: { stdout: 'built\n', stderr: 'warned\n', exitCode: 0 },
          },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-run-tests"]' }],
    },
    {
      name: 'a second run replaces the first one’s output',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('run-tests'),
            status: 200,
            data: { stdout: 'first\n', stderr: '', exitCode: 0 },
          },
          { ...runOf('run-tests'), status: 200, data: { stdout: '', stderr: '', exitCode: 3 } },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-run-tests"]' },
        { type: 'click', selector: '[data-mol-id="script-run-run-tests"]' },
      ],
    },

    // ── The option form ─────────────────────────────────────────────────────
    {
      name: 'a param script opens its option form on Run',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-setup-ci"]' }],
    },
    {
      name: 'the option form collects the enum and posts the params',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('setup-ci'),
            status: 200,
            data: { stdout: 'ci configured', stderr: '', exitCode: 0 },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-setup-ci"]' },
        {
          type: 'input',
          selector: '[data-mol-id="script-option-setup-ci-platform"]',
          value: 'github',
        },
        { type: 'click', selector: '[data-mol-id="script-options-run-setup-ci"]' },
        {
          type: 'http',
          ...runOf('setup-ci'),
          status: 200,
          data: { stdout: 'ci configured', stderr: '', exitCode: 0 },
        },
      ],
    },
    {
      name: 'the option form cancels without running',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-setup-ci"]' },
        { type: 'click', selector: '[data-mol-id="script-options-cancel-setup-ci"]' },
      ],
    },
    {
      name: 'a canceled form keeps its typed values when re-opened',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-setup-ci"]' },
        {
          type: 'input',
          selector: '[data-mol-id="script-option-setup-ci-platform"]',
          value: 'gitlab',
        },
        { type: 'click', selector: '[data-mol-id="script-options-cancel-setup-ci"]' },
        { type: 'click', selector: '[data-mol-id="script-run-setup-ci"]' },
      ],
    },
    {
      name: 'an optional enum offers a blank choice beside its options',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-deploy"]' }],
    },
    {
      name: 'typing into a required string option runs with every value',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('migrate'),
            status: 200,
            data: { stdout: 'migrated', stderr: '', exitCode: 0 },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-migrate"]' },
        {
          type: 'input',
          selector: '[data-mol-id="script-option-migrate-target"]',
          value: 'db@prod',
        },
        { type: 'click', selector: '[data-mol-id="script-options-run-migrate"]' },
        {
          type: 'http',
          ...runOf('migrate'),
          status: 200,
          data: { stdout: 'migrated', stderr: '', exitCode: 0 },
        },
      ],
    },

    // ── The project input ───────────────────────────────────────────────────
    {
      name: 'a replaced projectId re-fetches the list',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            method: 'GET',
            url: '/projects/p2/scripts',
            status: 200,
            data: {
              scripts: [{ name: 'p2-only', description: 'Only here.', createdAt: '' }],
            },
            defer: true,
          },
        ],
      },
      interactions: [
        { type: 'props', props: { projectId: 'p2' } },
        {
          type: 'http',
          method: 'GET',
          url: '/projects/p2/scripts',
          status: 200,
          data: { scripts: [{ name: 'p2-only', description: 'Only here.', createdAt: '' }] },
        },
      ],
    },
    {
      name: 'an unmount leaves the late reply unapplied',
      props: { ...listed },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS }, defer: true }] },
      interactions: [
        { type: 'unmount' },
        { type: 'http', ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
      ],
    },

    // ── Chrome ──────────────────────────────────────────────────────────────
    {
      name: 'embedded drops the heading and the card chrome',
      props: { ...listed, embedded: true },
      context: { http: [{ ...P1_LIST, status: 200, data: { scripts: SCRIPTS } }] },
    },
    {
      name: 'the light theme swaps the row borders and the field inset',
      props: { ...listed, isLight: true },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          { ...runOf('run-tests'), status: 200, data: { stdout: 'ok', stderr: '', exitCode: 0 } },
        ],
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="script-run-run-tests"]' }],
    },
    {
      name: 'a locale switch re-renders every label through i18n',
      props: { ...listed },
      context: {
        http: [
          { ...P1_LIST, status: 200, data: { scripts: SCRIPTS } },
          {
            ...runOf('run-tests'),
            status: 200,
            data: { stdout: 'built\n', stderr: '', exitCode: 0 },
          },
        ],
        translations: {
          en: {
            ide: {
              chat: {
                scripts: {
                  heading: 'Scripts',
                  new: 'New script',
                  searchPlaceholder: 'Filter scripts…',
                  run: 'Run',
                  exitOk: 'Exited 0',
                },
              },
            },
          },
          fr: {
            ide: {
              chat: {
                scripts: {
                  heading: 'Scripts (fr)',
                  new: 'Nouveau script',
                  searchPlaceholder: 'Filtrer les scripts…',
                  run: 'Lancer',
                  exitOk: 'Terminé 0',
                },
              },
            },
          },
        },
      },
      interactions: [
        { type: 'click', selector: '[data-mol-id="script-run-run-tests"]' },
        { type: 'locale', locale: 'fr' },
      ],
    },
  ],
}
