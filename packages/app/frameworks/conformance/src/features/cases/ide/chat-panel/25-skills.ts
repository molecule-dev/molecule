/**
 * `ChatPanel` cases: the skills area. Every case name starts with `skills: `.
 *
 * The proactive "Relevant skill" suggestion, the `/skills` browser and the
 * per-project default-loaded skill set:
 *
 * - The mount-time seed reads the project's skill files once (a `files-list`
 *   GET, then each `SKILL.md`) and, with no explicit saved set, marks every
 *   discovered skill default. An empty answer is retried (1.5 s, bounded), and
 *   a default toggle clicked before the seed resolves persists nothing.
 * - A row's star toggles its membership in the persisted default set
 *   (`PATCH /projects/:id` carrying `settings.defaultSkills`): off from the
 *   implicit all-default base persists every OTHER skill, back in re-adds it,
 *   and a failed save rolls the badge back. The first explicit set surfaces
 *   the header's "Load all by default" reset, which persists `null` (or rolls
 *   back on a failure).
 * - "Load" (the row button, or the skill name itself) opens the skill in the
 *   editor through `onFileOpen`, confirms with a "Loaded <name> skill" card,
 *   and hides the button behind a "Loaded" pill.
 * - The suggestion fires above the composer when a user message matches a
 *   skill the defaults do not already supply: its Load opens and loads it,
 *   its name opens it without loading it, Dismiss keeps it dismissed for later
 *   messages, a skill the defaults already supply is never suggested, and
 *   attaching the suggested skill as a mention retires the suggestion while
 *   the chip is on (a send clears the chips, so the exclusion shows before one).
 * - The browser itself: `/skills` opens the closeable overlay (a query after
 *   the command pre-filters its search), the search filters rows and reports
 *   when nothing matches, a load that keeps coming back empty shows the
 *   waiting state while a load that keeps failing reports an error, the
 *   "New skill" form writes the starter `SKILL.md` (an empty name keeps Create
 *   disabled, a failed write reports it and keeps the form open, Cancel closes
 *   it without writing), and the server's "Loaded N skills" notice opens the
 *   browser on click.
 *
 * @module
 */

import type { HttpScript } from '../../../../bindings/spec.js'
import type { Interaction } from '../../../../ui/spec.js'
import type { FeatureCase } from '../../../spec.js'
import { adv, base, click, DONE, emit, finish, key, NOW, SEND, type } from './fixtures.js'

/** The project-relative path of the first scaffolded skill. */
const AUTH = '.agents/skills/auth/SKILL.md'
/** The project-relative path of the second scaffolded skill. */
const DEPLOY = '.agents/skills/deploy/SKILL.md'
/** The scaffolded skills the files-list answers with, in list order. */
const SKILL_PATHS = [AUTH, DEPLOY]

/**
 * One skill file's contents, as a `GET /projects/:id/files/:path` answer: frontmatter with a
 * name and a description, so discovery parses that name (the rows, badges and toggles key on
 * it) and the suggestion pass matches the description's words.
 *
 * @param path - The skill's project-relative path.
 * @param name - Its frontmatter name.
 * @param description - Its frontmatter description.
 * @returns The scripted request.
 */
const skillBody = (path: string, name: string, description: string): HttpScript => ({
  method: 'GET',
  url: `/projects/p1/files/${path}`,
  data: {
    content: ['---', `name: ${name}`, `description: ${description}`, '---', '', `# ${name}`].join(
      '\n',
    ),
  },
})

/** Both skill files' contents, as one loader reads them. */
const SKILL_BODIES = [
  skillBody(AUTH, 'auth', 'The auth guard flow.'),
  skillBody(DEPLOY, 'deploy', 'The deploy checklist.'),
]

/**
 * A `files-list` answer listing both skills.
 *
 * @returns The scripted request.
 */
const SKILL_LIST = (): HttpScript => ({
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files: SKILL_PATHS },
})

