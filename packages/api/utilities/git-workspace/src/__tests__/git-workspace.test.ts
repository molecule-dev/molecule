/**
 * REAL-GIT integration tests for `@molecule/api-git-workspace`.
 *
 * These drive an actual `git` binary against real temporary workspaces. A fake
 * GitExec returning canned strings would let real bugs through — every
 * behaviour this package promises (a `.git` FILE, a gitignored nested repo, an
 * unborn HEAD, "is this really on the remote?", what `git bundle verify`
 * actually checks, what `git clone` silently drops) is a property of git itself,
 * and a test double is exactly where those get assumed instead of verified.
 *
 * The child_process-backed GitExec lives HERE and only here: `src/` never
 * imports child_process.
 */

import { execFile } from 'node:child_process'
import {
  access,
  chmod,
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  truncate,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, sep } from 'node:path'

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  type ArchivedRepo,
  bundleRepo,
  checkpointRepo,
  type DiscoveredRepo,
  discoverRepos,
  type GitExec,
  type GitExecResult,
  headOnRemote,
  RECONSTRUCTION_MISMATCH_KINDS,
  type ReconstructionReport,
  restoreRepo,
  UNREADABLE_REASONS,
  type UnreadableRepo,
  verifyBundle,
  verifyBundleRestorable,
  verifyWorkspaceReconstruction,
} from '../index.js'

const TIMEOUT = 60_000

/** Temp root for one test; everything below it is removed in afterEach. */
let root: string
/** HOME for git, so no developer config can leak into a test. */
let gitHome: string
/**
 * Default cwd for the executor — deliberately NOT a git repository, mirroring an
 * archival worker that runs from an arbitrary directory. `git bundle verify`
 * refuses to run outside a repo, so this default is what proves verifyBundle
 * does not depend on ambient repo context.
 */
let nonRepoDir: string

/** True when the process can read anything regardless of mode bits. */
const isRoot = typeof process.getuid === 'function' && process.getuid() === 0

/**
 * A GitExec built on node:child_process. Non-zero exits RESOLVE with the exit
 * code (the contract); only a failure to spawn git rejects.
 */
const exec: GitExec = (args, options) =>
  new Promise<GitExecResult>((resolve, reject) => {
    execFile(
      'git',
      [...args],
      {
        cwd: options?.cwd ?? nonRepoDir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: {
          PATH: process.env.PATH,
          HOME: gitHome,
          // Isolate from the developer's ~/.gitconfig and /etc/gitconfig so
          // "this repo has no user.email" is genuinely true in the test.
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_TERMINAL_PROMPT: '0',
        },
      },
      (error, stdout, stderr) => {
        if (error && typeof (error as NodeJS.ErrnoException).code !== 'number') {
          reject(error)

          return
        }

        resolve({
          stdout,
          stderr,
          exitCode: error ? Number((error as unknown as { code: number }).code) : 0,
        })
      },
    )
  })

/**
 * The same executor, but with git convinced every repository is owned by
 * somebody else — the STANDARD Docker bind-mount uid mismatch ("detected dubious
 * ownership"), reproduced deterministically instead of by chown.
 */
const execAsDifferentOwner: GitExec = (args, options) =>
  new Promise<GitExecResult>((resolve, reject) => {
    execFile(
      'git',
      [...args],
      {
        cwd: options?.cwd ?? nonRepoDir,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
        env: {
          PATH: process.env.PATH,
          HOME: gitHome,
          GIT_CONFIG_GLOBAL: '/dev/null',
          GIT_CONFIG_SYSTEM: '/dev/null',
          GIT_CONFIG_NOSYSTEM: '1',
          GIT_TERMINAL_PROMPT: '0',
          GIT_TEST_ASSUME_DIFFERENT_OWNER: '1',
        },
      },
      (error, stdout, stderr) => {
        if (error && typeof (error as NodeJS.ErrnoException).code !== 'number') {
          reject(error)

          return
        }

        resolve({
          stdout,
          stderr,
          exitCode: error ? Number((error as unknown as { code: number }).code) : 0,
        })
      },
    )
  })

/** Runs git and throws on failure — for building fixtures. */
const git = async (args: string[], cwd: string): Promise<string> => {
  const result = await exec(args, { cwd })

  if (result.exitCode !== 0) {
    throw new Error(`fixture: git ${args.join(' ')} in ${cwd} failed: ${result.stderr}`)
  }

  return result.stdout
}

/** Creates a repo (with a committer identity unless `identity: false`). */
const initRepo = async (dir: string, options: { identity?: boolean } = {}): Promise<string> => {
  await mkdir(dir, { recursive: true })
  await git(['init', '-b', 'main'], dir)

  if (options.identity !== false) {
    await git(['config', 'user.email', 'fixture@example.com'], dir)
    await git(['config', 'user.name', 'Fixture'], dir)
  }

  return dir
}

/** Writes a file (creating parent dirs) and commits it. */
const commitFile = async (
  dir: string,
  file: string,
  contents: string,
  message: string,
): Promise<string> => {
  await mkdir(join(dir, file, '..'), { recursive: true })
  await writeFile(join(dir, file), contents)
  await git(['add', '-A'], dir)
  await git(['commit', '-m', message], dir)

  return (await git(['rev-parse', 'HEAD'], dir)).trim()
}

/** Creates a bare repo to act as a real remote, and wires it up under `name`. */
const addRemote = async (dir: string, bareName: string, name = 'origin'): Promise<string> => {
  const bare = join(root, 'remotes', bareName)

  await mkdir(bare, { recursive: true })
  await git(['init', '--bare', '-b', 'main'], bare)
  await git(['remote', 'add', name, bare], dir)

  return bare
}

const exists = async (path: string): Promise<boolean> => {
  try {
    await access(path)

    return true
  } catch (_error) {
    // Documented noop: access() rejects only when the path is absent/unreadable,
    // which is precisely the boolean this helper reports.
    return false
  }
}

const headOf = async (dir: string): Promise<string> =>
  (await git(['rev-parse', 'HEAD'], dir)).trim()

/** Every ref in a repo, `<refname> <sha>` per line, sorted — the round-trip contract. */
const refsOf = async (dir: string): Promise<string> =>
  (await git(['for-each-ref', '--format=%(refname) %(objectname)'], dir)).trim()

/** Bundle path derived from a repo's WORKSPACE PATH, so two `api` repos cannot collide. */
const bundleFor = (archive: string, repoPath: string): string =>
  join(archive, `${encodeURIComponent(repoPath)}.bundle`)

/**
 * Builds the molecule-workspace shape: a thin root repo whose .gitignore lists
 * the sub-repo directories, plus three INDEPENDENT repos (one nested two levels
 * deep), each with its own remote and its own commits — and a decoy repo inside
 * node_modules that must never be archived, but must never be invisible either.
 */
const buildPolyrepoWorkspace = async (): Promise<{
  workspace: string
  shas: Record<string, string>
}> => {
  const workspace = join(root, 'workspace')

  await initRepo(workspace)
  await writeFile(
    join(workspace, '.gitignore'),
    ['node_modules/', 'mlcl/', 'molecule/', 'nested/', ''].join('\n'),
  )
  const rootSha = await commitFile(
    workspace,
    'package.json',
    '{"name":"ws"}\n',
    'chore: workspace glue',
  )

  await addRemote(workspace, 'workspace.git')
  await git(['push', '-q', 'origin', 'main'], workspace)

  // Sub-repo 1: has a remote, never pushed.
  const mlcl = join(workspace, 'mlcl')

  await initRepo(mlcl)
  const mlclSha = await commitFile(mlcl, 'src/cli.ts', 'export const cli = 1\n', 'feat: cli')

  await addRemote(mlcl, 'mlcl.git')

  // Sub-repo 2: pushed, and its HEAD is contained by a remote-tracking ref.
  const molecule = join(workspace, 'molecule')

  await initRepo(molecule)
  const moleculeSha = await commitFile(molecule, 'packages/a.ts', 'export const a = 1\n', 'feat: a')

  await addRemote(molecule, 'molecule.git')
  await git(['push', '-q', 'origin', 'main'], molecule)

  // Sub-repo 3: TWO LEVELS DEEP, pushed and then committed again — the
  // "configured remote but unpushed work" case that must still be archived.
  const deep = join(workspace, 'nested', 'deep')

  await initRepo(deep)
  await commitFile(deep, 'index.ts', 'export const deep = 1\n', 'feat: deep')
  await addRemote(deep, 'deep.git')
  await git(['push', '-q', 'origin', 'main'], deep)
  const deepSha = await commitFile(
    deep,
    'later.ts',
    'export const later = 2\n',
    'feat: unpushed work',
  )

  // Decoy: a real repo inside node_modules. Never archived — always reported.
  const decoy = join(workspace, 'node_modules', 'some-dep')

  await initRepo(decoy)
  await commitFile(decoy, 'index.js', 'module.exports = 1\n', 'chore: vendored')

  return {
    workspace,
    shas: { '.': rootSha, mlcl: mlclSha, molecule: moleculeSha, 'nested/deep': deepSha },
  }
}

/**
 * A BARE repository (`git init --bare`) holding real refs, seeded by pushing
 * from a throwaway working repo kept OUTSIDE the workspace — so the bare repo is
 * genuinely the only copy inside it.
 */
const buildBareMirror = async (
  bareDir: string,
  seedName: string,
): Promise<{ sha: string; refs: string }> => {
  await mkdir(bareDir, { recursive: true })
  await git(['init', '--bare', '-b', 'main'], bareDir)

  const source = join(root, 'seeds', seedName)

  await initRepo(source)

  const sha = await commitFile(source, 'only-copy.ts', 'export const only = 1\n', 'feat: only copy')

  await git(['tag', 'v9'], source)
  await git(['remote', 'add', 'mirror', bareDir], source)
  await git(['push', '-q', 'mirror', 'main'], source)
  await git(['push', '-q', 'mirror', 'v9'], source)

  return { sha, refs: await refsOf(bareDir) }
}

/**
 * THE TWO-COPY-LOSS SHAPE: a working repo whose `origin` is a bare mirror living
 * in the SAME workspace, with HEAD pushed to it.
 *
 * Each half is individually correct — the mirror really does have the commit —
 * and together they delete both copies: the caller skips the working repo's
 * bundle because it is "safe on origin", then releases the workspace, which
 * takes origin with it.
 */
const buildTwoCopyWorkspace = async (): Promise<{
  workspace: string
  app: string
  mirror: string
  sha: string
}> => {
  const workspace = join(root, 'ws')
  const mirror = join(workspace, 'team-mirror.git')
  const app = join(workspace, 'app')

  await mkdir(mirror, { recursive: true })
  await git(['init', '--bare', '-b', 'main'], mirror)
  await initRepo(app)

  const sha = await commitFile(app, 'src.ts', 'export const only = 1\n', 'feat: the only copy')

  await git(['remote', 'add', 'origin', mirror], app)
  await git(['push', '-q', 'origin', 'main'], app)

  return { workspace, app, mirror, sha }
}

/** Wraps the real executor, recording every argv + cwd it is asked to run. */
const recordingExec = (calls: { args: string[]; cwd: string | undefined }[]): GitExec => {
  return (args, options) => {
    calls.push({ args: [...args], cwd: options?.cwd })

    return exec(args, options)
  }
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), 'mol-git-workspace-'))
  gitHome = join(root, 'git-home')
  nonRepoDir = join(root, 'not-a-repo')
  await mkdir(gitHome, { recursive: true })
  await mkdir(nonRepoDir, { recursive: true })
}, TIMEOUT)

afterEach(async () => {
  await rm(root, { recursive: true, force: true })
}, TIMEOUT)

describe('discoverRepos — the polyrepo (molecule-workspace) shape', () => {
  it(
    'finds the root repo AND every gitignored nested repo, including one two levels deep',
    async () => {
      const { workspace, shas } = await buildPolyrepoWorkspace()
      const { repos } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['.', 'mlcl', 'molecule', 'nested/deep'])

      for (const repo of repos) {
        expect(repo.headSha).toBe(shas[repo.path])
        expect(repo.branch).toBe('main')
        expect(repo.remotes).toHaveLength(1)
        expect(repo.remotes[0]?.name).toBe('origin')
        expect(repo.remotes[0]?.url).toContain('remotes')
      }
    },
    TIMEOUT,
  )

  it(
    'never descends into node_modules — and REPORTS the vendored repo it skipped',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()

      await initRepo(join(workspace, 'node_modules', '@scope', 'pkg'))

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(await exists(join(workspace, 'node_modules', 'some-dep', '.git'))).toBe(true)
      expect(repos.some((repo) => repo.path.includes('node_modules'))).toBe(false)

      // Skipped is not the same as absent: both vendored repos are visible,
      // including the scoped one two levels into the skipped tree.
      expect(unreadable.map((entry) => entry.path)).toEqual([
        'node_modules/@scope/pkg',
        'node_modules/some-dep',
      ])

      for (const entry of unreadable) {
        expect(entry.reason.startsWith(UNREADABLE_REASONS.skippedDirectory)).toBe(true)
        expect(entry.reason).toContain('node_modules')
      }
    },
    TIMEOUT,
  )

  it(
    'reports the root repo as clean even though it contains three other repos',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()
      const { repos } = await discoverRepos(exec, workspace)

      expect(repos.find((repo) => repo.path === '.')?.dirty).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'computes headOnRemoteTrackingRef per repo: unpushed remotes and post-push commits are false',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()
      const { repos } = await discoverRepos(exec, workspace)
      const cached = Object.fromEntries(
        repos.map((repo) => [repo.path, repo.headOnRemoteTrackingRef]),
      )

      expect(cached).toEqual({
        '.': true,
        // remote configured, never pushed — its work only exists locally
        mlcl: false,
        molecule: true,
        // pushed once, then committed again — the last commit is NOT on the remote
        'nested/deep': false,
      })
    },
    TIMEOUT,
  )

  it(
    'PROVES WHY: a bundle of the root repo captures nothing of the nested repos',
    async () => {
      const { workspace, shas } = await buildPolyrepoWorkspace()
      const bundlePath = join(root, 'root-only.bundle')

      await bundleRepo(exec, workspace, bundlePath)
      await restoreRepo(exec, bundlePath, join(root, 'root-only-restored'))

      const restored = join(root, 'root-only-restored')

      // The root's own commit is there…
      expect(
        (await exec(['cat-file', '-e', `${shas['.']}^{commit}`], { cwd: restored })).exitCode,
      ).toBe(0)

      // …and every sub-repo's history is completely absent, which is exactly
      // why discovery must walk the filesystem and bundle each repo itself.
      for (const path of ['mlcl', 'molecule', 'nested/deep']) {
        expect(
          (await exec(['cat-file', '-e', `${shas[path]}^{commit}`], { cwd: restored })).exitCode,
        ).not.toBe(0)
      }

      expect(await exists(join(restored, 'mlcl'))).toBe(false)
    },
    TIMEOUT,
  )
})

