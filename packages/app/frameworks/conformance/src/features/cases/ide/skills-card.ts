/**
 * `SkillsCard` cases: the `/skills` browser's every state — the discovered
 * listing (names, descriptions, the path fallback for an unreadable file),
 * the loading and waiting replies (the card's failure branch logs a warning,
 * which a recording may not carry, so no case drives it), the search filter with its
 * no-match state, the default-loaded set (the badge, the star toggle, the
 * Loaded pill that hides the Load button), the "Load all by default" reset,
 * the skill-authoring create form (opened by the button, by `startCreating`,
 * submitted, cancelled, and left open by a null reply), and the card chrome
 * (embedded, theme, locale, a replaced project, an unmount dropping a late
 * reply).
 *
 * The card discovers its skills itself over the SAME file-list /
 * file-content API the chat's `@`-mentions use, so every listing state is
 * scripted through `context.http`, and the bounded retry behind the
 * "waiting for the sandbox" state moves on `fakeTimers` advances.
 *
 * @module
 */

import type { FeatureComponentCases } from '../../spec.js'

/** The `GET` that loads project `p1`'s file list. */
const P1_LIST = { method: 'GET', url: '/projects/p1/files-list' }

/** The `GET` that reads one skill file of project `p1`. */
const content = (path: string): { method: string; url: string } => ({
  method: 'GET',
  url: `/projects/p1/files/${path}`,
})

/** The `GET` that loads project `p2`'s file list. */
const P2_LIST = { method: 'GET', url: '/projects/p2/files-list' }

/** An OK reply carrying `data`. */
const ok = (data: unknown): { status: number; data: unknown } => ({ status: 200, data })

/** Project `p1`'s skill file paths. */
const AUTH_PATH = '.agents/skills/auth/SKILL.md'
const CACHING_PATH = '.agents/skills/Caching/SKILL.md'
const BARE_PATH = '.agents/skills/bare/SKILL.md'

/** Project `p2`'s one skill file. */
const OTHER_PATH = '.agents/skills/other/SKILL.md'

/** The `SKILL.md` bodies, with the frontmatter the parser reads. */
const AUTH_CONTENT = [
  '---',
  'name: auth',
  'description: Authentication, login, OAuth and sessions.',
  '---',
  '',
  '# auth',
].join('\n')
const CACHING_CONTENT = [
  '---',
  'name: Caching',
  'description: When and how to cache.',
  '---',
  '',
  '# Caching',
].join('\n')
const BARE_CONTENT = ['---', 'name: bare', '---', '', '# bare'].join('\n')
const OTHER_CONTENT = [
  '---',
  'name: other',
  'description: The other project’s own skill.',
  '---',
  '',
  '# other',
].join('\n')

/**
 * The discovery replies for the given paths: the file list followed by one
 * content read per path.
 *
 * @param projectId - The project the replies belong to.
 * @param paths - The skill file paths the list announces.
 * @param bodies - The `SKILL.md` body per path.
 * @returns The `context.http` script.
 */
function listing(
  projectId: string,
  paths: string[],
  bodies: Record<string, string>,
): { method: string; url: string; status: number; data: unknown }[] {
  const prefix = projectId === 'p1' ? P1_LIST : P2_LIST
  return [
    { ...prefix, ...ok({ files: paths }) },
    ...paths.map((path) => ({ ...content(path), ...ok({ content: bodies[path] ?? '' }) })),
  ]
}

/** The props every case starts from; per-case fields follow. */
const base = { projectId: 'p1', initialQuery: '', isLight: false } as const