/** A `files-list` answer with no files at all (the sandbox has not scaffolded skills yet). */
const EMPTY_LIST: HttpScript = {
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files: [] },
}

/** The same list, held pending until the case's `http` step answers it. */
const DEFERRED_SKILL_LIST: HttpScript = { ...SKILL_LIST(), defer: true }

/** What a mount reads when the seed lands at once: the list, then each skill file. */
const SEEDED_MOUNT = [SKILL_LIST(), ...SKILL_BODIES]

/** What a mount plus an opened browser read together: the panel's seed, then the browser's own load. */
const SEEDED_MOUNT_AND_BROWSER = [...SEEDED_MOUNT, SKILL_LIST(), ...SKILL_BODIES]

/** A settings PATCH the panel's default-set save or reset needs to succeed. */
const PATCH_OK: HttpScript = { method: 'PATCH', url: '/projects/p1', data: {} }

/** A settings PATCH that fails, rolling the optimistic default-set change back. */
const PATCH_FAIL: HttpScript = { method: 'PATCH', url: '/projects/p1', status: 500 }

/** The `PUT` that writes a new skill's starter `SKILL.md` under its slug. */
const CREATE_OK: HttpScript = {
  method: 'PUT',
  url: '/projects/p1/files/.agents/skills/deploy-notes/SKILL.md',
  data: {},
}

/** The same write, refusing. */
const CREATE_FAIL: HttpScript = {
  method: 'PUT',
  url: '/projects/p1/files/.agents/skills/deploy-notes/SKILL.md',
  status: 500,
}

/** The star toggle (the default-set membership) of a skill row. */
const STAR = (name: string): string => `[data-mol-id="skill-default-${name}"]`

/** A skill row's Load button (hidden while the skill is already loaded or default). */
const LOAD = (name: string): string => `[data-mol-id="skill-load-${name}"]`

/** The browser overlay's ✕. */
const CLOSE = '[data-mol-id="panel-overlay-close"]'
/** The browser's search box. */
const SKILLS_SEARCH = '[data-mol-id="skills-search"]'
/** The header's New skill button. */
const NEW_SKILL = '[data-mol-id="skill-new"]'
/** The create form's name field, Cancel and Create. */
const CREATE_NAME = '[data-mol-id="skill-create-name"]'
const CREATE_CANCEL = '[data-mol-id="skill-create-cancel"]'
const CREATE_SUBMIT = '[data-mol-id="skill-create-submit"]'
/** The header's "Load all by default" reset (only when the set is explicit). */
const RESET = '[data-mol-id="skill-reset-defaults"]'
/** The proactive suggestion's Load, dismiss and name controls. */
const RELEVANT_LOAD = '[data-mol-id="relevant-skill-load"]'
const RELEVANT_DISMISS = '[data-mol-id="relevant-skill-dismiss"]'
const RELEVANT_NAME = '[data-mol-id="relevant-skill-name"]'
/** The server's "Loaded N skills" notice in the timeline. */
const SKILLS_LOADED_NOTICE = '[data-mol-id="chat-skills-loaded"]'
/** The @ picker's rows (the hidden attachment input precedes its popup). */
const PICKER_ROW = 'input[type="file"] ~ div button'

/** The user message the suggestion cases match the auth skill's name with. */
const AUTH_MESSAGE = 'How do I add auth to my app?'

/**
 * Types a slash command and runs it the way Enter does (the command menu's
 * highlighted row, or the raw text when the space closed the menu).
 *
 * @param command - The composer text.
 * @returns The steps.
 */
const run = (command: string): Interaction[] => [type(command), key('Enter')]

/** Opens the `/skills` browser. */
const openBrowser = (): Interaction[] => [...run('/skills')]

/**
 * Types into a field of the browser (its search box or the create form's name).
 *
 * @param selector - The field.
 * @param value - Its new value.
 * @returns The step.
 */
const fill = (selector: string, value: string): Interaction => ({
  type: 'input',
  selector,
  value,
})