describe('headOnRemoteTrackingRef is CACHED LOCAL STATE — headOnRemote asks the remote', () => {
  it(
    'stays true after the branch is deleted on the remote, where headOnRemote says false',
    async () => {
      const repo = join(root, 'ws', 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      const bare = await addRemote(repo, 'repo.git')

      await git(['push', '-q', 'origin', 'main'], repo)

      const before = (await discoverRepos(exec, join(root, 'ws'))).repos[0] as DiscoveredRepo

      expect(before.headOnRemoteTrackingRef).toBe(true)
      expect(await headOnRemote(exec, repo, 'origin')).toBe(true)

      // The branch goes away on the remote. Nothing touches the local cache.
      await git(['update-ref', '-d', 'refs/heads/main'], bare)

      const after = (await discoverRepos(exec, join(root, 'ws'))).repos[0] as DiscoveredRepo

      // The LIE: the local cache still claims the commit is on a remote.
      expect(after.headOnRemoteTrackingRef).toBe(true)
      expect(after.remotesContainingHead).toEqual(['origin'])
      // The truth, which is the only signal allowed to skip a bundle.
      expect(await headOnRemote(exec, repo, 'origin')).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'stays true after the whole remote repository is deleted, where headOnRemote fails closed',
    async () => {
      const repo = join(root, 'ws', 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      const bare = await addRemote(repo, 'repo.git')

      await git(['push', '-q', 'origin', 'main'], repo)
      await rm(bare, { recursive: true, force: true })

      const discovered = (await discoverRepos(exec, join(root, 'ws'))).repos[0] as DiscoveredRepo

      expect(discovered.headOnRemoteTrackingRef).toBe(true)
      // Unreachable remote => false => bundle it. Never an exception, never true.
      expect(await headOnRemote(exec, repo, 'origin')).toBe(false)
      expect(await headOnRemote(exec, repo, 'no-such-remote')).toBe(false)
      expect(await headOnRemote(exec, repo, 'https://example.invalid/nope.git')).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'is NEVER true with remotes: [] — stale tracking refs alone do not count',
    async () => {
      const repo = join(root, 'ws', 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await addRemote(repo, 'repo.git')
      await git(['push', '-q', 'origin', 'main'], repo)

      // Removing the CONFIG SECTION (rather than `git remote remove`) leaves the
      // remote-tracking refs behind — the shape that once reported
      // `pushed: true` alongside `remotes: []`.
      await git(['config', '--remove-section', 'remote.origin'], repo)
      expect(
        (await git(['for-each-ref', '--format=%(refname)', 'refs/remotes/'], repo)).trim(),
      ).toBe('refs/remotes/origin/main')

      const discovered = (await discoverRepos(exec, join(root, 'ws'))).repos[0] as DiscoveredRepo

      expect(discovered.remotes).toEqual([])
      expect(discovered.remotesContainingHead).toEqual([])
      expect(discovered.headOnRemoteTrackingRef).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'records WHICH configured remotes contain HEAD, and only those',
    async () => {
      const repo = join(root, 'ws', 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await addRemote(repo, 'one.git', 'one')
      await addRemote(repo, 'two.git', 'two')
      await git(['push', '-q', 'two', 'main'], repo)

      const discovered = (await discoverRepos(exec, join(root, 'ws'))).repos[0] as DiscoveredRepo

      expect(discovered.remotes.map((remote) => remote.name)).toEqual(['one', 'two'])
      expect(discovered.remotesContainingHead).toEqual(['two'])
      expect(discovered.headOnRemoteTrackingRef).toBe(true)
      expect(await headOnRemote(exec, repo, 'two')).toBe(true)
      expect(await headOnRemote(exec, repo, 'one')).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'headOnRemote is false for a repo with no commits at all',
    async () => {
      const repo = join(root, 'ws', 'repo')

      await initRepo(repo)
      await addRemote(repo, 'repo.git')

      expect(await headOnRemote(exec, repo, 'origin')).toBe(false)
    },
    TIMEOUT,
  )
})

describe('discoverRepos — never silently drops a repo', () => {
  it(
    'reports a directory git refuses to open in `unreadable`, WITH git’s message',
    async () => {
      const workspace = join(root, 'ws')
      const real = join(workspace, 'real')

      await initRepo(real)
      await commitFile(real, 'a.txt', 'a\n', 'feat: a')
      await mkdir(join(workspace, 'broken'), { recursive: true })
      await writeFile(join(workspace, 'broken', '.git'), 'this is not a gitfile\n')
      await mkdir(join(workspace, 'stale-worktree'), { recursive: true })
      await writeFile(
        join(workspace, 'stale-worktree', '.git'),
        `gitdir: ${join(root, 'gone', '.git', 'worktrees', 'wt')}\n`,
      )

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      // The readable repo still comes back…
      expect(repos.map((repo) => repo.path)).toEqual(['real'])
      // …and NOTHING was omitted: both refusals are named, with git's own text.
      expect(unreadable.map((entry) => entry.path)).toEqual(['broken', 'stale-worktree'])

      for (const entry of unreadable) {
        expect(entry.reason.startsWith(UNREADABLE_REASONS.gitRefused)).toBe(true)
        expect(entry.reason).toMatch(/git rev-parse failed/)
        expect(entry.reason).toMatch(/fatal|error/i)
      }
    },
    TIMEOUT,
  )

  it(
    'under "dubious ownership" (the Docker uid mismatch) EVERY repo is reported, not vanished',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()
      const healthy = await discoverRepos(exec, workspace)

      expect(healthy.repos).toHaveLength(4)

      // Same workspace, same walk — but git now refuses to open any of them,
      // exactly as it does over a bind mount whose uid does not match.
      const { repos, unreadable } = await discoverRepos(execAsDifferentOwner, workspace)

      // The old behaviour: zero repos and no complaint, so an archive reported
      // success having bundled nothing. Now every one of them is accounted for.
      expect(repos).toEqual([])
      expect(unreadable.map((entry) => entry.path)).toEqual([
        '.',
        'mlcl',
        'molecule',
        'nested/deep',
        'node_modules/some-dep',
      ])

      for (const entry of unreadable.filter(
        (candidate) => candidate.path !== 'node_modules/some-dep',
      )) {
        expect(entry.reason.startsWith(UNREADABLE_REASONS.gitRefused)).toBe(true)
        expect(entry.reason).toContain('detected dubious ownership')
        expect(entry.reason).toContain('safe.directory')
      }
    },
    TIMEOUT,
  )

  it(
    'throws when workspaceRoot does not exist, instead of reporting an empty workspace',
    async () => {
      await expect(discoverRepos(exec, join(root, 'no-such-workspace'))).rejects.toThrow(
        /not a readable directory/,
      )
      // A file is not a workspace either.
      await writeFile(join(root, 'a-file'), 'x\n')
      await expect(discoverRepos(exec, join(root, 'a-file'))).rejects.toThrow(
        /not a readable directory/,
      )
    },
    TIMEOUT,
  )

  it.runIf(!isRoot)(
    'reports a directory it cannot list, rather than aborting the whole walk',
    async () => {
      const workspace = join(root, 'ws')
      const real = join(workspace, 'real')
      const locked = join(workspace, 'locked')

      await initRepo(real)
      await commitFile(real, 'a.txt', 'a\n', 'feat: a')
      await mkdir(locked, { recursive: true })
      await chmod(locked, 0o000)

      try {
        const { repos, unreadable } = await discoverRepos(exec, workspace)

        expect(repos.map((repo) => repo.path)).toEqual(['real'])
        expect(unreadable).toHaveLength(1)
        expect(unreadable[0]?.path).toBe('locked')
        expect(unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.unreadableDirectory)).toBe(true)
      } finally {
        await chmod(locked, 0o755)
      }
    },
    TIMEOUT,
  )
})

describe('discoverRepos — .git shapes, skip dirs, and walk limits', () => {
  it(
    'discovers a repo whose .git is a FILE (a linked worktree), not a directory',
    async () => {
      const workspace = join(root, 'ws')
      const main = join(workspace, 'main')

      await initRepo(main)
      await commitFile(main, 'a.txt', 'a\n', 'feat: a')
      await git(['worktree', 'add', '-q', '-b', 'feature', join(workspace, 'wt')], main)

      const dotGit = await stat(join(workspace, 'wt', '.git'))

      expect(dotGit.isFile()).toBe(true)

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['main', 'wt'])
      expect(unreadable).toEqual([])
      expect(repos.find((repo) => repo.path === 'wt')?.branch).toBe('feature')
      expect(repos.find((repo) => repo.path === 'wt')?.headSha).toBe(await headOf(main))
    },
    TIMEOUT,
  )

  it(
    'never descends into .git itself, even when skipDirs is overridden to empty',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      // A directory INSIDE the object store that looks like a repo root.
      await mkdir(join(repo, '.git', 'decoy', '.git'), { recursive: true })

      const { repos, unreadable } = await discoverRepos(exec, workspace, { skipDirs: [] })

      expect(repos.map((discovered) => discovered.path)).toEqual(['repo'])
      // `.git` is skipped structurally, never reported as a skipped directory —
      // its parent is already reported as the repo.
      expect(unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'archives repos that live in dist/, vendor/, and tmp/ — they are NOT skipped',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'a.txt', 'a\n', 'feat: a')

      for (const directory of ['dist', 'vendor/lib', 'tmp/scratch', 'build', 'target', 'venv']) {
        const repo = join(workspace, ...directory.split('/'))

        await initRepo(repo)
        await commitFile(repo, 'kept.txt', `${directory}\n`, `feat: ${directory}`)
      }

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual([
        '.',
        'build',
        'dist',
        'target',
        'tmp/scratch',
        'vendor/lib',
        'venv',
      ])
      expect(unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'records a truncated search: hitting maxDepth is reported, never made to look exhaustive',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'a.txt', 'a\n', 'feat: a')
      await initRepo(join(workspace, 'a', 'b', 'c'))
      await commitFile(join(workspace, 'a', 'b', 'c'), 'c.txt', 'c\n', 'feat: c')
      await initRepo(join(workspace, 'skipme'))
      await commitFile(join(workspace, 'skipme'), 's.txt', 's\n', 'feat: s')

      const shallow = await discoverRepos(exec, workspace, { maxDepth: 2 })

      expect(shallow.repos.map((repo) => repo.path)).toEqual(['.', 'skipme'])
      expect(shallow.unreadable).toHaveLength(1)
      expect(shallow.unreadable[0]?.path).toBe('a/b')
      expect(shallow.unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.depthLimit)).toBe(true)
      expect(shallow.unreadable[0]?.reason).toContain('maxDepth=2')

      // Deep enough to reach it: the search is exhaustive again, and says so.
      const deep = await discoverRepos(exec, workspace, { maxDepth: 3 })

      expect(deep.repos.map((repo) => repo.path)).toEqual(['.', 'a/b/c', 'skipme'])
      expect(deep.unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'a repo inside a custom skipDirs entry is not archived, but IS reported',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'a.txt', 'a\n', 'feat: a')
      await initRepo(join(workspace, 'a', 'b', 'c'))
      await commitFile(join(workspace, 'a', 'b', 'c'), 'c.txt', 'c\n', 'feat: c')
      await initRepo(join(workspace, 'skipme'))
      await commitFile(join(workspace, 'skipme'), 's.txt', 's\n', 'feat: s')

      const { repos, unreadable } = await discoverRepos(exec, workspace, { skipDirs: ['skipme'] })

      expect(repos.map((repo) => repo.path)).toEqual(['.', 'a/b/c'])
      expect(unreadable).toHaveLength(1)
      expect(unreadable[0]?.path).toBe('skipme')
      expect(unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.skippedDirectory)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'does not follow symlinked directories',
    async () => {
      const workspace = join(root, 'ws')
      const real = join(workspace, 'real')

      await initRepo(real)
      await commitFile(real, 'a.txt', 'a\n', 'feat: a')
      await symlink(real, join(workspace, 'link'), 'dir')

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['real'])
      expect(unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'handles a repo path containing a space and a quote',
    async () => {
      const workspace = join(root, 'ws')
      const weird = join(workspace, `my repo's "dir"`)

      await initRepo(weird)
      const sha = await commitFile(weird, 'a.txt', 'a\n', 'feat: a')
      const { repos } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual([`my repo's "dir"`])
      expect(repos[0]?.headSha).toBe(sha)

      // …and it survives the whole pipeline, including a bundle path with the
      // same hostile characters.
      const bundlePath = join(root, `my bundle's "file".bundle`)

      await writeFile(join(weird, 'dirty.txt'), 'wip\n')
      expect(await checkpointRepo(exec, weird, "chore: it's a checkpoint")).not.toBeNull()
      await bundleRepo(exec, weird, bundlePath)
      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)
      await restoreRepo(exec, bundlePath, join(root, `restored 'weird" dir`))
      expect(await headOf(join(root, `restored 'weird" dir`))).toBe(await headOf(weird))
    },
    TIMEOUT,
  )
})

describe('discoverRepos — repo states', () => {
  it(
    'reports a repo with no commits as headSha null (and does not crash)',
    async () => {
      const workspace = join(root, 'ws')
      const fresh = join(workspace, 'fresh')

      await initRepo(fresh)
      const { repos } = await discoverRepos(exec, workspace)

      expect(repos).toHaveLength(1)
      expect(repos[0]?.headSha).toBeNull()
      // An unborn HEAD still names the branch it would create.
      expect(repos[0]?.branch).toBe('main')
      expect(repos[0]?.headOnRemoteTrackingRef).toBe(false)
      expect(repos[0]?.remotesContainingHead).toEqual([])
      expect(repos[0]?.dirty).toBe(false)

      await writeFile(join(fresh, 'new.txt'), 'x\n')
      expect((await discoverRepos(exec, workspace)).repos[0]?.dirty).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'reports a detached HEAD as branch null with the right sha',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      const first = await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      await commitFile(repo, 'b.txt', 'b\n', 'feat: b')
      await git(['checkout', '-q', '--detach', first], repo)

      const [discovered] = (await discoverRepos(exec, workspace)).repos

      expect(discovered?.branch).toBeNull()
      expect(discovered?.headSha).toBe(first)
    },
    TIMEOUT,
  )

  it(
    'does not count gitignored files as dirty',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      await commitFile(repo, '.gitignore', 'node_modules/\n.env\n', 'chore: ignore')
      await mkdir(join(repo, 'node_modules'), { recursive: true })
      await writeFile(join(repo, 'node_modules', 'big.js'), 'x\n')
      await writeFile(join(repo, '.env'), 'SECRET=1\n')

      expect((await discoverRepos(exec, workspace)).repos[0]?.dirty).toBe(false)

      await writeFile(join(repo, 'tracked.txt'), 'x\n')
      expect((await discoverRepos(exec, workspace)).repos[0]?.dirty).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'flips headOnRemoteTrackingRef to true only once HEAD is contained by a tracking ref',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      expect((await discoverRepos(exec, workspace)).repos[0]?.headOnRemoteTrackingRef).toBe(false)

      await addRemote(repo, 'repo.git')
      // A configured remote alone proves nothing.
      expect((await discoverRepos(exec, workspace)).repos[0]?.headOnRemoteTrackingRef).toBe(false)

      await git(['push', '-q', 'origin', 'main'], repo)
      expect((await discoverRepos(exec, workspace)).repos[0]?.headOnRemoteTrackingRef).toBe(true)

      await commitFile(repo, 'b.txt', 'b\n', 'feat: b')
      expect((await discoverRepos(exec, workspace)).repos[0]?.headOnRemoteTrackingRef).toBe(false)
    },
    TIMEOUT,
  )
})

describe('checkpointRepo', () => {
  it(
    'returns null on a clean tree and a sha on a dirty one',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      const first = await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toBeNull()

      await writeFile(join(repo, 'a.txt'), 'modified\n')
      await writeFile(join(repo, 'untracked.txt'), 'new\n')

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).toMatch(/^[0-9a-f]{40}$/)
      expect(sha).not.toBe(first)
      expect(sha).toBe(await headOf(repo))
      expect((await git(['status', '--porcelain'], repo)).trim()).toBe('')
      expect((await git(['show', '--name-only', '--format=%s', 'HEAD'], repo)).trim()).toContain(
        'untracked.txt',
      )
      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toBeNull()
    },
    TIMEOUT,
  )

  it(
    'succeeds in a repo with NO user.email configured',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo, { identity: false })
      await writeFile(join(repo, 'a.txt'), 'a\n')

      // Prove the precondition: an ordinary commit is impossible here.
      await git(['add', '-A'], repo)
      const plain = await exec(['commit', '-m', 'nope'], { cwd: repo })

      expect(plain.exitCode).not.toBe(0)
      expect(plain.stderr).toMatch(/identity|user\.email/i)

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).toMatch(/^[0-9a-f]{40}$/)
      expect((await git(['log', '-1', '--format=%an <%ae>'], repo)).trim()).toBe(
        'molecule.dev archiver <archiver@molecule.dev>',
      )
    },
    TIMEOUT,
  )

  it(
    'creates the first commit in a repo that has none',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await writeFile(join(repo, 'a.txt'), 'a\n')

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).toMatch(/^[0-9a-f]{40}$/)
      expect(await headOf(repo)).toBe(sha)
    },
    TIMEOUT,
  )

  it(
    'respects .gitignore when staging',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, '.gitignore', 'node_modules/\n.env\ndist/\n', 'chore: ignore')
      await mkdir(join(repo, 'node_modules'), { recursive: true })
      await mkdir(join(repo, 'dist'), { recursive: true })
      await writeFile(join(repo, 'node_modules', 'dep.js'), 'x\n')
      await writeFile(join(repo, 'dist', 'out.js'), 'x\n')
      await writeFile(join(repo, '.env'), 'SECRET=hunter2\n')
      await writeFile(join(repo, 'src.ts'), 'export const x = 1\n')

      await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      const tracked = (await git(['ls-files'], repo)).split('\n').filter(Boolean)

      expect(tracked).toContain('src.ts')
      expect(tracked).not.toContain('.env')
      expect(tracked.some((file) => file.startsWith('node_modules/'))).toBe(false)
      expect(tracked.some((file) => file.startsWith('dist/'))).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'is not blocked by a failing pre-commit hook',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await writeFile(
        join(repo, '.git', 'hooks', 'pre-commit'),
        '#!/bin/sh\necho "blocked" >&2\nexit 1\n',
        { mode: 0o755 },
      )
      await writeFile(join(repo, 'b.txt'), 'b\n')

      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toMatch(
        /^[0-9a-f]{40}$/,
      )
    },
    TIMEOUT,
  )

  it(
    'rejects an empty commit message instead of letting git fail cryptically',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await writeFile(join(repo, 'a.txt'), 'a\n')

      await expect(checkpointRepo(exec, repo, '   ')).rejects.toThrow(/non-empty commit message/)
    },
    TIMEOUT,
  )

  it(
    'checkpoints each repo of a workspace independently',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()

      await writeFile(join(workspace, 'mlcl', 'wip.ts'), 'export const wip = 1\n')
      await writeFile(join(workspace, 'nested', 'deep', 'wip.ts'), 'export const wip = 2\n')

      const { repos: before } = await discoverRepos(exec, workspace)

      expect(before.filter((repo) => repo.dirty).map((repo) => repo.path)).toEqual([
        'mlcl',
        'nested/deep',
      ])

      for (const repo of before) {
        const dir = repo.path === '.' ? workspace : join(workspace, repo.path)
        const sha = await checkpointRepo(exec, dir, 'chore: archive checkpoint')

        expect(sha === null).toBe(!repo.dirty)
      }

      expect((await discoverRepos(exec, workspace)).repos.some((repo) => repo.dirty)).toBe(false)
    },
    TIMEOUT,
  )
})