/** `SkillsCard`. */
export const skillsCardCases: FeatureComponentCases = {
  component: 'SkillsCard',
  cases: [
    // ── The listing ─────────────────────────────────────────────────────────
    {
      name: 'the listing arrives with names, descriptions and open actions',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
    },
    {
      name: 'a skill without a description renders its row without one',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, BARE_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [BARE_PATH]: BARE_CONTENT,
        }),
      },
    },
    {
      name: 'a skill whose file cannot be read lists its path',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: [
          { ...P1_LIST, ...ok({ files: [AUTH_PATH, BARE_PATH] }) },
          { ...content(AUTH_PATH), ...ok({ content: AUTH_CONTENT }) },
          { ...content(BARE_PATH), networkError: 'the sandbox went away' },
        ],
      },
    },

    // ── The discovery states ────────────────────────────────────────────────
    {
      name: 'the reply lands after the loading state',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: [
          { ...P1_LIST, defer: true, ...ok({ files: [AUTH_PATH] }) },
          { ...content(AUTH_PATH), ...ok({ content: AUTH_CONTENT }) },
        ],
      },
      interactions: [{ type: 'http', ...P1_LIST, status: 200, data: { files: [AUTH_PATH] } }],
    },
    {
      name: 'an empty listing keeps waiting for the sandbox through its retries',
      props: { ...base },
      callbacks: ['onLoad'],
      fakeTimers: true,
      context: {
        http: Array.from({ length: 10 }, () => ({ ...P1_LIST, ...ok({ files: [] }) })),
      },
      interactions: [
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
        { type: 'advance', ms: 2000 },
      ],
    },
    {
      name: 'a reply during the waiting window promotes the card to ready',
      props: { ...base },
      callbacks: ['onLoad'],
      fakeTimers: true,
      context: {
        http: [
          { ...P1_LIST, ...ok({ files: [] }) },
          { ...P1_LIST, defer: true, ...ok({ files: [AUTH_PATH] }) },
          { ...content(AUTH_PATH), ...ok({ content: AUTH_CONTENT }) },
        ],
      },
      interactions: [
        { type: 'advance', ms: 2000 },
        { type: 'http', ...P1_LIST, status: 200, data: { files: [AUTH_PATH] } },
      ],
    },
    {
      name: 'an unmount leaves the late reply unapplied',
      props: { ...base },
      callbacks: ['onLoad'],
      context: { http: [{ ...P1_LIST, defer: true, ...ok({ files: [AUTH_PATH] }) }] },
      interactions: [
        { type: 'unmount' },
        { type: 'http', ...P1_LIST, status: 200, data: { files: [AUTH_PATH] } },
      ],
    },
    {
      name: 'a replaced projectId re-reads the list',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: [
          ...listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }),
          { ...P2_LIST, defer: true, ...ok({ files: [OTHER_PATH] }) },
          {
            method: 'GET',
            url: `/projects/p2/files/${OTHER_PATH}`,
            ...ok({ content: OTHER_CONTENT }),
          },
        ],
      },
      interactions: [
        { type: 'props', props: { projectId: 'p2' } },
        { type: 'http', ...P2_LIST, status: 200, data: { files: [OTHER_PATH] } },
      ],
    },

    // ── Opening and loading ─────────────────────────────────────────────────
    {
      name: 'clicking the name opens the skill',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="skill-open-auth"]' }],
    },
    {
      name: 'Load loads a not-yet-loaded skill',
      props: { ...base },
      callbacks: ['onLoad'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [{ type: 'click', selector: '[data-mol-id="skill-load-auth"]' }],
    },

    // ── The default-loaded set ──────────────────────────────────────────────
    {
      name: 'defaults show their badge, their filled star, and no Load',
      props: {
        ...base,
        defaultSkillPaths: new Set([AUTH_PATH]),
        loadedSkillPaths: new Set([CACHING_PATH]),
      },
      callbacks: ['onLoad', 'onToggleDefault'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
    },
    {
      name: 'a loaded skill hides its Load and shows the Loaded pill with a hollow star',
      props: { ...base, loadedSkillPaths: new Set([AUTH_PATH]) },
      callbacks: ['onLoad', 'onToggleDefault'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },
    {
      name: 'the star toggles membership in the default set',
      props: { ...base, defaultSkillPaths: new Set([AUTH_PATH]) },
      callbacks: ['onLoad', 'onToggleDefault'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
      interactions: [{ type: 'click', selector: '[data-mol-id="skill-default-Caching"]' }],
    },

    // ── The reset affordance ────────────────────────────────────────────────
    {
      name: 'an explicit default set offers the reset, and the reset calls back',
      props: { ...base, defaultsExplicit: true },
      callbacks: ['onLoad', 'onToggleDefault', 'onResetDefault'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [{ type: 'click', selector: '[data-mol-id="skill-reset-defaults"]' }],
    },
    {
      name: 'an implicit default set hides the reset',
      props: { ...base, defaultsExplicit: false },
      callbacks: ['onLoad', 'onToggleDefault', 'onResetDefault'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },
    {
      name: 'no reset callback hides the reset whatever the set says',
      props: { ...base, defaultsExplicit: true },
      callbacks: ['onLoad', 'onToggleDefault'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },

    // ── The search filter ───────────────────────────────────────────────────
    {
      name: 'typing filters the rows by name, description and path',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
      interactions: [
        { type: 'input', selector: '[data-mol-id="skills-search"]', value: 'caching' },
        { type: 'input', selector: '[data-mol-id="skills-search"]', value: 'oauth' },
        { type: 'input', selector: '[data-mol-id="skills-search"]', value: 'skills/Caching' },
      ],
    },
    {
      name: 'a query that matches nothing says so; a blank one matches everything again',
      props: { ...base },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
      interactions: [
        { type: 'input', selector: '[data-mol-id="skills-search"]', value: 'zzzz' },
        { type: 'input', selector: '[data-mol-id="skills-search"]', value: '   ' },
      ],
    },
    {
      name: 'initialQuery seeds the filter, and a later one never reseeds it',
      props: { ...base, initialQuery: 'auth' },
      callbacks: ['onLoad'],
      context: {
        http: listing('p1', [AUTH_PATH, CACHING_PATH], {
          [AUTH_PATH]: AUTH_CONTENT,
          [CACHING_PATH]: CACHING_CONTENT,
        }),
      },
      interactions: [{ type: 'props', props: { initialQuery: 'Caching' } }],
    },

    // ── Skill authoring ─────────────────────────────────────────────────────
    {
      name: 'New skill opens the create form, and Cancel closes it',
      props: { ...base },
      callbacks: ['onLoad', 'onCreate'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [
        { type: 'click', selector: '[data-mol-id="skill-new"]' },
        { type: 'input', selector: '[data-mol-id="skill-create-name"]', value: 'Docs' },
        { type: 'click', selector: '[data-mol-id="skill-create-cancel"]' },
      ],
    },
    {
      name: 'Create hands the trimmed name to onCreate and lists the new skill',
      props: { ...base },
      callbacks: ['onLoad', 'onCreate'],
      callbackResults: {
        onCreate: {
          resolve: {
            path: '.agents/skills/caching/SKILL.md',
            name: 'Caching',
            description: 'When and how to cache.',
          },
        },
      },
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [
        { type: 'click', selector: '[data-mol-id="skill-new"]' },
        { type: 'input', selector: '[data-mol-id="skill-create-name"]', value: '  Caching  ' },
        { type: 'submit', selector: '[data-mol-id="skill-create-form"]' },
      ],
    },
    {
      name: 'the submit stays disabled until a name is typed',
      props: { ...base },
      callbacks: ['onLoad', 'onCreate'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [{ type: 'click', selector: '[data-mol-id="skill-new"]' }],
    },
    {
      name: 'a null reply from onCreate keeps the form open with the name',
      props: { ...base },
      callbacks: ['onLoad', 'onCreate'],
      callbackResults: { onCreate: { resolve: null } },
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
      interactions: [
        { type: 'click', selector: '[data-mol-id="skill-new"]' },
        { type: 'input', selector: '[data-mol-id="skill-create-name"]', value: 'Docs' },
        { type: 'click', selector: '[data-mol-id="skill-create-submit"]' },
      ],
    },
    {
      name: 'startCreating opens the form straight away',
      props: { ...base, startCreating: true },
      callbacks: ['onLoad', 'onCreate'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },
    {
      name: 'without onCreate there is no New skill and no form',
      props: { ...base },
      callbacks: ['onLoad'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },

    // ── Chrome ──────────────────────────────────────────────────────────────
    {
      name: 'embedded drops the heading and the card chrome',
      props: { ...base, embedded: true },
      callbacks: ['onLoad'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },
    {
      name: 'the light theme swaps the borders and field inset',
      props: { ...base, isLight: true },
      callbacks: ['onLoad'],
      context: { http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }) },
    },
    {
      name: 'a locale switch re-renders every label',
      props: { ...base, defaultsExplicit: true },
      callbacks: ['onLoad', 'onCreate', 'onToggleDefault', 'onResetDefault'],
      context: {
        http: listing('p1', [AUTH_PATH], { [AUTH_PATH]: AUTH_CONTENT }),
        locale: 'en',
        translations: {
          fr: {
            ide: {
              chat: {
                skills: {
                  heading: 'Compétences',
                  resetDefaults: 'Tout charger par défaut',
                  newTitle: 'Créer une nouvelle compétence de projet',
                  new: 'Nouvelle compétence',
                  newPlaceholder: 'Nom de la nouvelle compétence…',
                  cancel: 'Annuler',
                  create: 'Créer',
                  searchPlaceholder: 'Filtrer les compétences…',
                  loading: 'Chargement des compétences…',
                  waitingForSandbox: 'Le bac à sable finit de démarrer…',
                  error: 'Impossible de charger les compétences de ce projet.',
                  noMatch: 'Aucune compétence ne correspond à « {{query}} ».',
                  empty: 'Aucune compétence dans .agents/skills/ pour ce projet.',
                  defaultBadge: 'Par défaut',
                  loadedBadge: 'Chargée',
                  load: 'Charger',
                  setDefault: 'Charger par défaut',
                  unsetDefault: 'Ne plus charger par défaut',
                },
              },
            },
          },
        },
      },
      interactions: [{ type: 'locale', locale: 'fr' }],
    },
  ],
}
