import { describe, expect, it } from 'vitest'

import type { StagingEnvironment } from '@molecule/api-staging'

import { generateComposeFile } from '../compose-generator.js'

const mockEnv: StagingEnvironment = {
  slug: 'feat-login',
  branch: 'feature/login',
  type: 'staging',
  name: 'staging-feat-login',
  createdAt: '2026-02-21T10:00:00Z',
  driver: 'docker-compose',
}

describe('generateComposeFile', () => {
  it('should generate valid compose YAML with correct ports', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4007,
      appPort: 5180,
      dbPort: 5440,
    })

    expect(result).toContain('# Branch: feature/login')
    expect(result).toContain('# Slug: feat-login')
    expect(result).toContain('"4007:4000"')
    expect(result).toContain('"5180:80"')
    expect(result).toContain('"5440:5432"')
  })

  it('should use slug-based network and volume names', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
    })

    expect(result).toContain('staging-feat-login')
    expect(result).toContain('staging-feat-login-db')
  })

  it('should include staging environment variables for the API', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
    })

    expect(result).toContain('NODE_ENV=staging')
    expect(result).toContain('STAGING_SLUG=feat-login')
    expect(result).toContain('STAGING_BRANCH=feature/login')
  })

  it('should reference layered env files for the API service', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
    })

    expect(result).toContain('../../.env')
    expect(result).toContain('../../.env.staging')
    expect(result).toContain('../../.env.staging.feat-login')
  })

  it('should use build args (not environment) for Vite env vars on the app service', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4007,
      appPort: 5180,
      dbPort: 5440,
    })

    // App service should use build args for VITE_* vars
    expect(result).toContain('VITE_API_URL: http://localhost:4007/api')
    expect(result).toContain('args:')

    // The app service should NOT have VITE_API_URL as a runtime environment variable
    // Split the compose file to isolate the app service section
    const appSection = result.split('app:')[1].split('db:')[0]
    expect(appSection).not.toContain('environment:')
  })

  it('should reference generated Dockerfiles from the staging directory', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
      dockerfilePath: '/project/.molecule/staging',
    })

    expect(result).toContain('Dockerfile.api')
    expect(result).toContain('Dockerfile.app')
  })

  it('should use custom context paths when provided', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
      apiContext: '../server',
      appContext: '../client',
    })

    expect(result).toContain('context: ../server')
    expect(result).toContain('context: ../client')
  })

  it('should include postgres healthcheck', () => {
    const result = generateComposeFile(mockEnv, {
      apiPort: 4001,
      appPort: 5174,
      dbPort: 5433,
    })

    expect(result).toContain('pg_isready')
    expect(result).toContain('service_healthy')
  })
})
