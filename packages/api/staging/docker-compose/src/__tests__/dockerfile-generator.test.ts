import { describe, expect, it } from 'vitest'

import {
  generateApiDockerfile,
  generateAppDockerfile,
  generateNginxConf,
} from '../dockerfile-generator.js'

describe('generateApiDockerfile', () => {
  it('should generate a multi-stage Dockerfile', () => {
    const result = generateApiDockerfile()

    expect(result).toContain('FROM node:20-alpine AS build')
    expect(result).toContain('RUN npm run build')
    expect(result).toContain('FROM node:20-alpine')
    expect(result).toContain('RUN npm ci --omit=dev')
  })

  it('should copy compiled output to runtime stage', () => {
    const result = generateApiDockerfile()

    expect(result).toContain('COPY --from=build /app/dist ./dist')
  })

  it('should expose port 4000 and start with node', () => {
    const result = generateApiDockerfile()

    expect(result).toContain('EXPOSE 4000')
    expect(result).toContain('CMD ["node", "dist/server.js"]')
  })
})

describe('generateAppDockerfile', () => {
  it('should generate a multi-stage Dockerfile with Nginx', () => {
    const result = generateAppDockerfile()

    expect(result).toContain('FROM node:20-alpine AS build')
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

  it('should copy nginx.conf into the container', () => {
    const result = generateAppDockerfile()

    expect(result).toContain('COPY nginx.conf /etc/nginx/conf.d/default.conf')
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
