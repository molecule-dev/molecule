import { describe, expect, it } from 'vitest'

import {
  generateApiDeploymentArtifacts,
  generateApiDockerfile,
  generateAppDockerfile,
  generateNginxConf,
  NODE_DEPLOYMENT_IMAGE,
} from '../dockerfile-generator.js'

describe('generateApiDockerfile', () => {
  it('should generate a multi-stage Dockerfile', () => {
    const result = generateApiDockerfile()

    expect(result).toContain(`FROM ${NODE_DEPLOYMENT_IMAGE} AS build`)
    expect(result).toContain("'npm' 'run' 'build'")
    expect(result).toContain(`FROM ${NODE_DEPLOYMENT_IMAGE} AS runtime`)
    expect(result).toContain('npm prune --omit=dev --ignore-scripts')
    expect(result.split('AS runtime')[1]).not.toMatch(/npm (ci|install|rebuild)/)
  })

  it('should copy compiled output to runtime stage', () => {
    const result = generateApiDockerfile()

    expect(result).toContain('COPY --from=build --chown=node:node ["/app/dist","./dist"]')
  })

  it('should expose port 4000 and start with node', () => {
    const result = generateApiDockerfile()

    expect(result).toContain('EXPOSE 4000')
    expect(result).toContain('CMD ["node","dist/server.js"]')
  })
})

describe('generateAppDockerfile', () => {
  it('should generate a multi-stage Dockerfile with Nginx', () => {
    const result = generateAppDockerfile()

    expect(result).toContain(`FROM ${NODE_DEPLOYMENT_IMAGE} AS build`)
    expect(result).toContain('FROM nginx:alpine')
    expect(result).toContain('EXPOSE 80')
  })

  it('should inject Vite env vars as Docker ARGs', () => {
    const result = generateAppDockerfile({
      VITE_API_URL: 'http://localhost:4007/api',
    })

    expect(result).toContain('ARG VITE_API_URL')
    expect(result).toContain('ENV VITE_API_URL=$VITE_API_URL')
  })

  it('should place ARG/ENV before npm run build', () => {
    const result = generateAppDockerfile({
      VITE_API_URL: 'http://localhost:4007/api',
    })

    const argIndex = result.indexOf('ARG VITE_API_URL')
    const envIndex = result.indexOf('ENV VITE_API_URL=$VITE_API_URL')
    const buildIndex = result.indexOf('RUN npm run build')

    expect(argIndex).toBeLessThan(buildIndex)
    expect(envIndex).toBeLessThan(buildIndex)
  })

  it('should support multiple env vars', () => {
    const result = generateAppDockerfile({
      VITE_API_URL: 'http://localhost:4007/api',
      VITE_APP_NAME: 'my-app',
    })

    expect(result).toContain('ARG VITE_API_URL')
    expect(result).toContain('ARG VITE_APP_NAME')
    expect(result).toContain('ENV VITE_API_URL=$VITE_API_URL')
    expect(result).toContain('ENV VITE_APP_NAME=$VITE_APP_NAME')
  })

  it('should copy built dist into Nginx', () => {
    const result = generateAppDockerfile()

    expect(result).toContain('COPY --from=build /app/dist /usr/share/nginx/html')
  })

  it('should copy nginx.conf from the staging named context (not the app context)', () => {
    const result = generateAppDockerfile()

    // The app build context is the app project, which has NO nginx.conf — a
    // bare `COPY nginx.conf` fails every build with "not found in build
    // context". It must come from the `staging` additional context.
    expect(result).toContain('COPY --from=staging nginx.conf /etc/nginx/conf.d/default.conf')
  })
})

describe('generateApiDeploymentArtifacts', () => {
  it('returns a self-contained recipe with source present for lifecycle scripts and the same native modules at runtime', () => {
    const files = generateApiDeploymentArtifacts()
    expect(files.Dockerfile).toContain(files['.molecule/deploy/build.sh'])
    expect(files.Dockerfile.indexOf('COPY . .')).toBeLessThan(files.Dockerfile.indexOf('npm ci'))
    expect(files.Dockerfile).toContain('python3')
    expect(files.Dockerfile).toContain("'make' 'g++'")
    expect(files.Dockerfile).toContain('npm ci --include=dev --ignore-scripts=false')
    expect(files.Dockerfile).toContain('USER node')
    expect(generateApiDockerfile()).toBe(files.Dockerfile)
    expect(NODE_DEPLOYMENT_IMAGE).toBe('node:22.23.4-trixie-slim')
  })

  it('carries explicit workspace output and nested dependencies without inferring a database or host', () => {
    const files = generateApiDeploymentArtifacts({
      runtimeDirectory: 'api',
      runtimePaths: ['api', 'app/dist'],
      runtimeCommand: ['node', 'dist/index.js'],
      port: 8080,
    })
    expect(files.Dockerfile).toContain('["/app/api","./api"]')
    expect(files.Dockerfile).toContain('["/app/app/dist","./app/dist"]')
    expect(files.Dockerfile).toContain(
      'WORKDIR /app/api\nEXPOSE 8080\nCMD ["node","dist/index.js"]',
    )
    expect(files['.dockerignore']).toContain('**/node_modules')
    expect(files['.dockerignore']).toContain('**/dist')
    expect(files['.dockerignore']).toContain('**/.env*')
    expect(files.Dockerfile).not.toContain('postgres')
  })

  it('accepts explicit apt libraries, digest-pinned base and literal command arguments', () => {
    const nodeImage = 'node:22.23.4-trixie-slim@sha256:' + 'a'.repeat(64)
    const files = generateApiDeploymentArtifacts({
      nodeImage,
      buildPackages: ['pkg-config'],
      runtimePackages: ['libsqlite3-0'],
      buildCommand: ['node', '-e', "console.log('$HOME `id`')"],
    })
    expect(files.Dockerfile.split(`FROM ${nodeImage}`)).toHaveLength(3)
    expect(files.Dockerfile).toContain("'pkg-config'")
    expect(files.Dockerfile).toContain("'libsqlite3-0'")
    expect(files['.molecule/deploy/build.sh']).toContain("'node' '-e' 'console.log('")
  })

  it('refuses path/command/image/package substitutions and missing outputs before returning files', () => {
    for (const options of [
      { runtimePaths: ['../api'] },
      { runtimePaths: ['/api'] },
      { runtimePaths: ['.'] },
      { runtimePaths: [] },
      { runtimeDirectory: 'api\nRUN id' },
      { nodeImage: 'node:22\nRUN id' },
      { runtimeCommand: [] },
      { runtimeCommand: [''] },
      { buildCommand: ['node\nid'] },
      { buildPackages: ['g++;id'] },
      { runtimePackages: ['x$(id)'] },
      { port: 0 },
    ])
      expect(() => generateApiDeploymentArtifacts(options)).toThrow()
  })
})

describe('generateNginxConf', () => {
  it('should listen on port 80', () => {
    const result = generateNginxConf()

    expect(result).toContain('listen 80')
  })

  it('should use try_files for SPA routing', () => {
    const result = generateNginxConf()

    expect(result).toContain('try_files $uri $uri/ /index.html')
  })

  it('should serve from /usr/share/nginx/html', () => {
    const result = generateNginxConf()

    expect(result).toContain('root /usr/share/nginx/html')
  })

  it('should cache static assets', () => {
    const result = generateNginxConf()

    expect(result).toContain('expires 1y')
    expect(result).toContain('Cache-Control')
  })
})