describe('checkpointRepo — refuses a repo mid-operation', () => {
  /** Two branches whose single file conflicts, left checked out on `main`. */
  const buildConflictingRepo = async (): Promise<string> => {
    const repo = join(root, 'repo')

    await initRepo(repo)
    await commitFile(repo, 'f.txt', 'base\n', 'feat: base')
    await git(['checkout', '-q', '-b', 'other'], repo)
    await commitFile(repo, 'f.txt', 'other\n', 'feat: other')
    await git(['checkout', '-q', 'main'], repo)
    await commitFile(repo, 'f.txt', 'main\n', 'feat: main')

    return repo
  }

  it(
    'refuses a conflicted MERGE instead of committing conflict markers',
    async () => {
      const repo = await buildConflictingRepo()
      const before = await headOf(repo)

      expect((await exec(['merge', 'other'], { cwd: repo })).exitCode).not.toBe(0)
      expect(await exists(join(repo, '.git', 'MERGE_HEAD'))).toBe(true)
      expect(await readFile(join(repo, 'f.txt'), 'utf8')).toContain('<<<<<<<')

      await expect(checkpointRepo(exec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /a merge is in progress/,
      )

      // Nothing was committed, and the user's half-finished merge is intact.
      expect(await headOf(repo)).toBe(before)
      expect((await git(['rev-list', '--count', 'HEAD'], repo)).trim()).toBe('2')
      expect(await exists(join(repo, '.git', 'MERGE_HEAD'))).toBe(true)
      expect((await git(['status', '--porcelain'], repo)).trim()).toContain('f.txt')
    },
    TIMEOUT,
  )

  it(
    'refuses a stopped REBASE',
    async () => {
      const repo = await buildConflictingRepo()
      const before = await headOf(repo)

      expect((await exec(['rebase', 'other'], { cwd: repo })).exitCode).not.toBe(0)
      expect(await exists(join(repo, '.git', 'rebase-merge'))).toBe(true)

      await expect(checkpointRepo(exec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /rebase.*is in progress/,
      )
      expect(await exists(join(repo, '.git', 'rebase-merge'))).toBe(true)
      // The rebase left HEAD detached on `other`; the point is that nothing new
      // was committed on top of the half-applied state.
      expect((await git(['log', '--format=%s', '-1'], repo)).trim()).not.toContain('checkpoint')
      expect(before).toMatch(/^[0-9a-f]{40}$/)
    },
    TIMEOUT,
  )

  it(
    'refuses a conflicted CHERRY-PICK',
    async () => {
      const repo = await buildConflictingRepo()
      const before = await headOf(repo)

      expect((await exec(['cherry-pick', 'other'], { cwd: repo })).exitCode).not.toBe(0)
      expect(await exists(join(repo, '.git', 'CHERRY_PICK_HEAD'))).toBe(true)

      await expect(checkpointRepo(exec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /a cherry-pick is in progress/,
      )
      expect(await headOf(repo)).toBe(before)
    },
    TIMEOUT,
  )

  it(
    'refuses a repo mid-BISECT even though its working tree is clean',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      const first = await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      await commitFile(repo, 'b.txt', 'b\n', 'feat: b')
      await commitFile(repo, 'c.txt', 'c\n', 'feat: c')
      await git(['bisect', 'start'], repo)
      await git(['bisect', 'bad'], repo)
      await git(['bisect', 'good', first], repo)

      expect(await exists(join(repo, '.git', 'BISECT_LOG'))).toBe(true)
      expect((await git(['status', '--porcelain'], repo)).trim()).toBe('')

      await expect(checkpointRepo(exec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /a bisect is in progress/,
      )
    },
    TIMEOUT,
  )

  it(
    'detects the state in a LINKED WORKTREE, where .git is a file',
    async () => {
      const main = join(root, 'main')
      const worktree = join(root, 'wt')

      await initRepo(main)
      await commitFile(main, 'f.txt', 'base\n', 'feat: base')
      await git(['checkout', '-q', '-b', 'other'], main)
      await commitFile(main, 'f.txt', 'other\n', 'feat: other')
      await git(['checkout', '-q', 'main'], main)
      await commitFile(main, 'f.txt', 'main\n', 'feat: main')
      await git(['worktree', 'add', '-q', '--detach', worktree, 'main'], main)

      expect((await stat(join(worktree, '.git'))).isFile()).toBe(true)
      expect((await exec(['merge', 'other'], { cwd: worktree })).exitCode).not.toBe(0)

      await expect(checkpointRepo(exec, worktree, 'chore: archive checkpoint')).rejects.toThrow(
        /a merge is in progress/,
      )
    },
    TIMEOUT,
  )

  it(
    'checkpoints normally once the operation is finished',
    async () => {
      const repo = await buildConflictingRepo()

      await exec(['merge', 'other'], { cwd: repo })
      await git(['merge', '--abort'], repo)
      await writeFile(join(repo, 'new.txt'), 'work\n')

      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toMatch(
        /^[0-9a-f]{40}$/,
      )
    },
    TIMEOUT,
  )
})

describe('bundleRepo + verifyBundle', () => {
  it(
    'refuses to bundle a repo with no commits, with an actionable error',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'empty.bundle')

      await initRepo(repo)

      await expect(bundleRepo(exec, repo, bundlePath)).rejects.toThrow(/no commits/)
      // git writes nothing in this case — the point of detecting it up front.
      expect(await exists(bundlePath)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'verifies a good bundle without any ambient repository (default cwd is not a repo)',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'good.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)

      // The executor's default cwd is deliberately not a repo; plain
      // `git bundle verify` would fail there with "need a repository".
      expect((await exec(['bundle', 'verify', bundlePath])).exitCode).not.toBe(0)
      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)
      // Verification touches NOTHING except the scratch path it was handed. It
      // does create an empty bare repo there — git 2.44+ refuses to verify a
      // bundle without a real repository — which is why the path is a parameter
      // the caller owns and removes, rather than one this package invents beside
      // the user's archive.
      expect(await exists(`${bundlePath}.molecule-verify-gitdir`)).toBe(false)
      expect(await exists(`${bundlePath}.verify-gitdir`)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'returns false for a missing file, a non-bundle, and a damaged header',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'good.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)

      expect(
        await verifyBundle(
          exec,
          join(root, 'nope.bundle'),
          `${join(root, 'nope.bundle')}.verify-gitdir`,
        ),
      ).toBe(false)

      await writeFile(join(root, 'junk.bundle'), 'definitely not a bundle\n')
      expect(
        await verifyBundle(
          exec,
          join(root, 'junk.bundle'),
          `${join(root, 'junk.bundle')}.verify-gitdir`,
        ),
      ).toBe(false)

      const damaged = join(root, 'damaged.bundle')
      const original = await readFile(bundlePath)

      await writeFile(
        damaged,
        Buffer.concat([Buffer.from('# broken header\n'), original.subarray(20)]),
      )
      expect(await verifyBundle(exec, damaged, `${damaged}.verify-gitdir`)).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'rejects an INCREMENTAL bundle: verification proves self-containment',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await commitFile(repo, 'b.txt', 'b\n', 'feat: b')

      // Built by hand — bundleRepo always writes --all — to prove the check is
      // not satisfied by objects that merely happen to exist somewhere nearby.
      const incremental = join(root, 'incremental.bundle')

      await git(['bundle', 'create', incremental, 'HEAD~1..HEAD'], repo)

      // The very repo it came from CAN satisfy its prerequisites…
      expect((await exec(['bundle', 'verify', incremental], { cwd: repo })).exitCode).toBe(0)
      // …but an archive that only works next to its source is not an archive.
      expect(await verifyBundle(exec, incremental, `${incremental}.verify-gitdir`)).toBe(false)

      const full = join(root, 'full.bundle')

      await bundleRepo(exec, repo, full)
      expect(await verifyBundle(exec, full, `${full}.verify-gitdir`)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'passes a path that looks like a FLAG straight through as a path',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      // Without the `--` separator git parses this as an unknown switch.
      expect(
        (await exec(['bundle', 'create', '-x.bundle', '--all'], { cwd: repo })).exitCode,
      ).not.toBe(0)

      await bundleRepo(exec, repo, '-x.bundle')
      expect(await exists(join(repo, '-x.bundle'))).toBe(true)

      // verifyBundle runs in the executor's default (non-repo) cwd.
      await copyFile(join(repo, '-x.bundle'), join(nonRepoDir, '-x.bundle'))
      expect(await verifyBundle(exec, '-x.bundle', `${'-x.bundle'}.verify-gitdir`)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'surfaces a clear error when the bundle destination directory does not exist',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      await expect(bundleRepo(exec, repo, join(root, 'no-such-dir', 'out.bundle'))).rejects.toThrow(
        /git bundle create/,
      )
    },
    TIMEOUT,
  )
})

describe('verifyBundle vs verifyBundleRestorable — the integrity gate', () => {
  /** A repo with enough objects that truncating it removes real pack data. */
  const buildChunkyRepo = async (): Promise<string> => {
    const repo = join(root, 'repo')

    await initRepo(repo)

    for (let index = 0; index < 30; index += 1) {
      await commitFile(
        repo,
        `file-${index}.txt`,
        `contents ${index}\n`.repeat(20),
        `feat: ${index}`,
      )
    }

    return repo
  }

  it(
    'a TRUNCATED bundle still "verifies" — only a real restore catches it',
    async () => {
      const repo = await buildChunkyRepo()
      const bundlePath = join(root, 'truncated.bundle')

      await bundleRepo(exec, repo, bundlePath)

      const { size } = await stat(bundlePath)

      await truncate(bundlePath, Math.floor(size * 0.9))

      // `git bundle verify` reads the HEADER only — this is why an archival flow
      // must never treat a `true` here as proof the archive is intact.
      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)

      // Restoring runs index-pack, which recomputes the pack checksum: the real gate.
      expect(await verifyBundleRestorable(exec, bundlePath, join(root, 'scratch'))).toBe(false)
      await expect(restoreRepo(exec, bundlePath, join(root, 'scratch-2'))).rejects.toThrow()
    },
    TIMEOUT,
  )

  it(
    'a BIT-FLIPPED packfile still "verifies" — only a real restore catches it',
    async () => {
      const repo = await buildChunkyRepo()
      const bundlePath = join(root, 'flipped.bundle')

      await bundleRepo(exec, repo, bundlePath)

      const bytes = await readFile(bundlePath)
      const offset = Math.floor(bytes.length * 0.9)

      bytes[offset] = (bytes[offset] as number) ^ 0xff
      await writeFile(bundlePath, bytes)

      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)
      expect(await verifyBundleRestorable(exec, bundlePath, join(root, 'scratch'))).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'returns true for a good bundle and LEAVES the proof on disk to compare against',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'good.bundle')
      const scratch = join(root, 'scratch')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['tag', 'v1'], repo)
      await bundleRepo(exec, repo, bundlePath)

      expect(await verifyBundleRestorable(exec, bundlePath, scratch)).toBe(true)
      // The caller compares the restored repo against the source before deleting
      // anything — so the restore is not thrown away.
      expect(await refsOf(scratch)).toBe(await refsOf(repo))
      expect(await readFile(join(scratch, 'a.txt'), 'utf8')).toBe('a\n')
    },
    TIMEOUT,
  )

  it(
    'fails closed for a missing bundle and for an occupied scratch directory',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'good.bundle')
      const occupied = join(root, 'occupied')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)
      await mkdir(occupied, { recursive: true })
      await writeFile(join(occupied, 'keep.txt'), 'precious\n')

      expect(await verifyBundleRestorable(exec, join(root, 'nope.bundle'), join(root, 's1'))).toBe(
        false,
      )
      expect(await verifyBundleRestorable(exec, bundlePath, occupied)).toBe(false)
      expect(await readFile(join(occupied, 'keep.txt'), 'utf8')).toBe('precious\n')
    },
    TIMEOUT,
  )
})

