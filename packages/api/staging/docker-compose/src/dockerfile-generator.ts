/**
 * Dockerfile and Nginx config generators for staging environments.
 *
 * Generates multi-stage Dockerfiles for both API (Node.js) and App
 * (Vite build → Nginx serve) containers, plus an SPA-compatible
 * Nginx configuration.
 *
 * @module
 */

import type { ApiDeploymentArtifactOptions, ApiDeploymentArtifacts } from './types.js'

/** Default compatible Node/libc base, shared by build and runtime stages. */
export const NODE_DEPLOYMENT_IMAGE = 'node:22.23.4-trixie-slim'

/**
 * Quote a literal shell argument.
 * @param value - A string argument.
 * @returns Its literal POSIX shell form.
 */
function quote(value: string): string {
  return `'${value.replaceAll("'", "'\"'\"'")}'`
}

/**
 * Render a command without shell expansion.
 * @param argv - Command arguments.
 * @returns A literal command.
 */
function command(argv: readonly string[]): string {
  if (
    !Array.isArray(argv) ||
    !argv.length ||
    !argv[0] ||
    argv.some((value) => typeof value !== 'string' || /[\0\r\n]/.test(value))
  )
    throw new Error('Commands must be nonempty arrays of single-line string arguments')
  return argv.map(quote).join(' ')
}

/**
 * Validate a path inside the build context.
 * @param value - A build-context path.
 * @returns A relative path without traversal.
 */
function relativePath(value: string): string {
  if (
    typeof value !== 'string' ||
    !/^[a-zA-Z0-9_.-]+(?:\/[a-zA-Z0-9_.-]+)*$/.test(value) ||
    value.split('/').some((part) => part === '..')
  )
    throw new Error('Artifact paths must be relative paths without traversal or substitutions')
  return value
}

/**
 * Render standard apt installation commands.
 * @param packages - Debian package names.
 * @returns Standard apt installation commands.
 */
function aptInstall(packages: readonly string[]): string {
  if (
    packages.some((value) => typeof value !== 'string' || !/^[a-z0-9][a-z0-9+.-]*$/.test(value))
  ) {
    throw new Error('System packages must be Debian package names')
  }
  return `apt-get update\napt-get install -y --no-install-recommends ${packages.map(quote).join(' ')}\nrm -rf /var/lib/apt/lists/*`
}

/**
 * Generate ordinary deployment files for a Node package or npm workspace root.
 * Uses the project's lockfile, standard npm lifecycle scripts, a native build
 * toolchain and npm prune. Build and runtime use the same Node/libc image;
 * runtime copies the built modules instead of reinstalling without a compiler.
 * Native dependencies are built for the Docker target, never the host's modules.
 *
 * @param options - Layout, commands and system dependencies supplied by the caller.
 * @returns A self-contained Dockerfile, paired dockerignore and identical build script.
 * @example
 * ```typescript
 * import { generateApiDeploymentArtifacts } from '@molecule/api-staging-docker-compose'
 *
 * const files = generateApiDeploymentArtifacts({
 *   runtimeDirectory: 'api',
 *   runtimePaths: ['api', 'app/dist'],
 *   runtimeCommand: ['node', 'dist/server.js'],
 * })
 * // Inspect/merge files into the project; preserve existing user-owned artifacts.
 * ```
 */
