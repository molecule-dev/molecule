/**
 * `ChatPanel` cases: /run saved scripts. Every case name starts with `run scripts: `.
 *
 * Typing `/run <name> [--flag value …]` and Enter resolves `name` against the
 * project's saved scripts (`GET /projects/:id/scripts` — exact, then unique
 * prefix, then unique substring, ignoring case and a `.sh` suffix) and answers
 * in the timeline as a local system card:
 *
 * - A found script without unsatisfied required options runs at once
 *   (`POST /projects/:id/scripts/:name/run`, the command-line flags as its
 *   `params` body, none when no flag was typed) and the card reports the
 *   script's exit status with the captured stdout and stderr.
 * - A required option the command line did not supply — and no default stands
 *   in for — opens the /scripts browser filtered to that script instead of
 *   running, so the user fills the option in there.
 * - No match reports the scripts that do exist; none at all points at /scripts.
 * - A failed listing or run reports that the script could not be run.
 *
 * @module
 */

import type { ScriptInfo } from '@molecule/app-ide-panel-logic/panels'

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { base, key, type } from './fixtures.js'

/** Types a composer command and sends it the way Enter does. */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** A saved script with no options. */
const RUN_TESTS: ScriptInfo = {
  name: 'run-tests',
  description: 'Run the unit tests',
  createdAt: '2026-06-01T00:00:00Z',
}

/** A second plain script, so partial and ambiguous names have a neighbor. */
const RUN_LINT: ScriptInfo = {
  name: 'run-lint',
  description: 'Lint the source',
  createdAt: '2026-06-02T00:00:00Z',
}

/** A script whose required `env` option has a default and whose `region` is optional. */
const DEPLOY: ScriptInfo = {
  name: 'deploy',
  description: 'Ship the current branch.',
  createdAt: '2026-06-03T00:00:00Z',
  params: [
    {
      name: 'env',
      type: 'string',
      description: 'Target environment',
      required: true,
      default: 'staging',
    },
    { name: 'region', type: 'enum', description: 'Region', required: false, options: ['eu', 'us'] },
  ],
}

/** A script whose required `target` option has no default. */
const MIGRATE: ScriptInfo = {
  name: 'migrate',
  description: 'Migrate the database.',
  createdAt: '2026-06-04T00:00:00Z',
  params: [{ name: 'target', type: 'string', description: 'Target database', required: true }],
}

/** A third plain script, so a partial name has a unique match to find. */
const BUILD_APP: ScriptInfo = {
  name: 'build-app',
  description: 'Build the app',
  createdAt: '2026-06-05T00:00:00Z',
}

/**
 * The `GET` that lists project `p1`'s saved scripts.
 *
 * @param scripts - The listing it answers with.
 * @returns The scripted request.
 */
const LIST = (scripts: ScriptInfo[]): HttpScript => ({
  method: 'GET',
  url: '/projects/p1/scripts',
  data: { scripts },
})

/**
 * The `POST` that runs one of project `p1`'s scripts, answering with what the run captured.
 *
 * @param name - The script's name (the route carries it encoded).
 * @param stdout - The captured standard output.
 * @param stderr - The captured standard error.
 * @param exitCode - The process exit code.
 * @returns The scripted request.
 */
const RUN = (name: string, stdout: string, stderr: string, exitCode: number): HttpScript => ({
  method: 'POST',
  url: `/projects/p1/scripts/${encodeURIComponent(name)}/run`,
  data: { stdout, stderr, exitCode },
})

/** The three plain scripts most matches resolve against. */
const PLAIN_LISTING = [RUN_TESTS, BUILD_APP, MIGRATE]

/** /run saved scripts. */
export const runScriptsCases: FeatureCase[] = [
  // ── A found script runs ─────────────────────────────────────────────────────
  base(
    'run scripts: /run runs the named script and reports its output and exit status',
    [...run('/run run-tests')],
    {
      http: [LIST(PLAIN_LISTING), RUN('run-tests', '13 passed, 0 failed\n', '', 0)],
    },
  ),
  base(
    'run scripts: a failing exit code is reported with the script name',
    [...run('/run run-tests')],
    {
      http: [LIST(PLAIN_LISTING), RUN('run-tests', '2 of 13 failed', '', 2)],
    },
  ),
  base('run scripts: stderr is reported under stdout', [...run('/run deploy')], {
    http: [LIST([DEPLOY]), RUN('deploy', 'shipped 3 services', 'region eu is read-only', 0)],
  }),
  base(
    'run scripts: a run with no output reports just the exit status',
    [...run('/run run-tests')],
    {
      http: [LIST(PLAIN_LISTING), RUN('run-tests', '', '', 0)],
    },
  ),

  // ── Resolving the name ──────────────────────────────────────────────────────
  base('run scripts: an unknown name reports the scripts that exist', [...run('/run ship-it')], {
    http: [LIST(PLAIN_LISTING)],
  }),
  base('run scripts: no saved scripts yet points at /scripts', [...run('/run run-tests')], {
    http: [LIST([])],
  }),
  base(
    'run scripts: a listing without a scripts array reads as no scripts',
    [...run('/run run-tests')],
    {
      http: [{ method: 'GET', url: '/projects/p1/scripts', data: {} }],
    },
  ),
  base('run scripts: a name several scripts share resolves to nothing', [...run('/run run')], {
    http: [LIST([RUN_TESTS, RUN_LINT])],
  }),
  base('run scripts: a partial name runs the one script it matches', [...run('/run tests')], {
    http: [LIST([RUN_TESTS, BUILD_APP]), RUN('run-tests', 'all green', '', 0)],
  }),
  base(
    'run scripts: a name with other casing or a .sh suffix still runs the script',
    [...run('/run Run-Tests.SH')],
    {
      http: [LIST(PLAIN_LISTING), RUN('run-tests', 'all green', '', 0)],
    },
  ),

  // ── The options a run needs ─────────────────────────────────────────────────
  base(
    'run scripts: a script with a required option opens /scripts to collect it',
    [...run('/run migrate')],
    {
      // The second listing answers the /scripts browser the panel opens.
      http: [LIST([MIGRATE, DEPLOY]), LIST([MIGRATE, DEPLOY])],
    },
  ),
  base(
    'run scripts: flags typed after the name become the run options',
    [...run('/run deploy --env prod')],
    {
      http: [LIST([DEPLOY]), RUN('deploy', 'shipped to prod', '', 0)],
    },
  ),
  base(
    'run scripts: a quoted flag value keeps its spaces',
    [...run('/run deploy --env "production eu"')],
    {
      http: [LIST([DEPLOY]), RUN('deploy', 'shipped', '', 0)],
    },
  ),
  base(
    'run scripts: a required option default stands in when no flag supplies one',
    [...run('/run deploy')],
    {
      http: [LIST([DEPLOY]), RUN('deploy', 'shipped to staging', '', 0)],
    },
  ),

  // ── The failure paths ───────────────────────────────────────────────────────
  base(
    'run scripts: a failed run request reports the script could not be run',
    [...run('/run run-tests')],
    {
      http: [
        LIST(PLAIN_LISTING),
        { method: 'POST', url: '/projects/p1/scripts/run-tests/run', status: 500 },
      ],
    },
  ),
  base(
    'run scripts: a failed script listing reports the script could not be run',
    [...run('/run run-tests')],
    {
      http: [{ method: 'GET', url: '/projects/p1/scripts', status: 500 }],
    },
  ),
]