describe('restoreRepo — brings back EVERY ref, which git clone does not', () => {
  /** A repo carrying every ref class a bundle can hold. */
  const buildRichRepo = async (): Promise<string> => {
    const repo = join(root, 'repo')

    await initRepo(repo)
    await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
    await commitFile(repo, 'b.txt', 'b\n', 'feat: b')
    await git(['tag', 'v1.0.0'], repo)
    await git(['tag', '-a', 'v1.0.1', '-m', 'annotated'], repo)
    await git(['checkout', '-q', '-b', 'side'], repo)
    await commitFile(repo, 'c.txt', 'c\n', 'feat: c')
    await git(['checkout', '-q', 'main'], repo)
    await commitFile(repo, 'd.txt', 'd\n', 'feat: d')
    await git(['notes', 'add', '-m', 'a note about d'], repo)
    await addRemote(repo, 'rich.git')
    await git(['push', '-q', 'origin', 'main'], repo)

    // Two stashes: only the newest is a REF (refs/stash); the older one exists
    // solely in the stash reflog, which no bundle carries.
    await writeFile(join(repo, 'd.txt'), 'older stashed work\n')
    await git(['stash', 'push', '-q', '-m', 'wip-older'], repo)
    await writeFile(join(repo, 'd.txt'), 'newest stashed work\n')
    await git(['stash', 'push', '-q', '-m', 'wip-newest'], repo)

    return repo
  }

  it(
    'round-trips branches, tags, notes AND stash refs — identical ref SETS',
    async () => {
      const repo = await buildRichRepo()
      const bundlePath = join(root, 'rich.bundle')

      await bundleRepo(exec, repo, bundlePath)

      const sourceRefs = await refsOf(repo)

      expect(sourceRefs).toContain('refs/heads/side')
      expect(sourceRefs).toContain('refs/tags/v1.0.0')
      expect(sourceRefs).toContain('refs/notes/commits')
      expect(sourceRefs).toContain('refs/stash')
      expect(sourceRefs).toContain('refs/remotes/origin/main')

      const destination = join(root, 'restored')

      await restoreRepo(exec, bundlePath, destination)

      // The whole contract in one line: the same refs, pointing at the same objects.
      expect(await refsOf(destination)).toBe(sourceRefs)
      expect(await headOf(destination)).toBe(await headOf(repo))
      expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('main')
      expect((await git(['status', '--porcelain'], destination)).trim()).toBe('')
      expect((await git(['notes', 'show', 'HEAD'], destination)).trim()).toBe('a note about d')
      expect((await git(['log', '--format=%s', '--all'], destination)).trim()).toBe(
        (await git(['log', '--format=%s', '--all'], repo)).trim(),
      )

      // The stash REF survived and its content is recoverable…
      expect((await git(['rev-parse', 'refs/stash'], destination)).trim()).toBe(
        (await git(['rev-parse', 'refs/stash'], repo)).trim(),
      )
      await git(['stash', 'apply', 'refs/stash'], destination)
      expect(await readFile(join(destination, 'd.txt'), 'utf8')).toBe('newest stashed work\n')
      await git(['checkout', '-q', '--', 'd.txt'], destination)

      // …but NO bundle carries reflogs, so `git stash list` is empty and the
      // OLDER stash entry (which only ever lived in the stash reflog) is gone.
      // This is a git limitation, documented rather than papered over.
      expect((await git(['stash', 'list'], repo)).trim()).toContain('wip-older')
      expect((await git(['stash', 'list'], destination)).trim()).toBe('')
      expect(
        (await exec(['rev-parse', '--verify', 'refs/stash@{1}'], { cwd: destination })).exitCode,
      ).not.toBe(0)

      // PROVES WHY it is not a clone: the same bundle cloned drops the notes and
      // the stash entirely, and files every branch under refs/remotes/origin/*.
      const cloned = join(root, 'cloned')

      await git(['clone', '-q', '--', bundlePath, cloned], root)

      const clonedRefs = await refsOf(cloned)

      expect(clonedRefs).not.toContain('refs/notes/commits')
      expect(clonedRefs).not.toContain('refs/stash')
      expect(clonedRefs).not.toContain('refs/heads/side')
    },
    TIMEOUT,
  )

  it(
    'restores a repo whose HEAD is UNBORN with its refs intact, where clone yields an empty repo',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'unborn.bundle')

      await initRepo(repo)
      await commitFile(repo, 'kept.txt', 'precious\n', 'feat: precious work')
      await git(['tag', 'v1'], repo)
      // An orphan checkout: HEAD is unborn, but the work is still on `main`.
      await git(['checkout', '-q', '--orphan', 'brand-new'], repo)
      await git(['rm', '-rq', '--cached', '.'], repo)
      await rm(join(repo, 'kept.txt'))

      expect((await exec(['rev-parse', '--verify', 'HEAD'], { cwd: repo })).exitCode).not.toBe(0)

      const discovered = (await discoverRepos(exec, root, { maxDepth: 1 }))
        .repos[0] as DiscoveredRepo

      // `headSha === null` must NEVER be read as "nothing to archive".
      expect(discovered.headSha).toBeNull()

      await bundleRepo(exec, repo, bundlePath)

      const destination = join(root, 'restored')

      await restoreRepo(exec, bundlePath, destination)

      expect(await refsOf(destination)).toBe(await refsOf(repo))
      expect((await git(['show', 'main:kept.txt'], destination)).trim()).toBe('precious')
      // No branch was invented: HEAD is unborn, exactly as in the source.
      expect(
        (await exec(['rev-parse', '--verify', 'HEAD'], { cwd: destination })).exitCode,
      ).not.toBe(0)

      // A clone of the same bundle has NO branch and NO checkout: the work is
      // reachable only through refs/remotes/origin/*, one `git gc` away from
      // looking like an empty repository to the user.
      const cloned = join(root, 'cloned')

      await git(['clone', '-q', '--', bundlePath, cloned], root)
      expect(await refsOf(cloned)).not.toContain('refs/heads/')
      expect(await exists(join(cloned, 'kept.txt'))).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'preserves a detached HEAD commit that lives on no branch',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'detached.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['checkout', '-q', '--detach'], repo)

      const orphan = await commitFile(repo, 'wip.txt', 'unreferenced work\n', 'wip: detached')

      await bundleRepo(exec, repo, bundlePath)

      const destination = join(root, 'restored')

      await restoreRepo(exec, bundlePath, destination)

      expect(await headOf(destination)).toBe(orphan)
      expect(await readFile(join(destination, 'wip.txt'), 'utf8')).toBe('unreferenced work\n')
      expect(
        (await exec(['symbolic-ref', '--quiet', 'HEAD'], { cwd: destination })).exitCode,
      ).not.toBe(0)
    },
    TIMEOUT,
  )

  it(
    'leaves NO remote pointing at the bundle file',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')
      const destination = join(root, 'restored', 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await addRemote(repo, 'r.git')
      await git(['push', '-q', 'origin', 'main'], repo)
      await bundleRepo(exec, repo, bundlePath)
      await restoreRepo(exec, bundlePath, destination)

      const discovered = (await discoverRepos(exec, join(root, 'restored')))
        .repos[0] as DiscoveredRepo

      // A clone would have left `origin` pointing at the archive, so the user's
      // next push would write into it.
      expect((await git(['remote', '-v'], destination)).trim()).toBe('')
      expect(discovered.remotes).toEqual([])
      // …and the self-consistency rule holds: no configured remotes, no claim.
      expect(discovered.headOnRemoteTrackingRef).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'refuses to restore over an existing non-empty directory',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')
      const destination = join(root, 'occupied')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)
      await mkdir(destination, { recursive: true })
      await writeFile(join(destination, 'keep.txt'), 'precious\n')

      await expect(restoreRepo(exec, bundlePath, destination)).rejects.toThrow(/already exists/)
      expect(await readFile(join(destination, 'keep.txt'), 'utf8')).toBe('precious\n')
      // Nothing was written into it — not even a .git.
      expect(await exists(join(destination, '.git'))).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'restores a branch whose name collides with the destination’s default branch',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')
      const destination = join(root, 'restored')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)
      // `git init` in the destination points HEAD at a branch of its own; git
      // fetch refuses to write the checked-out branch without --update-head-ok.
      await writeFile(join(gitHome, '.gitconfig'), '[init]\n\tdefaultBranch = main\n')

      try {
        await restoreRepo(exec, bundlePath, destination)
      } finally {
        await rm(join(gitHome, '.gitconfig'), { force: true })
      }

      expect(await headOf(destination)).toBe(await headOf(repo))
      expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('main')
      expect((await git(['status', '--porcelain'], destination)).trim()).toBe('')
    },
    TIMEOUT,
  )
})

describe('restoreRepo — full workspace round trip', () => {
  it(
    'bundles, verifies by restoring, and restores EVERY repo with the same refs and contents',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()

      // Uncommitted work in two of the repos — archival must not lose it.
      await writeFile(join(workspace, 'mlcl', 'wip.ts'), 'export const wip = 1\n')
      await writeFile(join(workspace, 'nested', 'deep', 'wip.ts'), 'export const wip = 2\n')

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      // The honest flow: the ONLY thing unreadable is the vendored decoy inside
      // node_modules, which the caller must consciously accept before releasing.
      expect(unreadable.map((entry) => entry.path)).toEqual(['node_modules/some-dep'])

      const archive = join(root, 'archive')

      await mkdir(archive, { recursive: true })

      const expected: {
        path: string
        sha: string
        branch: string | null
        files: string
        refs: string
      }[] = []

      for (const repo of repos) {
        const dir = repo.path === '.' ? workspace : join(workspace, repo.path)

        await checkpointRepo(exec, dir, 'chore: archive checkpoint')

        const bundlePath = bundleFor(archive, repo.path)

        await bundleRepo(exec, dir, bundlePath)
        expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)
        // The check that actually proves the archive.
        expect(
          await verifyBundleRestorable(
            exec,
            bundlePath,
            join(root, 'proof', encodeURIComponent(repo.path)),
          ),
        ).toBe(true)

        expected.push({
          path: repo.path,
          sha: await headOf(dir),
          branch: repo.branch,
          files: (await git(['ls-files'], dir)).trim(),
          refs: await refsOf(dir),
        })
      }

      expect(expected).toHaveLength(4)

      // Restore into a fresh workspace, parents before children.
      const restoredRoot = join(root, 'restored')

      for (const entry of expected) {
        const destination = entry.path === '.' ? restoredRoot : join(restoredRoot, entry.path)

        // The documented flow: HEAD's branch comes from discovery, because no
        // bundle records which branch a symbolic HEAD pointed at.
        await restoreRepo(exec, bundleFor(archive, entry.path), destination, {
          ...(entry.branch === null ? {} : { headBranch: entry.branch }),
        })

        expect(await headOf(destination)).toBe(entry.sha)
        expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe(
          entry.branch,
        )
        expect((await git(['ls-files'], destination)).trim()).toBe(entry.files)
        expect((await git(['status', '--porcelain'], destination)).trim()).toBe('')
        expect(await refsOf(destination)).toBe(entry.refs)
      }

      // The actual bytes survived, including the work that was only uncommitted
      // until the checkpoint.
      expect(await readFile(join(restoredRoot, 'mlcl', 'src', 'cli.ts'), 'utf8')).toBe(
        'export const cli = 1\n',
      )
      expect(await readFile(join(restoredRoot, 'mlcl', 'wip.ts'), 'utf8')).toBe(
        'export const wip = 1\n',
      )
      expect(await readFile(join(restoredRoot, 'nested', 'deep', 'wip.ts'), 'utf8')).toBe(
        'export const wip = 2\n',
      )
      expect(await readFile(join(restoredRoot, 'package.json'), 'utf8')).toBe('{"name":"ws"}\n')

      // A restored repo is re-discoverable as the same polyrepo shape, and this
      // time nothing at all is unreadable.
      const rediscovered = await discoverRepos(exec, restoredRoot)

      expect(rediscovered.repos.map((repo) => repo.path)).toEqual([
        '.',
        'mlcl',
        'molecule',
        'nested/deep',
      ])
      expect(rediscovered.unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'derives bundle filenames from the repo PATH, so two repos named `api` cannot collide',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'root.txt', 'root\n', 'feat: root')

      for (const path of ['api', 'services/api']) {
        const repo = join(workspace, ...path.split('/'))

        await initRepo(repo)
        await commitFile(repo, 'marker.txt', `${path}\n`, `feat: ${path}`)
      }

      const { repos } = await discoverRepos(exec, workspace)
      const archive = join(root, 'archive')

      await mkdir(archive, { recursive: true })
      expect(repos.map((repo) => repo.path)).toEqual(['.', 'api', 'services/api'])

      for (const repo of repos) {
        const dir = repo.path === '.' ? workspace : join(workspace, repo.path)

        await bundleRepo(exec, dir, bundleFor(archive, repo.path))
      }

      // Three distinct files, and each restores to its own repo's content.
      for (const path of ['api', 'services/api']) {
        const destination = join(root, 'restored', encodeURIComponent(path))

        await restoreRepo(exec, bundleFor(archive, path), destination)
        expect(await readFile(join(destination, 'marker.txt'), 'utf8')).toBe(`${path}\n`)
      }
    },
    TIMEOUT,
  )

  it(
    're-bundling after new commits stays small thanks to delta compression',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)

      const line = 'export const value = 1\n'.repeat(500)

      for (let index = 0; index < 20; index += 1) {
        await commitFile(repo, `file-${index}.ts`, `${line}// ${index}\n`, `feat: ${index}`)
      }

      const first = join(root, 'first.bundle')

      await bundleRepo(exec, repo, first)
      await commitFile(repo, 'file-20.ts', `${line}// 20\n`, 'feat: 20')

      const second = join(root, 'second.bundle')

      await bundleRepo(exec, repo, second)

      const firstSize = (await stat(first)).size
      const secondSize = (await stat(second)).size

      // The full re-archive of 21 near-identical files stays close to the size
      // of one: delta compression is why git is the archive format here.
      expect(secondSize).toBeLessThan(firstSize * 1.5)
      expect(await verifyBundle(exec, second, `${second}.verify-gitdir`)).toBe(true)
    },
    TIMEOUT,
  )
})

describe('discoverRepos — BARE repositories are repositories', () => {
  it(
    'DISCOVERS a bare repo alone in a workspace, instead of the silent { repos: [], unreadable: [] }',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'team-mirror.git')
      const { sha, refs } = await buildBareMirror(mirror, 'lone')

      // The precondition that made it invisible: there is no `.git` entry to
      // match on — the directory IS the git dir.
      expect(await exists(join(mirror, '.git'))).toBe(false)
      expect(refs).toContain('refs/heads/main')
      expect(refs).toContain('refs/tags/v9')

      const discovery = await discoverRepos(exec, workspace)

      // THE BUG, stated as the assertion that used to fail: zero signal. A
      // caller obeying the documented contract ("unreadable is empty =>
      // release") deleted a repository holding the only copy of these refs.
      expect(discovery).not.toEqual({ repos: [], unreadable: [] })

      expect(discovery.repos).toHaveLength(1)
      expect(discovery.unreadable).toEqual([])

      const [discovered] = discovery.repos as [DiscoveredRepo]

      expect(discovered.path).toBe('team-mirror.git')
      expect(discovered.bare).toBe(true)
      // No working tree means nothing can be dirty.
      expect(discovered.dirty).toBe(false)
      expect(discovered.headSha).toBe(sha)
      expect(discovered.branch).toBe('main')
      expect(discovered.remotes).toEqual([])
      expect(discovered.headOnRemoteTrackingRef).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'reports a bare repo ALONGSIDE working repos, and marks only it as bare',
    async () => {
      const { workspace } = await buildTwoCopyWorkspace()

      await buildBareMirror(join(workspace, 'nested', 'archive.git'), 'nested')

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(unreadable).toEqual([])
      expect(repos.map((repo) => [repo.path, repo.bare])).toEqual([
        ['app', false],
        ['nested/archive.git', true],
        ['team-mirror.git', true],
      ])
    },
    TIMEOUT,
  )

  it(
    'never runs `git status` inside a bare repo, and never descends into its object store',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'team-mirror.git')

      await buildBareMirror(mirror, 'no-status')
      // A repo-shaped decoy inside the bare repo's own storage: discovery must
      // not walk in there, exactly as it never walks into `.git`.
      await initRepo(join(mirror, 'decoy'))

      const calls: { args: string[]; cwd: string | undefined }[] = []
      const { repos, unreadable } = await discoverRepos(recordingExec(calls), workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['team-mirror.git'])
      expect(unreadable).toEqual([])

      // `git status` exits 128 in a bare repo ("must be run in a work tree"),
      // which would have thrown the whole repository into `unreadable`. The
      // subcommand is looked for anywhere in the argv, because every command
      // carries the package's pinned `-c` configuration in front of it.
      expect(
        calls.filter((call) => call.args.includes('status') && call.cwd?.startsWith(mirror)),
      ).toEqual([])
      expect((await exec(['status', '--porcelain'], { cwd: mirror })).exitCode).toBe(128)
    },
    TIMEOUT,
  )

  it(
    'is not fooled by a directory that merely LOOKS bare inside another repo',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      // The HEAD + objects/ + refs/ shape, but HEAD is junk, so git resolves it
      // to the ENCLOSING repo. Reporting it would invent a duplicate.
      await mkdir(join(repo, 'looks-bare', 'objects'), { recursive: true })
      await mkdir(join(repo, 'looks-bare', 'refs'), { recursive: true })
      await writeFile(join(repo, 'looks-bare', 'HEAD'), 'total junk\n')

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((discovered) => discovered.path)).toEqual(['repo'])
      expect(repos[0]?.bare).toBe(false)
      expect(unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'reports a bare repo hiding inside a skipped directory rather than hiding it too',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'a.txt', 'a\n', 'feat: a')
      await buildBareMirror(join(workspace, 'node_modules', 'vendored.git'), 'skipped')

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['.'])
      expect(unreadable.map((entry) => entry.path)).toEqual(['node_modules/vendored.git'])
      expect(unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.skippedDirectory)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'checkpointRepo THROWS for a bare repo, and bundleRepo archives it with every ref',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'team-mirror.git')
      const { sha, refs } = await buildBareMirror(mirror, 'archive-me')
      const [discovered] = (await discoverRepos(exec, workspace)).repos as [DiscoveredRepo]

      expect(discovered.bare).toBe(true)

      // Nothing to commit — and the error says what to do instead.
      await expect(checkpointRepo(exec, mirror, 'chore: archive checkpoint')).rejects.toThrow(
        /BARE repository/,
      )
      await expect(checkpointRepo(exec, mirror, 'chore: archive checkpoint')).rejects.toThrow(
        /bundleRepo/,
      )

      // …but it IS archived, normally, and it restores with the exact ref set.
      const bundlePath = join(root, 'mirror.bundle')
      const scratch = join(root, 'scratch')

      await bundleRepo(exec, mirror, bundlePath)
      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)
      expect(await verifyBundleRestorable(exec, bundlePath, scratch)).toBe(true)

      const restored = join(root, 'restored')

      await restoreRepo(exec, bundlePath, restored, { headBranch: discovered.branch as string })

      expect(await refsOf(restored)).toBe(refs)
      expect(await headOf(restored)).toBe(sha)
      expect(await readFile(join(restored, 'only-copy.ts'), 'utf8')).toBe('export const only = 1\n')
    },
    TIMEOUT,
  )
})

