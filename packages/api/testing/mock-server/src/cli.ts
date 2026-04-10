#!/usr/bin/env node

/**
 * CLI entrypoint for the mock API server.
 *
 * Usage:
 *   npx @molecule/api-mock-server --app personal-finance --port 4000
 *   npx @molecule/api-mock-server --fixtures-path ./fixtures --port 4000
 *   npx @molecule/api-mock-server --app online-store --port 4015 --state success
 */

import { createMockServer } from './server/server.js'

interface CliArgs {
  app: string
  fixturesPath?: string
  port: number
  state: 'success' | 'empty' | 'error' | 'unauthorized'
  delay: number
  handlersPath?: string
  help: boolean
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    app: '',
    port: 4000,
    state: 'success',
    delay: 0,
    help: false,
  }

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    const next = argv[i + 1]

    switch (arg) {
      case '--app':
      case '-a':
        args.app = next ?? ''
        i++
        break
      case '--fixtures-path':
      case '--fixtures':
        args.fixturesPath = next
        i++
        break
      case '--port':
      case '-p':
        args.port = Number(next) || 4000
        i++
        break
      case '--state':
      case '-s':
        if (next && ['success', 'empty', 'error', 'unauthorized'].includes(next)) {
          args.state = next as CliArgs['state']
        }
        i++
        break
      case '--delay':
      case '-d':
        args.delay = Number(next) || 0
        i++
        break
      case '--handlers-path':
        args.handlersPath = next
        i++
        break
      case '--help':
      case '-h':
        args.help = true
        break
    }
  }

  return args
}

function printHelp(): void {
  console.log(`
  @molecule/api-mock-server - Mock API server with fixture data from JSON files

  Usage:
    npx @molecule/api-mock-server --app <app-type> [options]
    npx @molecule/api-mock-server --fixtures-path <path> [options]

  Options:
    --app, -a <type>           App type to serve (resolves fixtures from mlcl/templates/apps/{type}/api/fixtures/)
    --fixtures-path <path>     Explicit path to a directory of JSON fixture files
    --port, -p <port>          Port to listen on (default: 4000)
    --state, -s <state>        Default response state: success|empty|error|unauthorized (default: success)
    --delay, -d <ms>           Default response delay in milliseconds (default: 0)
    --handlers-path <path>     Custom path to handler template files
    --help, -h                 Show this help message

  Examples:
    npx @molecule/api-mock-server --app personal-finance --port 4000
    npx @molecule/api-mock-server --fixtures-path ./my-app/api/fixtures --port 4000
    npx @molecule/api-mock-server --app online-store --state empty
    npx @molecule/api-mock-server --app personal-finance --delay 500
`)
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv)

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  if (!args.app && !args.fixturesPath) {
    console.error('Error: --app or --fixtures-path is required. Use --help for usage.')
    process.exit(1)
  }

  try {
    const server = await createMockServer({
      appType: args.app || 'custom',
      fixturesPath: args.fixturesPath,
      port: args.port,
      defaultState: args.state,
      defaultDelay: args.delay,
      handlersPath: args.handlersPath,
    })

    // Handle graceful shutdown
    const shutdown = async (): Promise<void> => {
      console.log('\nShutting down mock server...')
      await server.close()
      process.exit(0)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  } catch (error) {
    console.error('Failed to start mock server:', (error as Error).message)
    process.exit(1)
  }
}

main()