/**
 * Answers the panel's deferred seed request with the skill list.
 *
 * @returns The step.
 */
const answerSeed = (): Interaction => ({
  type: 'http',
  method: 'GET',
  url: '/projects/p1/files-list',
  data: { files: SKILL_PATHS },
})

/**
 * The server's skills-loaded card, as the turn's stream announces it: the
 * timeline renders it as the clickable "🧠 Loaded 3 skills" notice.
 */
const SKILLS_LOADED_CARD = {
  type: 'card',
  id: 'card-skills-1',
  timestamp: NOW + 2,
  card: { kind: 'skills', count: 3 },
}

/**
 * Toggles auth off from the implicit all-default set and closes the browser,
 * the setup every suggestion case starts from (auth becomes the one skill a
 * matching message can be offered).
 *
 * @returns The steps.
 */
const unloadAuth = (): Interaction[] => [...openBrowser(), click(STAR('auth')), click(CLOSE)]

/** Skills suggestion and default skills. */
export const skillsCases: FeatureCase[] = [
  // ── The mount-time seed and the default set it starts from ─────────────────
  base(
    'skills: a seeded project marks every discovered skill default in the browser',
    [...openBrowser()],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),
  base(
    'skills: an empty first seed retries and then marks every skill default',
    [...openBrowser(), adv(1_500)],
    {
      // The panel's first read comes back empty (the sandbox is not serving
      // .agents yet); the browser's own load finds the files; the 1.5 s retry
      // finally seeds the panel and every star fills.
      http: [EMPTY_LIST, SKILL_LIST(), ...SKILL_BODIES, SKILL_LIST(), ...SKILL_BODIES],
    },
  ),
  base(
    'skills: a default toggle before the seed resolves persists nothing',
    [...openBrowser(), click(STAR('auth')), answerSeed()],
    {
      // The panel's seed is held back: the browser renders its own rows with no
      // Default badges, the click lands on nothing, and the late seed still fills
      // every star without the click having persisted a set.
      http: [DEFERRED_SKILL_LIST, SKILL_LIST(), ...SKILL_BODIES, ...SKILL_BODIES],
    },
  ),

  // ── Toggling the default set ───────────────────────────────────────────────
  base(
    'skills: toggling a default off persists the remaining skills and lifts its badge',
    [...openBrowser(), click(STAR('auth'))],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: a skill starred back in joins the persisted default set again',
    [...openBrowser(), click(STAR('auth')), click(STAR('auth'))],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK, PATCH_OK],
    },
  ),
  base(
    'skills: a failed default-set save leaves the badge and the reset untouched',
    [...openBrowser(), click(STAR('auth'))],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_FAIL],
    },
  ),
  base(
    'skills: Load all by default resets the explicit set and persists unset',
    [...openBrowser(), click(STAR('auth')), click(RESET)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK, PATCH_OK],
    },
  ),
  base(
    'skills: a failed reset keeps the explicit default set',
    [...openBrowser(), click(STAR('auth')), click(RESET)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK, PATCH_FAIL],
    },
  ),

  // ── Loading a skill from the browser ───────────────────────────────────────
  base(
    'skills: loading a skill from the browser opens it and marks it loaded',
    [...openBrowser(), click(STAR('auth')), click(LOAD('auth'))],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: clicking a skill name in the browser opens it as well',
    [...openBrowser(), click('[data-mol-id="skill-open-deploy"]')],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),

  // ── The browser: command entry, search, and its loading states ─────────────
  base('skills: /skills with a query opens the browser pre-filtered', [...run('/skills deploy')], {
    http: SEEDED_MOUNT_AND_BROWSER,
  }),
  base(
    'skills: the browser filters rows as you type and reports when nothing matches',
    [...openBrowser(), fill(SKILLS_SEARCH, 'deploy'), fill(SKILLS_SEARCH, 'zzz')],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),
  base(
    'skills: the browser waits for the sandbox while no skill files exist yet',
    [...openBrowser(), adv(2_000), adv(2_000)],
    {
      http: [...SEEDED_MOUNT, EMPTY_LIST, EMPTY_LIST, EMPTY_LIST],
    },
  ),
  base(
    'skills: a browser load that keeps failing reports it could not load skills',
    [
      ...openBrowser(),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
      adv(2_000),
    ],
    {
      http: [...SEEDED_MOUNT, { method: 'GET', url: '/projects/p1/files-list', status: 500 }],
    },
  ),
  base(
    'skills: /skills opens the browser overlay and its close button closes it',
    [...openBrowser(), click(CLOSE)],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),
  base(
    'skills: the default and loaded sets survive closing and reopening the browser',
    [...openBrowser(), click(STAR('auth')), click(CLOSE), ...openBrowser()],
    {
      // The sets live in the panel, not the card: the reopened browser re-fetches
      // its rows but renders the toggled-off default and the explicit-set reset.
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK, SKILL_LIST(), ...SKILL_BODIES],
    },
  ),
  base(
    'skills: the server-loaded skills notice opens the browser on click',
    [
      type('Build the app'),
      click(SEND),
      emit(SKILLS_LOADED_CARD),
      emit(DONE),
      finish,
      click(SKILLS_LOADED_NOTICE),
    ],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),

  // ── Creating a skill ───────────────────────────────────────────────────────
  base(
    'skills: creating a skill writes its starter file, opens it and lists it',
    [...openBrowser(), click(NEW_SKILL), fill(CREATE_NAME, 'Deploy Notes'), click(CREATE_SUBMIT)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, CREATE_OK],
    },
  ),
  base(
    'skills: a failed skill write reports it and keeps the form open',
    [...openBrowser(), click(NEW_SKILL), fill(CREATE_NAME, 'Deploy Notes'), click(CREATE_SUBMIT)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, CREATE_FAIL],
    },
  ),
  base(
    'skills: an empty name keeps Create disabled and writes nothing',
    [...openBrowser(), click(NEW_SKILL), click(CREATE_SUBMIT)],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),
  base(
    'skills: cancelling the new-skill form closes it without writing a file',
    [...openBrowser(), click(NEW_SKILL), fill(CREATE_NAME, 'Deploy Notes'), click(CREATE_CANCEL)],
    {
      http: SEEDED_MOUNT_AND_BROWSER,
    },
  ),

  // ── The proactive "Relevant skill" suggestion ──────────────────────────────
  base(
    'skills: a message matching an unloaded skill suggests it above the composer',
    [...unloadAuth(), type(AUTH_MESSAGE), click(SEND)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: loading the suggested skill stops it being suggested again',
    [
      ...unloadAuth(),
      type(AUTH_MESSAGE),
      click(SEND),
      click(RELEVANT_LOAD),
      emit(DONE),
      finish,
      type(AUTH_MESSAGE),
      click(SEND),
    ],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: dismissing the suggestion keeps it dismissed on later messages',
    [
      ...unloadAuth(),
      type(AUTH_MESSAGE),
      click(SEND),
      click(RELEVANT_DISMISS),
      emit(DONE),
      finish,
      type(AUTH_MESSAGE),
      click(SEND),
    ],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: clicking the suggested skill opens it without marking it loaded',
    [...unloadAuth(), type(AUTH_MESSAGE), click(SEND), click(RELEVANT_NAME)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK],
    },
  ),
  base(
    'skills: a skill the default set already supplies is never suggested',
    [type(AUTH_MESSAGE), click(SEND)],
    {
      http: SEEDED_MOUNT,
    },
  ),
  base(
    'skills: attaching the suggested skill as a mention retires the suggestion',
    [...unloadAuth(), type(AUTH_MESSAGE), click(SEND), type('@au'), click(PICKER_ROW)],
    {
      http: [...SEEDED_MOUNT_AND_BROWSER, PATCH_OK, SKILL_LIST()],
    },
  ),
]