describe('headOnRemote — a remote INSIDE the workspace is not an offsite copy', () => {
  it(
    'THE TWO-COPY-LOSS FIXTURE: the in-workspace bare origin answers true, workspaceRoot makes it false',
    async () => {
      const { workspace, app, mirror, sha } = await buildTwoCopyWorkspace()
      const { repos, unreadable } = await discoverRepos(exec, workspace)

      // Both halves of the trap are visible now: the working repo, and the bare
      // mirror it calls `origin` — which lives in the very tree being archived.
      expect(unreadable).toEqual([])
      expect(repos.map((repo) => [repo.path, repo.bare])).toEqual([
        ['app', false],
        ['team-mirror.git', true],
      ])
      expect(repos[0]?.remotes[0]?.url).toBe(mirror)
      expect((await git(['ls-remote', '--heads', 'origin'], app)).trim()).toContain(sha)

      // WITHOUT workspaceRoot: the dangerous answer. It is truthful about the
      // mirror — and the mirror is about to be deleted with the workspace.
      expect(await headOnRemote(exec, app, 'origin')).toBe(true)

      // WITH it: false, so the caller bundles `app` and both copies survive.
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'still says true for a remote OUTSIDE the workspace, which is what an offsite copy means',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.txt', 'a\n', 'feat: a')
      // addRemote() puts the bare repo under root/remotes — outside `workspace`.
      const outside = await addRemote(app, 'offsite.git')

      await git(['push', '-q', 'origin', 'main'], app)

      expect(outside.startsWith(workspace)).toBe(false)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(true)
      // A directory NAME that merely starts with the workspace path is outside it.
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: `${workspace}-other` })).toBe(
        true,
      )
    },
    TIMEOUT,
  )

  it(
    'recognises an in-workspace remote written as file://, and as a relative path',
    async () => {
      const { workspace, app, mirror } = await buildTwoCopyWorkspace()

      await git(['remote', 'set-url', 'origin', `file://${mirror}`], app)
      expect(await headOnRemote(exec, app, 'origin')).toBe(true)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)

      // Relative URLs resolve against the repo, exactly as git resolves them.
      await git(['remote', 'set-url', 'origin', '../team-mirror.git'], app)
      expect(await headOnRemote(exec, app, 'origin')).toBe(true)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)

      // A URL passed directly, rather than a configured remote name, too.
      expect(await headOnRemote(exec, app, mirror, { workspaceRoot: workspace })).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'follows url.<base>.insteadOf, so a rewritten remote cannot smuggle the workspace back in',
    async () => {
      const { workspace, app, mirror } = await buildTwoCopyWorkspace()

      await git(['config', `url.${mirror}.insteadOf`, 'team:'], app)
      await git(['remote', 'set-url', 'origin', 'team:mirror'], app)

      // The configured URL looks like an scp-style host; the EXPANDED one is the
      // in-workspace path, which is the one that matters.
      expect((await git(['ls-remote', '--get-url', 'origin'], app)).trim()).toBe(`${mirror}mirror`)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'keeps failing closed with workspaceRoot: a deleted remote and an unknown name are still false',
    async () => {
      const { workspace, app, mirror } = await buildTwoCopyWorkspace()

      expect(await headOnRemote(exec, app, 'no-such-remote', { workspaceRoot: workspace })).toBe(
        false,
      )
      expect(
        await headOnRemote(exec, app, 'https://example.invalid/nope.git', {
          workspaceRoot: workspace,
        }),
      ).toBe(false)

      await rm(mirror, { recursive: true, force: true })
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)
      expect(await headOnRemote(exec, app, 'origin')).toBe(false)
    },
    TIMEOUT,
  )
})

describe('checkpointRepo — NO commit hook can veto an archival checkpoint', () => {
  /**
   * Every hook git consults for a commit, each of which fails. `--no-verify`
   * skips only `pre-commit` and `commit-msg`; `prepare-commit-msg` is the one
   * that aborted the commit and left the user's work unarchived.
   */
  const COMMIT_HOOKS = [
    'pre-commit',
    'prepare-commit-msg',
    'commit-msg',
    'post-commit',
    'pre-applypatch',
  ] as const

  it.each(COMMIT_HOOKS)(
    'checkpoints despite a failing .git/hooks/%s',
    async (hook) => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await writeFile(
        join(repo, '.git', 'hooks', hook),
        `#!/bin/sh\necho "${hook} blocked the commit" >&2\nexit 1\n`,
        { mode: 0o755 },
      )
      await writeFile(join(repo, 'wip.txt'), 'uncommitted user work\n')

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).toMatch(/^[0-9a-f]{40}$/)
      expect(sha).toBe(await headOf(repo))
      expect((await git(['status', '--porcelain'], repo)).trim()).toBe('')
      expect((await git(['show', '--name-only', '--format=%s', 'HEAD'], repo)).trim()).toContain(
        'wip.txt',
      )
    },
    TIMEOUT,
  )

  it(
    'PROVES WHY --no-verify is not enough: prepare-commit-msg vetoes it, the hooksPath override does not',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await writeFile(
        join(repo, '.git', 'hooks', 'prepare-commit-msg'),
        '#!/bin/sh\necho "commitlint is not installed here" >&2\nexit 1\n',
        { mode: 0o755 },
      )
      await writeFile(join(repo, 'wip.txt'), 'uncommitted user work\n')
      await git(['add', '-A'], repo)

      // The precondition, measured rather than assumed: --no-verify skips
      // pre-commit and commit-msg only, so this hook still runs and aborts.
      const withNoVerify = await exec(['commit', '--no-verify', '--no-gpg-sign', '-m', 'nope'], {
        cwd: repo,
      })

      expect(withNoVerify.exitCode).not.toBe(0)
      expect(withNoVerify.stderr).toContain('commitlint is not installed here')

      // The same commit with git pointed at a hooks directory that cannot exist.
      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toMatch(
        /^[0-9a-f]{40}$/,
      )
      expect((await git(['status', '--porcelain'], repo)).trim()).toBe('')
    },
    TIMEOUT,
  )

  it(
    'checkpoints despite a failing prepare-commit-msg wired the HUSKY way (core.hooksPath)',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await mkdir(join(repo, '.husky'), { recursive: true })
      await writeFile(
        join(repo, '.husky', 'prepare-commit-msg'),
        '#!/bin/sh\necho "husky: commitizen not found" >&2\nexit 1\n',
        { mode: 0o755 },
      )
      await git(['config', 'core.hooksPath', '.husky'], repo)
      await writeFile(join(repo, 'wip.txt'), 'uncommitted user work\n')
      await git(['add', '-A'], repo)

      const withNoVerify = await exec(['commit', '--no-verify', '--no-gpg-sign', '-m', 'nope'], {
        cwd: repo,
      })

      expect(withNoVerify.exitCode).not.toBe(0)
      expect(withNoVerify.stderr).toContain('husky: commitizen not found')

      // A command-line -c beats the repo's own core.hooksPath.
      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).toMatch(
        /^[0-9a-f]{40}$/,
      )
      expect(await readFile(join(repo, '.husky', 'prepare-commit-msg'), 'utf8')).toContain('husky')
      expect((await git(['config', '--get', 'core.hooksPath'], repo)).trim()).toBe('.husky')
    },
    TIMEOUT,
  )
})

describe('restoreRepo — which branch HEAD comes back on', () => {
  /**
   * The measured rows. `expectGuessed` pins what the best-effort fallback
   * actually produces with no `headBranch` — in EVERY row it is a branch the
   * source was not on, which is the whole reason the option exists. Each row
   * asserts it directly rather than by a literal name, because the fallback's
   * answer for an unborn HEAD depends on the DESTINATION's `init.defaultBranch`.
   * No refs are lost in any row: this is fidelity, not data loss.
   */
  const HEAD_ROWS: {
    name: string
    build: (repo: string) => Promise<void>
    expectGuessed: (destination: string) => Promise<void>
  }[] = [
    {
      name: 'other branches at the same tip',
      build: async (repo) => {
        await git(['branch', 'aaa'], repo)
        await git(['branch', 'zzz'], repo)
      },
      // Source was on `main`; the guess takes the first branch in the bundle's
      // ref order that points at HEAD's commit.
      expectGuessed: async (destination) => {
        expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('aaa')
      },
    },
    {
      name: 'a just-merged feature branch at the same tip',
      build: async (repo) => {
        await git(['branch', 'feature/just-merged'], repo)
      },
      expectGuessed: async (destination) => {
        expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe(
          'feature/just-merged',
        )
      },
    },
    {
      name: 'a detached HEAD at a commit a branch also points at',
      build: async (repo) => {
        await git(['checkout', '-q', '--detach'], repo)
      },
      // `headBranch` names a BRANCH, so it cannot express "detached": a source
      // detached at a commit that is also `main`'s tip comes back ON `main`.
      // Every ref and the commit itself are exact; only the checkout differs.
      expectGuessed: async (destination) => {
        expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('main')
      },
    },
    {
      name: 'an unborn HEAD on an orphan branch',
      build: async (repo) => {
        await git(['checkout', '-q', '--orphan', 'brand-new'], repo)
        await git(['rm', '-rq', '--cached', '.'], repo)
        await rm(join(repo, 'a.txt'))
      },
      // Nothing in the bundle carries the unborn branch's NAME, so the fallback
      // leaves HEAD unborn on whatever `git init` chose in the destination —
      // never on `brand-new`, which is what the source was actually on.
      expectGuessed: async (destination) => {
        expect(
          (await exec(['rev-parse', '--verify', 'HEAD'], { cwd: destination })).exitCode,
        ).not.toBe(0)
        expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).not.toBe(
          'brand-new',
        )
      },
    },
  ]

  it.each(HEAD_ROWS)(
    'restores the SOURCE branch when headBranch is passed — $name',
    async ({ build, expectGuessed }) => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await build(repo)

      const [source] = (await discoverRepos(exec, workspace)).repos as [DiscoveredRepo]
      const bundlePath = join(root, 'row.bundle')

      await bundleRepo(exec, repo, bundlePath)

      const sourceBranch = (await exec(['symbolic-ref', '--short', 'HEAD'], { cwd: repo })).stdout
      const sourceRefs = await refsOf(repo)

      // 1. WITHOUT headBranch: the documented best-effort guess.
      const guessed = join(root, 'guessed')

      await restoreRepo(exec, bundlePath, guessed)
      await expectGuessed(guessed)
      // Refs are exact either way: this is FIDELITY, never data loss.
      expect(await refsOf(guessed)).toBe(sourceRefs)

      // 2. WITH headBranch, taken straight from discovery: the source's branch.
      //    A detached source has none to pass (branch === null), so the guess
      //    above is all there is — see the row's comment.
      if (source.branch === null) {
        expect(sourceBranch.trim()).toBe('')
        expect(await headOf(guessed)).toBe(source.headSha)

        return
      }

      const faithful = join(root, 'faithful')

      await restoreRepo(exec, bundlePath, faithful, { headBranch: source.branch })

      expect((await git(['symbolic-ref', '--short', 'HEAD'], faithful)).trim()).toBe(source.branch)
      expect((await git(['symbolic-ref', '--short', 'HEAD'], faithful)).trim()).toBe(
        sourceBranch.trim(),
      )
      expect(await refsOf(faithful)).toBe(sourceRefs)

      if (source.headSha === null) {
        // An unborn HEAD in the source stays unborn — on the SAME branch name.
        expect(
          (await exec(['rev-parse', '--verify', 'HEAD'], { cwd: faithful })).exitCode,
        ).not.toBe(0)
      } else {
        expect(await headOf(faithful)).toBe(source.headSha)
        expect((await git(['status', '--porcelain'], faithful)).trim()).toBe('')
      }
    },
    TIMEOUT,
  )

  it(
    'checks out the requested branch even when it collides with the destination’s default branch',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')
      const destination = join(root, 'restored')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['branch', 'aaa'], repo)
      await bundleRepo(exec, repo, bundlePath)
      // `git init` in the destination points HEAD at `main` too, which is the
      // branch being fetched — the case that needs --update-head-ok.
      await writeFile(join(gitHome, '.gitconfig'), '[init]\n\tdefaultBranch = main\n')

      try {
        await restoreRepo(exec, bundlePath, destination, { headBranch: 'main' })
      } finally {
        await rm(join(gitHome, '.gitconfig'), { force: true })
      }

      expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('main')
      expect(await headOf(destination)).toBe(await headOf(repo))
      expect((await git(['status', '--porcelain'], destination)).trim()).toBe('')
      expect(await refsOf(destination)).toBe(await refsOf(repo))
    },
    TIMEOUT,
  )

  it(
    'accepts a fully-qualified refs/heads/… branch as well as the short name',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['branch', 'aaa'], repo)
      await bundleRepo(exec, repo, bundlePath)

      const destination = join(root, 'restored')

      await restoreRepo(exec, bundlePath, destination, { headBranch: 'refs/heads/main' })

      expect((await git(['symbolic-ref', '--short', 'HEAD'], destination)).trim()).toBe('main')
      expect((await git(['status', '--porcelain'], destination)).trim()).toBe('')
    },
    TIMEOUT,
  )

  it(
    'throws for a headBranch the bundle does not carry — after restoring every ref',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')
      const destination = join(root, 'restored')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['tag', 'v1'], repo)
      await bundleRepo(exec, repo, bundlePath)

      await expect(
        restoreRepo(exec, bundlePath, destination, { headBranch: 'no-such-branch' }),
      ).rejects.toThrow(/carries no such ref/)

      // Nothing was lost: the refs ARE there, only HEAD was not moved.
      expect(await refsOf(destination)).toBe(await refsOf(repo))

      await expect(
        restoreRepo(exec, bundlePath, join(root, 'r2'), { headBranch: '  ' }),
      ).rejects.toThrow(/headBranch was empty/)
    },
    TIMEOUT,
  )
})

/**
 * Archives a workspace exactly the way the module's documented pipeline does,
 * and returns what a caller would then hand the reconstruction gate.
 */
const archiveWorkspace = async (
  workspace: string,
  archive: string,
  options: { skip?: readonly string[] } = {},
): Promise<{
  archived: ArchivedRepo[]
  repos: DiscoveredRepo[]
  unreadable: UnreadableRepo[]
}> => {
  await mkdir(archive, { recursive: true })

  const { repos, unreadable } = await discoverRepos(exec, workspace)
  const archived: ArchivedRepo[] = []
  const dirOf = (path: string): string => (path === '.' ? workspace : join(workspace, path))
  const wanted = repos.filter((repo) => !options.skip?.includes(repo.path))

  // CHECKPOINT EVERYTHING FIRST, DEEPEST FIRST, then bundle — the order the
  // module's @example documents. A submodule or linked worktree shares state
  // with its parent, so committing a child after the parent was bundled would
  // dirty the parent or advance a ref its bundle predates.
  for (const repo of [...wanted].sort(
    (a, b) => b.path.split('/').length - a.path.split('/').length,
  )) {
    if (!repo.bare) {
      await checkpointRepo(exec, dirOf(repo.path), 'chore: archive checkpoint')
    }
  }

  for (const repo of wanted) {
    await bundleRepo(exec, dirOf(repo.path), bundleFor(archive, repo.path))
    archived.push({ repoPath: repo.path, bundlePath: bundleFor(archive, repo.path) })
  }

  return { archived, repos, unreadable }
}

/** Runs the gate against a fresh scratch directory. */
const reconstructionOf = async (
  workspace: string,
  archived: readonly ArchivedRepo[],
  scratchName = 'reconstruct',
): Promise<ReconstructionReport> => {
  const scratch = join(root, scratchName)

  await mkdir(scratch, { recursive: true })

  return verifyWorkspaceReconstruction(exec, workspace, archived, scratch)
}

/** Every mismatch of one kind, for readable assertions. */
const mismatchesOfKind = (report: ReconstructionReport, kind: string): string[] =>
  report.mismatches.filter((mismatch) => mismatch.kind === kind).map((mismatch) => mismatch.path)

/**
 * A workspace holding four repositories of different shapes: the root itself, a
 * nested repo two levels down, a sibling repo, and a BARE mirror.
 */
const buildGateWorkspace = async (): Promise<string> => {
  const workspace = join(root, 'gate-ws')

  await initRepo(workspace)
  await writeFile(
    join(workspace, '.gitignore'),
    ['app/', 'services/', 'team-mirror.git/', ''].join('\n'),
  )
  await commitFile(workspace, 'package.json', '{"name":"ws"}\n', 'chore: workspace glue')

  const api = join(workspace, 'services', 'api')

  await initRepo(api)
  await commitFile(api, 'src/index.ts', 'export const api = 1\n', 'feat: api')
  await git(['tag', 'v1'], api)

  const app = join(workspace, 'app')

  await initRepo(app)
  await commitFile(app, 'src/App.tsx', 'export const App = 1\n', 'feat: app')

  await buildBareMirror(join(workspace, 'team-mirror.git'), 'gate')

  return workspace
}

