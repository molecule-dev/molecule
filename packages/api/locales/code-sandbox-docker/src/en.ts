import type { CodeSandboxDockerTranslations } from './types.js'

/** Code Sandbox Docker translations for English. */
export const en: CodeSandboxDockerTranslations = {
  'codeSandbox.docker.error.readFailed': 'Failed to read {{path}}: {{error}}',
  'codeSandbox.docker.error.readDirFailed': 'Failed to list {{path}}: {{error}}',
  'codeSandbox.docker.error.writeFailed': 'Failed to write {{path}}: {{error}}',
  'codeSandbox.docker.error.deleteFailed': 'Failed to delete {{path}}: {{error}}',
  // keep-english: a log line naming a Docker API request; nothing in it is prose
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',
}
