import type { CodeSandboxDockerTranslations } from './types.js'

/** Code Sandbox Docker translations for Finnish. */
export const fi: CodeSandboxDockerTranslations = {
  'codeSandbox.docker.error.readFailed': 'Tiedoston {{path}} lukeminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.writeFailed':
    'Tiedoston {{path}} kirjoittaminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Tiedoston {{path}} poistaminen epäonnistui: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',
}