describe('verifyWorkspaceReconstruction — THE SAFETY GATE', () => {
  it(
    'returns ok:true for a faithful full archive, having really compared every repo',
    async () => {
      const workspace = await buildGateWorkspace()
      const { archived, repos } = await archiveWorkspace(workspace, join(root, 'archive'))

      expect(repos.map((repo) => repo.path)).toEqual([
        '.',
        'app',
        'services/api',
        'team-mirror.git',
      ])

      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)
      // Every archived repo was restored AND compared — not skipped.
      expect(report.checkedRepos).toBe(4)

      // The comparison is real: the restored copies are left in place with the
      // same refs and HEAD as the live repos.
      const restoredApi = join(root, 'reconstruct', encodeURIComponent('services/api'))

      expect(await refsOf(restoredApi)).toBe(await refsOf(join(workspace, 'services', 'api')))
      expect(await headOf(restoredApi)).toBe(await headOf(join(workspace, 'services', 'api')))
    },
    TIMEOUT,
  )

  it(
    'CATCHES A DELIBERATELY MISSED REPO: archiving 2 of 3 is ok:false naming the third',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await writeFile(join(workspace, '.gitignore'), ['api/', 'web/', ''].join('\n'))
      await commitFile(workspace, 'package.json', '{"name":"ws"}\n', 'chore: glue')

      const api = join(workspace, 'api')
      const web = join(workspace, 'web')

      await initRepo(api)
      const apiSha = await commitFile(api, 'server.ts', 'export const s = 1\n', 'feat: server')

      await initRepo(web)
      await commitFile(web, 'client.ts', 'export const c = 1\n', 'feat: client')

      // The archive covers the root and `web` — `api` was never bundled. This is
      // exactly what an unrecognised repo shape produces: discovery reports it
      // or not, and the archive simply does not contain it.
      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['api'],
      })

      expect(archived.map((entry) => entry.repoPath)).toEqual(['.', 'web'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'api',
      ])
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo,
        )?.detail,
      ).toMatch(/NO bundle covers it/)

      // …and the repo really did hold the only copy of that commit.
      expect(apiSha).not.toBe('')
      expect(report.checkedRepos).toBe(2)
    },
    TIMEOUT,
  )

  it(
    'finds an unarchived repo the DUMB enumeration sees even where discovery deliberately does not look',
    async () => {
      const { workspace } = await buildPolyrepoWorkspace()
      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      // discoverRepos SKIPS node_modules (it reports the repo there as
      // `skipped-directory` and never archives it). The gate applies no such
      // judgement: an unarchived repo is an unarchived repo.
      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'node_modules/some-dep',
      ])
    },
    TIMEOUT,
  )

  it(
    'catches a bundle whose CONTENT diverged from the live repo',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      // The live repo moves on AFTER the bundle was written — the archive now
      // holds an older workspace than the one about to be deleted.
      await commitFile(repo, 'src/b.ts', 'export const b = 2\n', 'feat: b')

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(report.checkedRepos).toBe(1)

      const kinds = new Set(report.mismatches.map((mismatch) => mismatch.kind))

      expect(kinds.has(RECONSTRUCTION_MISMATCH_KINDS.headMismatch)).toBe(true)
      expect(kinds.has(RECONSTRUCTION_MISMATCH_KINDS.refMismatch)).toBe(true)
      // The specific PATH of the file that would not come back.
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.contentMismatch)).toEqual([
        'app/src/b.ts',
      ])
    },
    TIMEOUT,
  )

  it(
    'catches STAGED-but-uncommitted content, which no bundle carries, at the same HEAD',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      await writeFile(join(repo, 'src/a.ts'), 'export const a = 999\n')
      await git(['add', '-A'], repo)

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      // HEAD is identical — only the index diverged, which is precisely the
      // difference a HEAD-only check cannot see.
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.headMismatch)).toEqual([])
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.contentMismatch)).toEqual([
        'app/src/a.ts',
      ])
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork)).toEqual([
        'app',
      ])
    },
    TIMEOUT,
  )

  it(
    'catches a CORRUPT bundle, which verifyBundle still calls okay',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const bundlePath = archived[0]?.bundlePath as string
      const { size } = await stat(bundlePath)

      await truncate(bundlePath, Math.floor(size * 0.9))

      // The header check is still happy…
      expect(await verifyBundle(exec, bundlePath, `${bundlePath}.verify-gitdir`)).toBe(true)

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.bundleUnrestorable)).toEqual([
        'app',
      ])
      // Nothing was compared, and the report says so rather than implying a pass.
      expect(report.checkedRepos).toBe(0)
    },
    TIMEOUT,
  )

  it(
    'catches uncommitted work the checkpoint step never committed',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      // A caller that skipped (or swallowed a failure from) checkpointRepo.
      await writeFile(join(repo, 'src/never-archived.ts'), 'export const wip = 1\n')

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork)).toEqual([
        'app',
      ])
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork,
        )?.detail,
      ).toMatch(/never-archived\.ts/)
    },
    TIMEOUT,
  )

  it(
    'reproduces a DETACHED HEAD exactly, so it is not reported as a difference',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')
      // Detached at a commit `main` also points at — the case a branch name
      // cannot express.
      await git(['checkout', '-q', '--detach'], repo)

      const { archived, repos } = await archiveWorkspace(workspace, join(root, 'archive'))

      expect(repos[0]?.branch).toBeNull()

      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)

      const restored = join(root, 'reconstruct', encodeURIComponent('app'))

      expect(
        (await exec(['symbolic-ref', '--quiet', 'HEAD'], { cwd: restored })).exitCode,
      ).not.toBe(0)
      expect(await headOf(restored)).toBe(await headOf(repo))
    },
    TIMEOUT,
  )

  it(
    'reports an archived repo that is not on disk instead of assuming it matched',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'src/a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, [
        ...archived,
        { repoPath: 'ghost', bundlePath: bundleFor(join(root, 'archive'), 'ghost') },
      ])

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unverifiableRepo)).toEqual([
        'ghost',
      ])
      // …and the enumeration self-check notices that a repo it was told about is
      // not one it can see, so its silence about OTHER repos means nothing.
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.enumerationIncomplete)).toEqual(
        ['ghost'],
      )
    },
    TIMEOUT,
  )

  it(
    'THROWS for a broken precondition rather than reporting a clean workspace',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await commitFile(workspace, 'a.txt', 'a\n', 'feat: a')

      await expect(
        verifyWorkspaceReconstruction(exec, join(root, 'no-such-workspace'), [], join(root, 'ok')),
      ).rejects.toThrow(/workspaceRoot/)

      await expect(
        verifyWorkspaceReconstruction(exec, workspace, [], join(root, 'no-such-scratch')),
      ).rejects.toThrow(/scratchDir/)
    },
    TIMEOUT,
  )

  it(
    'never throws for a mismatch — every problem in the workspace is reported at once',
    async () => {
      const workspace = join(root, 'ws')

      await initRepo(workspace)
      await writeFile(join(workspace, '.gitignore'), ['api/', 'web/', ''].join('\n'))
      await commitFile(workspace, 'package.json', '{"name":"ws"}\n', 'chore: glue')

      const api = join(workspace, 'api')
      const web = join(workspace, 'web')

      await initRepo(api)
      await commitFile(api, 'server.ts', 'export const s = 1\n', 'feat: server')
      await initRepo(web)
      await commitFile(web, 'client.ts', 'export const c = 1\n', 'feat: client')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['web'],
      })

      // Break the surviving bundle too, and leave uncommitted work behind.
      await truncate(bundleFor(join(root, 'archive'), 'api'), 32)
      await writeFile(join(workspace, 'untracked.txt'), 'wip\n')

      const report = await reconstructionOf(workspace, archived)
      const kinds = new Set(report.mismatches.map((mismatch) => mismatch.kind))

      expect(report.ok).toBe(false)
      expect(kinds.has(RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toBe(true)
      expect(kinds.has(RECONSTRUCTION_MISMATCH_KINDS.bundleUnrestorable)).toBe(true)
      expect(kinds.has(RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork)).toBe(true)
    },
    TIMEOUT,
  )
})

describe('discoverRepos — a rejected bare-SHAPED directory never removes its subtree', () => {
  /**
   * The measured shape: an interrupted copy of a bare mirror (a zero-length
   * `HEAD` beside `objects/` and `refs/`) with a REAL repository underneath it
   * whose commits exist nowhere else.
   */
  const buildPartialMirror = async (workspace: string): Promise<string> => {
    const partial = join(workspace, 'partial-mirror')

    await mkdir(join(partial, 'objects'), { recursive: true })
    await mkdir(join(partial, 'refs'), { recursive: true })
    await writeFile(join(partial, 'HEAD'), '')

    const buried = join(partial, 'realproject')

    await initRepo(buried)

    return commitFile(buried, 'only-here.ts', 'export const only = 1\n', 'feat: only copy')
  }

  it(
    'still finds the repo beneath one git attributes to the ENCLOSING repo',
    async () => {
      const workspace = join(root, 'ws')

      // The workspace root is itself a repo — the polyrepo shape — which is what
      // makes git resolve the look-alike UPWARDS instead of refusing it.
      await initRepo(workspace)
      await commitFile(workspace, 'package.json', '{"name":"ws"}\n', 'chore: glue')

      const buriedSha = await buildPartialMirror(workspace)
      const { repos, unreadable } = await discoverRepos(exec, workspace)

      // THE BUG, as the assertion that used to fail: `{ repos: ['.'],
      // unreadable: [] }` — the buried repo was reported NOWHERE, and a caller
      // obeying the contract deleted it.
      expect(repos.map((repo) => repo.path)).toEqual(['.', 'partial-mirror/realproject'])
      expect(repos[1]?.headSha).toBe(buriedSha)
      // Nothing is unreadable: the subtree WAS searched, so there is no gap to
      // report — the look-alike is simply not a repository.
      expect(unreadable).toEqual([])
    },
    TIMEOUT,
  )

  it(
    'records one git REFUSES in `unreadable` and still finds the repo beneath it',
    async () => {
      // No enclosing repo, so git has nothing to resolve the look-alike to and
      // exits 128 instead.
      const workspace = join(root, 'ws')

      await mkdir(workspace, { recursive: true })

      const buriedSha = await buildPartialMirror(workspace)
      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(unreadable.map((entry) => entry.path)).toEqual(['partial-mirror'])
      expect(unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.gitRefused)).toBe(true)
      // …AND the subtree was still searched: a directory git cannot open must
      // not take every repository below it out of the results.
      expect(repos.map((repo) => repo.path)).toEqual(['partial-mirror/realproject'])
      expect(repos[0]?.headSha).toBe(buriedSha)
    },
    TIMEOUT,
  )

  it(
    'still finds the repo beneath a DANGLING-SYMLINK look-alike',
    async () => {
      const workspace = join(root, 'ws')
      const decoy = join(workspace, 'decoy')

      await initRepo(workspace)
      await commitFile(workspace, 'package.json', '{"name":"ws"}\n', 'chore: glue')
      await mkdir(decoy, { recursive: true })
      // The cheapest possible look-alike: three dangling symlinks.
      await symlink(join(root, 'nowhere-head'), join(decoy, 'HEAD'))
      await symlink(join(root, 'nowhere-objects'), join(decoy, 'objects'), 'dir')
      await symlink(join(root, 'nowhere-refs'), join(decoy, 'refs'), 'dir')

      const buried = join(decoy, 'realproject')

      await initRepo(buried)
      const buriedSha = await commitFile(buried, 'only.ts', 'export const only = 1\n', 'feat: only')

      const { repos } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toContain('decoy/realproject')
      expect(repos.find((repo) => repo.path === 'decoy/realproject')?.headSha).toBe(buriedSha)
    },
    TIMEOUT,
  )

  it(
    'still discovers a bare mirror whose config claims core.bare = false',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'team-mirror.git')
      const { sha } = await buildBareMirror(mirror, 'hand-edited')

      // Hand-edited, or copied from a working repo: git answers
      // `--is-bare-repository false` while there is still no working tree, and
      // every work-tree command exits 128.
      await git(['config', 'core.bare', 'false'], mirror)
      expect((await exec(['status', '--porcelain'], { cwd: mirror })).exitCode).toBe(128)

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(unreadable).toEqual([])
      expect(repos.map((repo) => [repo.path, repo.bare, repo.dirty])).toEqual([
        ['team-mirror.git', true, false],
      ])
      expect(repos[0]?.headSha).toBe(sha)
    },
    TIMEOUT,
  )

  it(
    'reports a symlinked directory pointing OUT of the workspace, but not one pointing back in',
    async () => {
      const workspace = join(root, 'ws')
      const real = join(workspace, 'real')
      const outside = join(root, 'outside-project')

      await initRepo(real)
      await commitFile(real, 'a.txt', 'a\n', 'feat: a')
      await mkdir(outside, { recursive: true })
      await writeFile(join(outside, 'notes.txt'), 'user work\n')

      // Points back INTO the workspace: the walk reaches `real` on its own, so
      // there is no gap to report.
      await symlink(real, join(workspace, 'inside-link'), 'dir')
      // Points OUT: never followed, never searched, never archived.
      await symlink(outside, join(workspace, 'outside-link'), 'dir')
      // A symlinked FILE cannot hide a repository and must not be reported.
      await symlink(join(real, 'a.txt'), join(workspace, 'file-link'))

      const { repos, unreadable } = await discoverRepos(exec, workspace)

      expect(repos.map((repo) => repo.path)).toEqual(['real'])
      expect(unreadable.map((entry) => entry.path)).toEqual(['outside-link'])
      expect(unreadable[0]?.reason.startsWith(UNREADABLE_REASONS.symlinkedDirectory)).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'tells a caller to SKIP an empty bare mirror instead of giving impossible advice',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'fresh-mirror.git')

      await mkdir(mirror, { recursive: true })
      await git(['init', '--bare', '-b', 'main'], mirror)

      const [discovered] = (await discoverRepos(exec, workspace)).repos as [DiscoveredRepo]

      expect(discovered.bare).toBe(true)

      // checkpointRepo is impossible for it…
      await expect(checkpointRepo(exec, mirror, 'chore: archive checkpoint')).rejects.toThrow(
        /BARE repository/,
      )

      // …so the bundle error must not tell the caller to checkpoint it first.
      await expect(bundleRepo(exec, mirror, join(root, 'empty.bundle'))).rejects.toThrow(
        /EMPTY BARE repository/,
      )
      await expect(bundleRepo(exec, mirror, join(root, 'empty.bundle'))).rejects.toThrow(/SKIP it/)
    },
    TIMEOUT,
  )
})

describe('headOnRemote — a SYMLINK cannot defeat the containment check', () => {
  it(
    'answers false for an in-workspace mirror reached through a symlinked remote URL',
    async () => {
      const { workspace, app, mirror } = await buildTwoCopyWorkspace()
      const link = join(root, 'link-to-mirror')

      // `origin` is a path OUTSIDE the workspace by spelling, whose target is
      // the bare mirror INSIDE it. Arithmetic said "offsite"; the workspace
      // deletion takes both copies.
      await symlink(mirror, link, 'dir')
      await git(['remote', 'set-url', 'origin', link], app)

      expect(await headOnRemote(exec, app, 'origin')).toBe(true)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'answers false when the WORKSPACE ROOT is handed in as a symlink',
    async () => {
      const { workspace, app } = await buildTwoCopyWorkspace()
      const linkedRoot = join(root, 'workspace-link')

      // The same directory, spelled two ways (`/workspace` → `/data/…`, or
      // macOS `/tmp` → `/private/tmp`). It must not give opposite answers.
      await symlink(workspace, linkedRoot, 'dir')

      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(false)
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: linkedRoot })).toBe(false)
    },
    TIMEOUT,
  )

  it(
    'still answers true for a genuinely offsite remote reached through a symlink',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.txt', 'a\n', 'feat: a')

      const outside = await addRemote(app, 'offsite.git')
      const link = join(root, 'link-to-offsite')

      await git(['push', '-q', 'origin', 'main'], app)
      await symlink(outside, link, 'dir')
      await git(['remote', 'set-url', 'origin', link], app)

      // Resolving paths must not turn every local remote into "inside".
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(true)
    },
    TIMEOUT,
  )
})