export function generateApiDeploymentArtifacts({
  nodeImage = NODE_DEPLOYMENT_IMAGE,
  buildCommand = ['npm', 'run', 'build'],
  runtimeCommand = ['node', 'dist/server.js'],
  runtimePaths = ['dist'],
  runtimeDirectory = '.',
  buildPackages = [],
  runtimePackages = [],
  port = 4000,
}: ApiDeploymentArtifactOptions = {}): ApiDeploymentArtifacts {
  if (typeof nodeImage !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9._:/@-]*$/.test(nodeImage)) {
    throw new Error('nodeImage must be one Debian/apt-based image reference')
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('port must be between 1 and 65535')
  if (!Array.isArray(buildPackages) || !Array.isArray(runtimePackages)) {
    throw new Error('System packages must be arrays of Debian package names')
  }
  if (!Array.isArray(runtimePaths) || !runtimePaths.length)
    throw new Error('runtimePaths must name built output')
  const paths = [...new Set(runtimePaths.map(relativePath))]
  if (paths.includes('.'))
    throw new Error('Name runtime output paths explicitly, not the whole context')
  const directory = relativePath(runtimeDirectory)
  const build = command(buildCommand)
  command(runtimeCommand)
  const prerequisites = aptInstall([
    ...new Set(['ca-certificates', 'python3', 'make', 'g++', ...buildPackages]),
  ])
  const runtimePrerequisites = aptInstall([
    ...new Set(['ca-certificates', ...runtimePackages]),
  ]).replaceAll('\n', ' && ')
  const copy = (source: string, destination: string): string =>
    `COPY --from=build --chown=node:node ${JSON.stringify([`/app/${source}`, destination])}`
  const buildScript = `#!/bin/sh
set -eu
# Native install scripts may fall back to node-gyp on any target architecture.
${prerequisites}
# Source and workspace manifests must exist before prepare/postinstall run.
npm ci --include=dev --ignore-scripts=false --no-audit --no-fund
${build}
# Preserve compiled native addons; never reinstall in a tool-less runtime.
npm prune --omit=dev --ignore-scripts --no-audit --no-fund
mkdir -p node_modules
`
  return {
    Dockerfile: `# syntax=docker/dockerfile:1
# Generated by @molecule/api-staging-docker-compose
FROM ${nodeImage} AS build
WORKDIR /app
COPY . .
RUN <<'MOLECULE_BUILD'
${buildScript}MOLECULE_BUILD

FROM ${nodeImage} AS runtime
WORKDIR /app
RUN ${runtimePrerequisites}
ENV NODE_ENV=production PORT=${port}
${copy('package.json', './package.json')}
${copy('node_modules', './node_modules')}
${paths.map((path) => copy(path, `./${path}`)).join('\n')}
USER node
WORKDIR /app${directory === '.' ? '' : `/${directory}`}
EXPOSE ${port}
CMD ${JSON.stringify(runtimeCommand)}
`,
    '.molecule/deploy/build.sh': buildScript,
    '.dockerignore': `**/node_modules
**/dist
**/.git
**/.keys
**/.env*
!**/.env.example
**/coverage
**/test-results
*.log
`,
  }
}

/**
 * Generates a multi-stage Dockerfile for the API server.
 *
 * Uses generateApiDeploymentArtifacts, including its native install toolchain
 * and matching build/runtime image. The paired ignore is available from that
 * function; callers using another Dockerfile name should write it alongside
 * that Dockerfile as <Dockerfile-name>.dockerignore.
 *
 * @param options - Explicit build/runtime facts; defaults preserve the package layout.
 * @returns Dockerfile content as a string.
 */
export function generateApiDockerfile(options: ApiDeploymentArtifactOptions = {}): string {
  return generateApiDeploymentArtifacts(options).Dockerfile
}

/**
 * Generates a multi-stage Dockerfile for the frontend app.
 *
 * Stage 1 (build): installs deps, injects Vite env vars via Docker ARG,
 * then runs the Vite build. ARG → ENV ensures \`process.env.VITE_*\` is
 * available to Vite at build time (takes precedence over .env files).
 *
 * Stage 2 (serve): copies built static assets into Nginx. The nginx.conf is
 * copied from the \`staging\` named build context (the \`.molecule/staging/\`
 * directory, wired via \`additional_contexts\` in the generated compose file) —
 * NOT from the app build context: the app project has no nginx.conf of its
 * own, so a plain \`COPY nginx.conf\` would fail every build with
 * "not found in build context".
 *
 * @param envVars - Build-time environment variables to inject (e.g. \`{ VITE_API_URL: '...' }\`).
 * @returns Dockerfile content as a string.
 */
export function generateAppDockerfile(envVars: Record<string, string> = {}): string {
  const argLines = Object.keys(envVars)
    .map((key) => `ARG ${key}`)
    .join('\n')
  const envLines = Object.keys(envVars)
    .map((key) => `ENV ${key}=$${key}`)
    .join('\n')

  return `# Generated by @molecule/api-staging-docker-compose
FROM ${NODE_DEPLOYMENT_IMAGE} AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
${argLines}
${envLines}
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY --from=staging nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
`
}

/**
 * Generates an SPA-compatible Nginx configuration.
 *
 * Uses \`try_files\` to serve \`index.html\` for all routes, which is
 * required for client-side routing (React Router, Vue Router, etc.).
 *
 * @returns Nginx config content as a string.
 */
export function generateNginxConf(): string {
  return `# Generated by @molecule/api-staging-docker-compose
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
`
}
