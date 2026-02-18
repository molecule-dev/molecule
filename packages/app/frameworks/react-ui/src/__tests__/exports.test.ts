/**
 * Tests for the module's exported API surface.
 * Verifies that all expected components, types, and utilities are exported.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import * as allExports from '../index.js'

describe('module exports', () => {
  describe('component exports', () => {
    const expectedComponents = [
      'Button',
      'Input',
      'Textarea',
      'Select',
      'Checkbox',
      'RadioGroup',
      'Switch',
      'Modal',
      'Spinner',
      'Avatar',
      'Badge',
      'Alert',
      'Card',
      'CardHeader',
      'CardTitle',
      'CardDescription',
      'CardContent',
      'CardFooter',
      'Tabs',
      'Table',
      'Tooltip',
      'Progress',
      'Skeleton',
      'SkeletonText',
      'SkeletonCircle',
      'Separator',
      'Container',
      'Flex',
      'Grid',
      'Spacer',
      'Form',
      'FormField',
      'Label',
      'Toast',
      'ToastContainer',
      'ToastProvider',
      'Accordion',
      'Pagination',
      'Dropdown',
      'DropdownLabel',
      'DropdownSeparator',
    ]

    for (const name of expectedComponents) {
      it(`should export ${name}`, () => {
        const exp = (allExports as Record<string, unknown>)[name]
        expect(exp).toBeDefined()
      })
    }
  })

  describe('hook exports', () => {
    it('should export useToast hook', () => {
      expect(allExports.useToast).toBeDefined()
      expect(typeof allExports.useToast).toBe('function')
    })
  })
})