describe('checkpointRepo — NO content filter can veto an archival checkpoint', () => {
  /**
   * The verbatim git-lfs install shape, with the filter's program guaranteed
   * absent (named so a host that HAS git-lfs cannot rescue the fixture): this is
   * the archival sandbox that made every git-lfs project fail to archive.
   */
  const buildFilteredRepo = async (dir: string): Promise<void> => {
    await initRepo(dir)
    await writeFile(join(dir, '.gitattributes'), '*.psd filter=lfs -text\n')
    await git(['add', '-A'], dir)
    await git(['commit', '-m', 'chore: attributes'], dir)
    await git(['config', 'filter.lfs.clean', 'molecule-absent-lfs clean -- %f'], dir)
    await git(['config', 'filter.lfs.smudge', 'molecule-absent-lfs smudge -- %f'], dir)
    await git(['config', 'filter.lfs.process', 'molecule-absent-lfs filter-process'], dir)
    await git(['config', 'filter.lfs.required', 'true'], dir)
  }

  it(
    'checkpoints a NEW filtered file, storing its exact bytes — where plain git add fails',
    async () => {
      const repo = join(root, 'repo')

      await buildFilteredRepo(repo)
      await writeFile(join(repo, 'art.psd'), 'RAW-PSD-BYTES')

      // PROVES WHY: the ordinary staging path is vetoed by the filter.
      expect((await exec(['add', '-A'], { cwd: repo })).exitCode).not.toBe(0)

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).not.toBeNull()
      // Never mangled, never a placeholder: the archive holds the real bytes.
      expect(await git(['cat-file', '-p', 'HEAD:art.psd'], repo)).toBe('RAW-PSD-BYTES')
    },
    TIMEOUT,
  )

  it(
    'checkpoints a MODIFIED filtered file, where even git status is vetoed',
    async () => {
      const repo = join(root, 'repo')

      await buildFilteredRepo(repo)
      // Commit the file first, then modify it IN PLACE at the same size: git
      // short-circuits on a changed size, so only a same-size edit forces it to
      // re-read the content — which runs the clean filter and makes `git status`
      // itself exit 128, before anything can be staged.
      await writeFile(join(repo, 'art.psd'), 'ORIGINAL-BYTES')
      await git(['-c', 'filter.lfs.process=', '-c', 'filter.lfs.required=false', 'add', '-A'], repo)
      await git(
        [
          '-c',
          'filter.lfs.process=',
          '-c',
          'filter.lfs.required=false',
          'commit',
          '-m',
          'feat: art',
        ],
        repo,
      )
      await writeFile(join(repo, 'art.psd'), 'MODIFIED-BYTES')

      expect((await exec(['status', '--porcelain'], { cwd: repo })).exitCode).not.toBe(0)

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).not.toBeNull()
      expect(await git(['cat-file', '-p', 'HEAD:art.psd'], repo)).toBe('MODIFIED-BYTES')
    },
    TIMEOUT,
  )

  it(
    'NEUTRALISES a filter that WORKS — a clean filter is host code and must not run',
    async () => {
      const repo = join(root, 'repo')

      await initRepo(repo)
      await writeFile(join(repo, '.gitattributes'), '*.txt filter=upper -text\n')
      // A clean filter is an ARBITRARY COMMAND the repository configures, and
      // checkpointRepo runs on the control-plane host against a copy of a repo the
      // tenant controls. Even a benign-looking one (`tr a-z A-Z`) must be
      // neutralised: the archiver cannot tell it from `sh -c '<payload>; cat'`, and
      // a malicious filter succeeds (exits 0), so "only disable it if it breaks"
      // is no defence. The cost is raw bytes in the archive instead of filtered
      // content, which filters.ts measures as strictly better for an archive.
      await git(['config', 'filter.upper.clean', 'tr a-z A-Z'], repo)
      await git(['config', 'filter.upper.required', 'true'], repo)
      await git(['add', '-A'], repo)
      await git(['commit', '-m', 'chore: attributes'], repo)
      await writeFile(join(repo, 'note.txt'), 'quiet words\n')

      expect(await checkpointRepo(exec, repo, 'chore: archive checkpoint')).not.toBeNull()
      // RAW bytes, not 'QUIET WORDS\n' — proof the clean filter never executed.
      expect(await git(['cat-file', '-p', 'HEAD:note.txt'], repo)).toBe('quiet words\n')
    },
    TIMEOUT,
  )

  it(
    'does NOT execute a MALICIOUS clean filter, and archives the raw bytes instead',
    async () => {
      const repo = join(root, 'repo')
      const marker = join(root, 'CLEAN_FILTER_RAN')

      await initRepo(repo)
      await writeFile(join(repo, '.gitattributes'), '*.txt filter=evil -text\n')
      // The exact exploit shape: a clean filter that runs a side effect and then
      // echoes content through, so it SUCCEEDS (exit 0). The old reactive design
      // ("neutralise only after a command fails") never fired here — the payload
      // had already run during `git add`.
      await git(
        ['config', 'filter.evil.clean', `sh -c 'touch ${JSON.stringify(marker)}; cat'`],
        repo,
      )
      await writeFile(join(repo, 'note.txt'), 'hello\n')

      const sha = await checkpointRepo(exec, repo, 'chore: archive checkpoint')

      expect(sha).not.toBeNull()
      // The side effect never happened: the filter did not run on the host.
      await expect(stat(marker)).rejects.toMatchObject({ code: 'ENOENT' })
      // ...and the raw bytes were archived, so no work was lost to the neutralisation.
      expect(await git(['cat-file', '-p', 'HEAD:note.txt'], repo)).toBe('hello\n')
    },
    TIMEOUT,
  )

  it(
    'THROWS when staging genuinely fails, and commits nothing',
    async () => {
      const repo = join(root, 'repo')

      await buildFilteredRepo(repo)
      await writeFile(join(repo, 'art.psd'), 'RAW-PSD-BYTES')

      // Staging fails for a real reason (a full disk, a corrupt index) EVEN THOUGH
      // filters are already neutralised — archival must stop loudly, not commit a
      // half-staged tree.
      const stubbornExec: GitExec = (args, options) =>
        args.includes('add')
          ? Promise.resolve({ stdout: '', stderr: 'error: unable to write index', exitCode: 128 })
          : exec(args, options)

      await expect(checkpointRepo(stubbornExec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /add -A failed .* unable to write index/,
      )
      // The filters were already neutralised in the failing argv — so the failure
      // is reported as a plain git error, not blamed on a filter.
      await expect(checkpointRepo(stubbornExec, repo, 'chore: archive checkpoint')).rejects.toThrow(
        /filter\.lfs\.clean=/,
      )

      // Nothing was committed: HEAD is still the attributes commit.
      expect((await git(['log', '--oneline'], repo)).trim().split('\n')).toHaveLength(1)
    },
    TIMEOUT,
  )

  it(
    'archives a filtered repo end to end, and the reconstruction gate passes it',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'design')

      await buildFilteredRepo(repo)
      await writeFile(join(repo, 'art.psd'), 'RAW-PSD-BYTES')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)
      expect(report.checkedRepos).toBe(1)
      expect(
        await readFile(join(root, 'reconstruct', encodeURIComponent('design'), 'art.psd'), 'utf8'),
      ).toBe('RAW-PSD-BYTES')
    },
    TIMEOUT,
  )
})

describe('restoreRepo — a DETACHED source comes back detached', () => {
  it(
    'restores detached at the same commit, not onto a branch that merely shares it',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'repo')
      const bundlePath = join(root, 'r.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await git(['checkout', '-q', '--detach'], repo)

      const [source] = (await discoverRepos(exec, workspace)).repos as [DiscoveredRepo]

      expect(source.branch).toBeNull()
      expect(source.headSha).not.toBeNull()

      await bundleRepo(exec, repo, bundlePath)

      // Without the option: the documented guess puts HEAD on `main`.
      const guessed = join(root, 'guessed')

      await restoreRepo(exec, bundlePath, guessed)
      expect((await git(['symbolic-ref', '--short', 'HEAD'], guessed)).trim()).toBe('main')

      // With it: detached, exactly as the source was.
      const faithful = join(root, 'faithful')

      await restoreRepo(exec, bundlePath, faithful, { detachedHead: true })

      expect(
        (await exec(['symbolic-ref', '--quiet', 'HEAD'], { cwd: faithful })).exitCode,
      ).not.toBe(0)
      expect(await headOf(faithful)).toBe(source.headSha)
      expect(await refsOf(faithful)).toBe(await refsOf(repo))
      expect((await git(['status', '--porcelain'], faithful)).trim()).toBe('')
    },
    TIMEOUT,
  )

  it(
    'refuses the two HEAD states together, and refuses detached for an unborn bundle',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)

      await expect(
        restoreRepo(exec, bundlePath, join(root, 'both'), {
          headBranch: 'main',
          detachedHead: true,
        }),
      ).rejects.toThrow(/only one may be given/)

      // A source with an UNBORN head carries no HEAD in its bundle, so
      // "detached" is not a state it can be restored into.
      const orphan = join(root, 'orphan')
      const orphanBundle = join(root, 'orphan.bundle')

      await initRepo(orphan)
      await commitFile(orphan, 'a.txt', 'a\n', 'feat: a')
      await git(['checkout', '-q', '--orphan', 'brand-new'], orphan)
      await git(['rm', '-rq', '--cached', '.'], orphan)
      await rm(join(orphan, 'a.txt'))
      await bundleRepo(exec, orphan, orphanBundle)

      await expect(
        restoreRepo(exec, orphanBundle, join(root, 'unborn'), { detachedHead: true }),
      ).rejects.toThrow(/HEAD was UNBORN/)
    },
    TIMEOUT,
  )
})

describe('a bundle damaged enough to carry NOTHING must never look restorable', () => {
  it(
    'refuses a bundle that lists no refs, which git fetch otherwise reports as success',
    async () => {
      const repo = join(root, 'repo')
      const bundlePath = join(root, 'r.bundle')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'the only copy\n', 'feat: a')
      await bundleRepo(exec, repo, bundlePath)

      // Cut to 32 bytes: enough header survives that `git fetch` exits 0 having
      // transferred NOTHING, so the restore used to "succeed" into an empty
      // repository — and verifyBundleRestorable answered TRUE for an archive
      // holding none of the user's work.
      await truncate(bundlePath, 32)

      await expect(restoreRepo(exec, bundlePath, join(root, 'restored'))).rejects.toThrow(
        /lists NO refs/,
      )
      expect(await verifyBundleRestorable(exec, bundlePath, join(root, 'scratch'))).toBe(false)
    },
    TIMEOUT,
  )
})

describe('the gate fails LOUDLY when its own enumeration cannot run', () => {
  /**
   * An executor that runs git normally but cannot reach any non-git program.
   *
   * Matched on the alias appearing ANYWHERE in the argv, because every command
   * is prefixed with the package's pinned `-c` configuration.
   */
  const noShellExec: GitExec = (args, options) =>
    args.some((arg) => arg.startsWith('alias.'))
      ? Promise.resolve({
          stdout: '',
          stderr: "fatal: while expanding alias: 'find': No such file or directory",
          exitCode: 128,
        })
      : exec(args, options)

  it(
    'THROWS rather than reporting that nothing is unarchived',
    async () => {
      const workspace = join(root, 'ws')
      const repo = join(workspace, 'app')

      await initRepo(repo)
      await commitFile(repo, 'a.txt', 'a\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const scratch = join(root, 'reconstruct')

      await mkdir(scratch, { recursive: true })

      // Without an enumeration there is no second opinion, and a report of
      // `ok: true` would be a guarantee this function cannot make.
      await expect(
        verifyWorkspaceReconstruction(noShellExec, workspace, archived, scratch),
      ).rejects.toThrow(/independent enumeration/)
    },
    TIMEOUT,
  )

  it(
    'makes headOnRemote fail closed for a LOCAL remote it cannot place',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.txt', 'a\n', 'feat: a')

      const outside = await addRemote(app, 'offsite.git')

      await git(['push', '-q', 'origin', 'main'], app)
      expect(outside.startsWith(workspace)).toBe(false)

      // With path canonicalisation available, an outside remote is offsite…
      expect(await headOnRemote(exec, app, 'origin', { workspaceRoot: workspace })).toBe(true)
      // …without it, "outside" cannot be proven, so the repo gets bundled.
      expect(await headOnRemote(noShellExec, app, 'origin', { workspaceRoot: workspace })).toBe(
        false,
      )
      // A NETWORK remote never needed resolving, so it is unaffected.
      await git(['remote', 'set-url', 'origin', 'https://example.invalid/nope.git'], app)
      expect(await headOnRemote(noShellExec, app, 'origin', { workspaceRoot: workspace })).toBe(
        false,
      )
    },
    TIMEOUT,
  )
})

describe('verifyWorkspaceReconstruction — nothing to archive vs something unarchived', () => {
  it(
    'accepts an EMPTY bare mirror no bundle could ever cover, and still reports one that holds work',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.txt', 'a\n', 'feat: a')

      // A mirror nothing has been pushed to: git refuses to bundle it, so it
      // CANNOT appear in the archive however carefully the caller works.
      const empty = join(workspace, 'fresh-mirror.git')

      await mkdir(empty, { recursive: true })
      await git(['init', '--bare', '-b', 'main'], empty)

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['fresh-mirror.git'],
      })

      expect(archived.map((entry) => entry.repoPath)).toEqual(['app'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)

      // …but the moment that mirror holds a single ref, skipping it is a loss
      // the gate refuses to sign off.
      await buildBareMirror(join(workspace, 'real-mirror.git'), 'gate-empty')

      const second = await reconstructionOf(workspace, archived, 'reconstruct-2')

      expect(second.ok).toBe(false)
      expect(mismatchesOfKind(second, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'real-mirror.git',
      ])
    },
    TIMEOUT,
  )

  it(
    'reports an unarchived repo whose only work is UNCOMMITTED, which has no refs either',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.txt', 'a\n', 'feat: a')

      // A fresh `git init` with unstaged work: no refs, no commits — but the
      // file on disk is the user's only copy, so "empty" it is not.
      const fresh = join(workspace, 'scratch-project')

      await initRepo(fresh)
      await writeFile(join(fresh, 'idea.md'), '# the only copy\n')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['scratch-project'],
      })
      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'scratch-project',
      ])
    },
    TIMEOUT,
  )
})

describe('the gate runs git HERMETICALLY — the repo being inspected cannot blind the inspector', () => {
  /**
   * The measured blinding: one ordinary large-repo performance setting makes
   * `git status --porcelain` print NOTHING about untracked files, which silenced
   * the checkpoint AND the gate at once.
   */
  const buildBlindedRepo = async (dir: string): Promise<void> => {
    await initRepo(dir)
    await commitFile(dir, 'a.ts', 'export const a = 1\n', 'feat: a')
    await git(['config', 'status.showUntrackedFiles', 'no'], dir)
  }

  it(
    'archives untracked work in a repo configured to hide it (status.showUntrackedFiles=no)',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await buildBlindedRepo(app)
      await writeFile(join(app, 'NEW-DESIGN.md'), '# the new design\n')
      await mkdir(join(app, 'newfeature'), { recursive: true })
      await writeFile(join(app, 'newfeature', 'impl.ts'), 'export const impl = 1\n')

      // PROVES THE BLINDING IS REAL: an unpinned inspector sees a clean tree.
      expect((await git(['status', '--porcelain'], app)).trim()).toBe('')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)

      // …and `ok` means it: both files really came back.
      const restored = join(root, 'reconstruct', encodeURIComponent('app'))

      expect(await readFile(join(restored, 'NEW-DESIGN.md'), 'utf8')).toBe('# the new design\n')
      expect(await readFile(join(restored, 'newfeature', 'impl.ts'), 'utf8')).toBe(
        'export const impl = 1\n',
      )
    },
    TIMEOUT,
  )

  it(
    'reports uncommitted work in such a repo instead of reading its silence as clean',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await buildBlindedRepo(app)

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      // Work that appears AFTER the checkpoint — the case the gate exists for.
      await writeFile(join(app, 'never-archived.ts'), 'export const wip = 1\n')
      expect((await git(['status', '--porcelain'], app)).trim()).toBe('')

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork)).toEqual([
        'app',
      ])
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.uncommittedWork,
        )?.detail,
      ).toMatch(/never-archived\.ts/)
    },
    TIMEOUT,
  )

  it(
    'is not fooled into calling a blinded repo with no commits "provably empty"',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')
      const scratchRepo = join(workspace, 'scratch')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')

      // No refs, an unborn HEAD, and one untracked file the repo will not admit
      // to: `git bundle create` cannot archive it, so the coverage check must not
      // wave it through as "nothing here".
      await initRepo(scratchRepo)
      await git(['config', 'status.showUntrackedFiles', 'no'], scratchRepo)
      await writeFile(join(scratchRepo, 'prototype.ts'), 'export const prototype = 1\n')
      expect((await git(['status', '--porcelain'], scratchRepo)).trim()).toBe('')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['scratch'],
      })
      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'scratch',
      ])
    },
    TIMEOUT,
  )

  it(
    'defeats a host-level core.excludesFile that hides new work from status and from git add -A',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')
      const excludes = join(root, 'host-excludes')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')
      await writeFile(excludes, 'SECRET-PLAN.md\n')
      await git(['config', 'core.excludesFile', excludes], app)
      await writeFile(join(app, 'SECRET-PLAN.md'), '# the only copy\n')

      // The host's ignore file, not the project's: an unpinned inspector is blind.
      expect((await git(['status', '--porcelain'], app)).trim()).toBe('')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)
      expect(
        await readFile(
          join(root, 'reconstruct', encodeURIComponent('app'), 'SECRET-PLAN.md'),
          'utf8',
        ),
      ).toBe('# the only copy\n')
    },
    TIMEOUT,
  )
})

