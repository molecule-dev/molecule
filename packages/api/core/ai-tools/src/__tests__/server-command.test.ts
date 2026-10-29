import { describe, expect, it, vi } from 'vitest'

import { foregroundBrowserProbe, foregroundServerCommand, startsServerProgram } from '../index.js'

/** The m257 probe's one binding, enough for the command-level reader. */
const LEAKY =
  "import { chromium } from '@playwright/test'\n" +
  'const browser = await chromium.launch()\n' +
  'const page = await browser.newPage()\n' +
  'console.log(await page.title())\n'

describe('foregroundBrowserProbe', () => {
  it('reads the m257 command verbatim and names the file and binding', async () => {
    // The run's own command: a direct `node <script>` statement, piped through `tail -5`.
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    const probe = await foregroundBrowserProbe(
      'cd /workspace/my-app/app && node /workspace/.mol-scratch/fav-probe.mjs 2>&1 | tail -5',
      readScript,
    )
    expect(probe).toEqual({
      variable: 'browser',
      script: '/workspace/.mol-scratch/fav-probe.mjs',
    })
    expect(readScript).toHaveBeenCalledWith('/workspace/.mol-scratch/fav-probe.mjs')
  })

  it('reads a tsx/ts-node script the same way', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    const probe = await foregroundBrowserProbe(
      'npx tsx --env-file=.env /tmp/probe.ts 2>&1 | tail -15',
      readScript,
    )
    expect(probe?.script).toBe('/tmp/probe.ts')
  })

  it('leaves a backgrounded launch alone', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(
      await foregroundBrowserProbe('node /workspace/.mol-scratch/fav-probe.mjs &', readScript),
    ).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('leaves a Playwright test runner alone (the fixture owns the browser)', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(
      await foregroundBrowserProbe('npx playwright test e2e/favorites.spec.ts', readScript),
    ).toBeNull()
    expect(
      await foregroundBrowserProbe('node node_modules/.bin/playwright test', readScript),
    ).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('leaves a test/fixture file alone even when node runs it directly', async () => {
    const readScript = vi.fn().mockResolvedValue(LEAKY)
    expect(await foregroundBrowserProbe('node e2e/favorites.spec.ts', readScript)).toBeNull()
    expect(await foregroundBrowserProbe('npx tsx e2e/__tests__/fixture.ts', readScript)).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it('never refuses a script the backend cannot read', async () => {
    const readScript = vi.fn().mockRejectedValue(new Error('ENOENT'))
    expect(
      await foregroundBrowserProbe('node /workspace/.mol-scratch/fav-probe.mjs', readScript),
    ).toBeNull()
  })

  it('leaves a clean script and a server script alone', async () => {
    const clean = vi.fn().mockResolvedValue("console.log('done')\n")
    expect(await foregroundBrowserProbe('node /tmp/check.mjs', clean)).toBeNull()
    const server = vi.fn().mockResolvedValue("const { create } = await import('./server')\n")
    expect(await foregroundBrowserProbe('node /tmp/server-probe.mjs', server)).toBeNull()
  })

  it('keeps the server preflight unchanged (a server script is still a server, not a browser probe)', async () => {
    const readScript = vi
      .fn()
      .mockResolvedValue(
        "const { create } = await import('/workspace/my-app/api/src/server.ts')\n" +
          'const inst = await create(0)\n' +
          'console.log(JSON.stringify(inst.address()))\n',
      )
    expect(
      await foregroundServerCommand('npx tsx /tmp/probe.mts 2>&1 | tail -15', readScript),
    ).toEqual({ program: 'tsx /tmp/probe.mts' })
    expect(await foregroundBrowserProbe('npx tsx /tmp/probe.mts', readScript)).toBeNull()
  })
})

describe('foregroundServerCommand — inline programs use bounded execution (m391)', () => {
  // xr-molecule-flash-m391 (+13:13): the executor checked that Vite could be imported in Node and
  // then curled the dev server that was already running. The refusal named `node` as a server
  // because the INLINE CODE spelled `…/node_modules/vite`; requiring a module starts nothing, and
  // the tool's refusal cost a turn that a plain curl finished 3 s later.
  const M391_COMMAND =
    "cd /workspace/my-app/app && cat > /tmp/wm.ts <<'EOF'\n" +
    "import '@fontsource/lora/400.css'\n" +
    "console.log('ok')\n" +
    'EOF\n' +
    'cp /tmp/wm.ts src/__wm_check.ts && node -e "\n' +
    "const {createServer}=require('/workspace/my-app/node_modules/vite');\" 2>/dev/null; " +
    'curl -s "http://localhost:5173/src/main.tsx" | head -8; echo; ' +
    'curl -s "http://localhost:5173/styles.css" | head -3'

  it('runs the exact m391 command: requiring Vite starts nothing', async () => {
    const readScript = vi.fn()
    expect(await foregroundServerCommand(M391_COMMAND, readScript)).toBeNull()
    expect(startsServerProgram(M391_COMMAND)).toBe(false)
    // An inline program is code, not a script file to read.
    expect(readScript).not.toHaveBeenCalled()
  })

  it('reads a mention in a string, template or comment as text, not a launch', async () => {
    for (const command of [
      'node -e "console.log(\'server.listen(3000)\')"',
      'node -e "// server.listen(3000)"',
      'node -e "/* app.listen(4000) */ console.log(\'ok\')"',
      'node -e "console.log(`server.listen(3000)`)"',
      'node -e "import(\'/workspace/my-app/api/src/server.ts\')"',
      'node -e "const vite=\'/workspace/my-app/node_modules/vite\'"',
      'node -e "console.log(/server.listen()/)"',
      'python3 -c "# server.listen()"',
    ]) {
      expect(await foregroundServerCommand(command, vi.fn())).toBeNull()
      expect(startsServerProgram(command)).toBe(false)
    }
  })

  it('leaves arbitrary inline programs to the normal bounded runner', async () => {
    const commands = [
      'node -e "require(\'http\').createServer().listen(3000)"',
      'node -e "const srv = require(\'http\').createServer(); srv.listen(0)"',
      'node --eval "require(\'node:net\').createServer().listen(9000)"',
      'python3 -c "import uvicorn; uvicorn.run(app)"',
      'python3 -c "from http.server import HTTPServer; HTTPServer((\'\', 8000), H).serve_forever()"',
    ]
    for (const command of commands) {
      expect(await foregroundServerCommand(command, vi.fn())).toBeNull()
      expect(startsServerProgram(command)).toBe(false)
    }
  })

  it('keeps the script-file and package-script readings', async () => {
    const readScript = vi.fn().mockResolvedValue("import './handler.js'\nserver.listen(3000)\n")
    expect(await foregroundServerCommand('node server.js', readScript)).toEqual({ program: 'node' })
    expect(await foregroundServerCommand('npm run dev', readScript)).toEqual({ program: 'npm' })
    expect(await foregroundServerCommand('npx tsx /tmp/probe.mts', readScript)).not.toBeNull()
  })
})

describe('foreground command preflight — Node syntax-only checks', () => {
  const SERVING = "import './server.js'\nserver.listen(3000)\n"

  it.each(['node --check scripts/release.mjs', 'node -c scripts/release.mjs'])(
    'does not read or refuse the syntax-only diagnostic: %s',
    async (command) => {
      const readScript = vi.fn().mockResolvedValue(SERVING)
      expect(await foregroundServerCommand(command, readScript)).toBeNull()
      expect(startsServerProgram(command)).toBe(false)
      expect(readScript).not.toHaveBeenCalled()
    },
  )

  it.each(['node --check scripts/release.mjs', 'node -c scripts/release.mjs'])(
    'does not inspect a checked script for browser leaks: %s',
    async (command) => {
      const readScript = vi.fn().mockResolvedValue(LEAKY)
      expect(await foregroundBrowserProbe(command, readScript)).toBeNull()
      expect(readScript).not.toHaveBeenCalled()
    },
  )

  it('honours an option terminator after the check flag', async () => {
    const readScript = vi.fn().mockResolvedValue(SERVING)
    expect(
      await foregroundServerCommand('node --check -- scripts/release.mjs', readScript),
    ).toBeNull()
    expect(readScript).not.toHaveBeenCalled()
  })

  it.each([
    'node scripts/release.mjs',
    'node scripts/release.mjs --check',
    'node -- scripts/release.mjs --check',
    'node -- --check scripts/release.mjs',
    'tsx --check scripts/release.mjs',
  ])('preserves execution and otherProgram classification: %s', async (command) => {
    const readScript = vi.fn().mockResolvedValue(SERVING)
    expect(await foregroundServerCommand(command, readScript)).not.toBeNull()
  })

  it.each([
    'node --check --require ./preload.cjs scripts/release.mjs',
    'node --require ./preload.cjs --check scripts/release.mjs',
    'node --check -r ./preload.cjs scripts/release.mjs',
    'node --check --import ./preload.mjs scripts/release.mjs',
    'node --check --import=./preload.mjs scripts/release.mjs',
    'node --check --experimental-loader ./loader.mjs scripts/release.mjs',
  ])('preserves preload/loader execution classification: %s', async (command) => {
    const readScript = vi.fn().mockResolvedValue(SERVING)
    expect(await foregroundServerCommand(command, readScript)).not.toBeNull()
  })

  it('still finds an actual server launch after a separate syntax check', async () => {
    const readScript = vi.fn().mockResolvedValue(SERVING)
    expect(
      await foregroundServerCommand(
        'node --check scripts/release.mjs && node scripts/release.mjs',
        readScript,
      ),
    ).toEqual({ program: 'node scripts/release.mjs' })
    expect(readScript).toHaveBeenCalledOnce()
  })
})
