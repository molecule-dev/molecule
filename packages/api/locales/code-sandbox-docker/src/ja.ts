import type { CodeSandboxDockerTranslations } from './types.js'

/** Code Sandbox Docker translations for Japanese. */
export const ja: CodeSandboxDockerTranslations = {
  'codeSandbox.docker.error.readFailed': '{{path}}の読み取りに失敗しました: {{error}}',
  'codeSandbox.docker.error.writeFailed': '{{path}}の書き込みに失敗しました: {{error}}',
  'codeSandbox.docker.error.deleteFailed': '{{path}}の削除に失敗しました: {{error}}',
  'codeSandbox.docker.error.apiError': 'Docker API {{method}} {{path}}: {{status}} {{error}}',
}