describe('the gate reports tracked content it CANNOT SEE (skip-worktree / assume-unchanged)', () => {
  it(
    'refuses an archive whose hidden files would restore to the wrong bytes',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await writeFile(join(app, 'config.ini'), 'endpoint=staging\n')
      await writeFile(join(app, 'creds.env.tracked'), 'TOKEN=placeholder\n')
      await commitFile(app, 'README.md', '# app\n', 'feat: app')
      // The documented git recipe for keeping local edits to a tracked file out
      // of commits — and what sparse-checkout sets.
      await git(['update-index', '--skip-worktree', 'config.ini'], app)
      await git(['update-index', '--assume-unchanged', 'creds.env.tracked'], app)
      await writeFile(join(app, 'config.ini'), 'endpoint=PRODUCTION-REAL-USER-EDIT\n')
      await writeFile(join(app, 'creds.env.tracked'), 'TOKEN=sk-live-realsecret\n')

      // Both index bits hide the edits from every ordinary check.
      expect((await git(['status', '--porcelain'], app)).trim()).toBe('')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unattestableContent)).toEqual([
        'app/config.ini',
        'app/creds.env.tracked',
      ])
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.unattestableContent,
        )?.detail,
      ).toMatch(/--no-skip-worktree/)

      // …and the refusal is not pedantic: the archive really holds the OLD bytes.
      const restored = join(root, 'reconstruct', encodeURIComponent('app'))

      expect(await readFile(join(restored, 'config.ini'), 'utf8')).toBe('endpoint=staging\n')
      expect(await readFile(join(restored, 'creds.env.tracked'), 'utf8')).toBe(
        'TOKEN=placeholder\n',
      )
    },
    TIMEOUT,
  )
})

describe('bareness is OBSERVED, never taken from core.bare', () => {
  it(
    'archives the working tree of a repository that merely CLAIMS to be bare',
    async () => {
      const workspace = join(root, 'ws')
      const proj = join(workspace, 'proj')

      await initRepo(proj)
      await commitFile(proj, 'committed.ts', 'export const v = 1\n', 'feat: v1')
      await git(['config', 'core.bare', 'true'], proj)
      await writeFile(join(proj, 'committed.ts'), 'export const v = 2 // REAL USER EDIT\n')
      await writeFile(join(proj, 'UNTRACKED-WORK.ts'), 'export const wip = 1\n')

      // The claim is what every work-tree command believes…
      expect((await exec(['status', '--porcelain'], { cwd: proj })).exitCode).toBe(128)

      // …but the directory is not its own git dir, so discovery does not.
      const { repos } = await discoverRepos(exec, workspace)

      expect(
        repos.map((repo) => `${repo.path}:${String(repo.bare)}:${String(repo.dirty)}`),
      ).toEqual(['proj:false:true'])

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)

      const restored = join(root, 'reconstruct', encodeURIComponent('proj'))

      expect(await readFile(join(restored, 'committed.ts'), 'utf8')).toBe(
        'export const v = 2 // REAL USER EDIT\n',
      )
      expect(await readFile(join(restored, 'UNTRACKED-WORK.ts'), 'utf8')).toBe(
        'export const wip = 1\n',
      )
    },
    TIMEOUT,
  )
})

describe('an archived BARE repo narrows coverage for nothing beyond its own object store', () => {
  it(
    'reports a real repository nested INSIDE an archived mirror',
    async () => {
      const workspace = join(root, 'ws')
      const mirror = join(workspace, 'mirror.git')

      await mkdir(workspace, { recursive: true })
      await buildBareMirror(mirror, 'nested-under-mirror')

      const work = join(mirror, 'incoming', 'work')

      await initRepo(work)
      await commitFile(work, 'ONLY-COPY.ts', 'export const only = 1\n', 'feat: only copy')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      expect(archived.map((entry) => entry.repoPath)).toEqual(['mirror.git'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      // Exactly the nested repository — the mirror's own object store is still
      // recognised as the archived mirror's, so the report is not noise.
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'mirror.git/incoming/work',
      ])
    },
    TIMEOUT,
  )

  it(
    'reports every repository in a workspace whose ROOT is an archived bare repo',
    async () => {
      const workspace = join(root, 'ws')

      // The shape that turned the whole coverage check into a no-op: with the
      // root itself bare, a path-prefix rule matched EVERY path in the workspace.
      await buildBareMirror(workspace, 'bare-root')

      const checkout = join(workspace, 'checkout')

      await initRepo(checkout)
      await commitFile(checkout, 'IMPORTANT.ts', 'export const important = 1\n', 'feat: important')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))

      expect(archived.map((entry) => entry.repoPath)).toEqual(['.'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'checkout',
      ])
    },
    TIMEOUT,
  )
})

describe('a PACKED mirror with no refs/ DIRECTORY is still a repository', () => {
  it(
    'is enumerated by the gate and reported as unarchived, not silently dropped',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')
      const mirror = join(workspace, 'mirror.git')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')

      const { sha } = await buildBareMirror(mirror, 'packed')

      // `git gc`/`pack-refs` is the normal state of an idle mirror, and an empty
      // `refs/` does not survive a zip or an object-storage key sync.
      await git(['pack-refs', '--all'], mirror)
      await rm(join(mirror, 'refs'), { recursive: true, force: true })
      expect(await exists(join(mirror, 'packed-refs'))).toBe(true)
      expect(await exists(join(mirror, 'refs'))).toBe(false)

      const { archived, repos, unreadable } = await archiveWorkspace(
        workspace,
        join(root, 'archive'),
      )

      expect(archived.map((entry) => entry.repoPath)).toEqual(['app'])
      expect(repos.map((repo) => repo.path)).toEqual(['app'])
      // Discovery cannot open it (git refuses a git dir with no refs/), but it is
      // NOT invisible: it is reported as a place work may live.
      expect(unreadable.map((entry) => entry.path)).toEqual(['mirror.git'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'mirror.git',
      ])
      // The commit that would have been deleted really was the only copy.
      expect(sha).not.toBe('')
    },
    TIMEOUT,
  )
})

describe('what a bundle cannot carry is reported, not assumed harmless', () => {
  it(
    'reports an executable bit that only the working tree has (core.fileMode=false)',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'deploy.sh', '#!/bin/sh\necho deploy\n', 'feat: deploy')
      await git(['config', 'core.fileMode', 'false'], app)
      await chmod(join(app, 'deploy.sh'), 0o755)

      // git is configured to ignore the change, so nothing else can see it.
      expect((await git(['status', '--porcelain'], app)).trim()).toBe('')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.contentMismatch)).toEqual([
        'app/deploy.sh',
      ])
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.contentMismatch,
        )?.detail,
      ).toMatch(/EXECUTABLE in the workspace/)

      // …and it is a real loss: the restored file is not executable.
      const restored = join(root, 'reconstruct', encodeURIComponent('app'), 'deploy.sh')

      expect(((await stat(restored)).mode & 0o111) === 0).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'does NOT report a repo whose executable bits are all in the index (no false positive)',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await writeFile(join(app, 'deploy.sh'), '#!/bin/sh\necho deploy\n')
      await chmod(join(app, 'deploy.sh'), 0o755)
      await commitFile(app, 'plain.txt', 'plain\n', 'feat: deploy')
      // The bit IS committed; now the repo stops tracking modes, exactly as it
      // would on a filesystem that cannot store them.
      await git(['config', 'core.fileMode', 'false'], app)

      expect((await git(['ls-files', '-s', 'deploy.sh'], app)).startsWith('100755')).toBe(true)

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)

      const restored = join(root, 'reconstruct', encodeURIComponent('app'), 'deploy.sh')

      expect(((await stat(restored)).mode & 0o100) !== 0).toBe(true)
    },
    TIMEOUT,
  )

  it(
    'reports a whole repository parked inside a .git directory',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')

      const parked = join(app, '.git', 'user-stash-repo')

      await initRepo(parked)
      await commitFile(parked, 'PARKED.ts', 'export const parked = 1\n', 'feat: parked')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const report = await reconstructionOf(workspace, archived)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'app/.git/user-stash-repo',
      ])
    },
    TIMEOUT,
  )

  it(
    'does NOT report a submodule or linked-worktree admin dir inside .git (no false positive)',
    async () => {
      const workspace = join(root, 'ws')
      const parent = join(workspace, 'parent')
      const child = join(root, 'child')

      await initRepo(child)
      await commitFile(child, 'lib.ts', 'export const lib = 1\n', 'feat: lib')
      await initRepo(parent)
      await commitFile(parent, 'a.ts', 'export const a = 1\n', 'feat: a')
      // `.git/modules/vendor/lib` is a bare-SHAPED git dir; the submodule it
      // belongs to is enumerated at its own working tree.
      await git(
        ['-c', 'protocol.file.allow=always', 'submodule', 'add', '--', child, 'vendor/lib'],
        parent,
      )
      await git(['commit', '-m', 'feat: vendor the lib'], parent)
      await git(['worktree', 'add', '-q', '-b', 'feature', join(workspace, 'wt')], parent)

      // UNCOMMITTED work in both children, which is what makes the pipeline's
      // ORDER load-bearing: checkpointing a child after the parent was bundled
      // moves the parent's gitlink (dirtying a repo already archived) and
      // advances `refs/heads/feature` behind the parent's bundle. Checkpointing
      // everything DEEPEST-FIRST and bundling afterwards is what keeps this
      // archive green — see the module's @example.
      await writeFile(join(parent, 'vendor', 'lib', 'wip.ts'), 'export const wip = 1\n')
      await writeFile(join(workspace, 'wt', 'feature-wip.ts'), 'export const feature = 1\n')

      const { archived, repos } = await archiveWorkspace(workspace, join(root, 'archive'))

      expect(repos.map((repo) => repo.path)).toEqual(['parent', 'parent/vendor/lib', 'wt'])

      const report = await reconstructionOf(workspace, archived)

      expect(
        report.mismatches.filter(
          (mismatch) =>
            mismatch.path.includes('.git/modules') || mismatch.path.includes('.git/worktrees'),
        ),
      ).toEqual([])
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([])
      expect(archived.map((entry) => entry.repoPath)).toEqual(['parent', 'parent/vendor/lib', 'wt'])
      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)
    },
    TIMEOUT,
  )
})

describe('the gate proves its own enumeration ARRIVED WHOLE', () => {
  it(
    'reports enumeration-incomplete when the executor truncates the walk with exit 0',
    async () => {
      const workspace = join(root, 'ws')
      const app = join(workspace, 'app')
      const hidden = join(workspace, 'zzz-hidden')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')
      await initRepo(hidden)
      await commitFile(hidden, 'HIDDEN.ts', 'export const hidden = 1\n', 'feat: hidden')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'), {
        skip: ['zzz-hidden'],
      })

      // A sandbox executor with a stdout cap: the walk's tail is cut, and it
      // still reports success. A short list must never read as "nothing else is
      // unarchived".
      const cappedExec: GitExec = async (args, options) => {
        const result = await exec(args, options)

        if (!args.includes('-print0')) {
          return result
        }

        const kept = result.stdout
          .split('\0')
          .filter((entry) => entry !== '' && entry.includes(`${sep}app${sep}`))

        return { ...result, stdout: kept.map((entry) => `${entry}\0`).join('') }
      }

      const scratch = join(root, 'reconstruct')

      await mkdir(scratch, { recursive: true })

      const report = await verifyWorkspaceReconstruction(cappedExec, workspace, archived, scratch)

      expect(report.ok).toBe(false)
      expect(mismatchesOfKind(report, RECONSTRUCTION_MISMATCH_KINDS.enumerationIncomplete)).toEqual(
        ['.'],
      )
      expect(
        report.mismatches.find(
          (mismatch) => mismatch.kind === RECONSTRUCTION_MISMATCH_KINDS.enumerationIncomplete,
        )?.detail,
      ).toMatch(/truncated in transit/)
    },
    TIMEOUT,
  )
})

describe('discoverRepos — no content filter can veto DISCOVERY either', () => {
  it(
    'describes and archives a repo whose required filter breaks git status',
    async () => {
      const workspace = join(root, 'ws')
      const design = join(workspace, 'design')

      await initRepo(design)
      await writeFile(join(design, '.gitattributes'), '*.psd filter=lfs -text\n')
      await git(['add', '-A'], design)
      await git(['commit', '-m', 'chore: attributes'], design)
      await git(['config', 'filter.lfs.clean', 'molecule-absent-lfs clean -- %f'], design)
      await git(['config', 'filter.lfs.smudge', 'molecule-absent-lfs smudge -- %f'], design)
      await git(['config', 'filter.lfs.process', 'molecule-absent-lfs filter-process'], design)
      await git(['config', 'filter.lfs.required', 'true'], design)
      // Committed first, then modified IN PLACE at the same size, so git must
      // re-read the content and the clean filter really runs.
      await writeFile(join(design, 'art.psd'), 'ORIGINAL-BYTES')
      await git(
        ['-c', 'filter.lfs.process=', '-c', 'filter.lfs.required=false', 'add', '-A'],
        design,
      )
      await git(
        [
          '-c',
          'filter.lfs.process=',
          '-c',
          'filter.lfs.required=false',
          'commit',
          '-m',
          'feat: art',
        ],
        design,
      )
      await writeFile(join(design, 'art.psd'), 'MODIFIED-BYTES')

      // Plain `git status` is vetoed by the filter — the step BEFORE the
      // checkpoint's own retry, where the repo used to land in `unreadable` and
      // never be returned at all.
      expect((await exec(['status', '--porcelain'], { cwd: design })).exitCode).toBe(128)

      const { archived, repos, unreadable } = await archiveWorkspace(
        workspace,
        join(root, 'archive'),
      )

      expect(unreadable).toEqual([])
      expect(repos.map((repo) => `${repo.path}:${String(repo.dirty)}`)).toEqual(['design:true'])
      expect(archived.map((entry) => entry.repoPath)).toEqual(['design'])

      const report = await reconstructionOf(workspace, archived)

      expect(report.mismatches).toEqual([])
      expect(report.ok).toBe(true)
      expect(
        await readFile(join(root, 'reconstruct', encodeURIComponent('design'), 'art.psd'), 'utf8'),
      ).toBe('MODIFIED-BYTES')
    },
    TIMEOUT,
  )
})

describe('the gate is not defeated by the workspace path itself', () => {
  it(
    'gates a workspace whose directory name contains glob metacharacters',
    async () => {
      // `find -path` takes an fnmatch PATTERN: an unescaped root containing
      // `[`, `*` or `?` never matches itself, which would make the completion
      // sentinel look like a truncated walk and block a release over a NAME.
      const workspace = join(root, 'we[i]rd*ws?')
      const app = join(workspace, 'app')
      const unarchived = join(workspace, 'left-behind')

      await initRepo(app)
      await commitFile(app, 'a.ts', 'export const a = 1\n', 'feat: a')

      const { archived } = await archiveWorkspace(workspace, join(root, 'archive'))
      const clean = await reconstructionOf(workspace, archived)

      expect(clean.mismatches).toEqual([])
      expect(clean.ok).toBe(true)

      // …and the walk really is walking: an unarchived repo is still caught.
      await initRepo(unarchived)
      await commitFile(unarchived, 'b.ts', 'export const b = 1\n', 'feat: b')

      const second = await reconstructionOf(workspace, archived, 'reconstruct-2')

      expect(mismatchesOfKind(second, RECONSTRUCTION_MISMATCH_KINDS.unarchivedRepo)).toEqual([
        'left-behind',
      ])
    },
    TIMEOUT,
  )
})
