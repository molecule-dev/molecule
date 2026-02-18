/**
 * Angular service for logging.
 *
 * @module
 */

import { Inject, Injectable } from '@angular/core'

import type { Logger, LoggerConfig, LoggerProvider } from '@molecule/app-logger'

import { LOGGER_PROVIDER } from '../tokens.js'

/**
 * Angular service for logging.
 *
 * Wraps molecule logger provider.
 *
 * @example
 * ```typescript
 * @Component({
 *   selector: 'app-user-profile',
 *   template: `...`
 * })
 * export class UserProfileComponent implements OnInit, OnDestroy {
 *   private logger = this.loggerService.getLogger('UserProfileComponent')
 *
 *   constructor(private loggerService: MoleculeLoggerService) {}
 *
 *   ngOnInit() {
 *     this.logger.info('Component initialized')
 *   }
 *
 *   ngOnDestroy() {
 *     this.logger.debug('Component destroyed')
 *   }
 *
 *   handleError(error: Error) {
 *     this.logger.error('Operation failed', error)
 *   }
 * }
 * ```
 */
@Injectable({
  providedIn: 'root',
})
export class MoleculeLoggerService {
  constructor(@Inject(LOGGER_PROVIDER) private provider: LoggerProvider) {}

  /**
   * Get a logger instance.
   *
   * @param name - Logger name (usually component/service name)
   * @returns The result.
   */
  getLogger(name?: string): Logger {
    return this.provider.getLogger(name)
  }

  /**
   * Create a logger with custom configuration.
   *
   * @param config - Logger configuration
   * @returns The created instance.
   */
  createLogger(config: LoggerConfig): Logger {
    return this.provider.createLogger(config)
  }

  /**
   * Set the global log level.
   *
   * @param level - Log level
   */
  setLevel(level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent'): void {
    this.provider.setLevel(level)
  }

  /**
   * Get the current global log level.
   *
   * @returns The result.
   */
  getLevel(): string {
    return this.provider.getLevel()
  }

  /**
   * Enable logging.
   */
  enable(): void {
    this.provider.enable()
  }

  /**
   * Disable logging.
   */
  disable(): void {
    this.provider.disable()
  }

  /**
   * Check if logging is enabled.
   *
   * @returns Whether logging is enabled
   */
  isEnabled(): boolean {
    return this.provider.isEnabled()
  }
}
