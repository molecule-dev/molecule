/**
 * Pure tool schema definitions — name, description, and JSON Schema parameters.
 * No execution logic, no imports beyond types.
 *
 * @module
 */

import type { JSONSchema } from '@molecule/api-ai'

export interface ToolSchema {
  name: string
  description: string
  parameters: JSONSchema
}

export const TOOL_SCHEMAS: Record<string, ToolSchema> = {
  list_files: {
    name: 'list_files',
    description: 'List files and directories at a given path. Returns entry names with type indicators.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: "Directory path to list. Omit or use '/' for project root. Supports relative or absolute paths.",
        },
      },
      required: [],
    },
  },

  read_file: {
    name: 'read_file',
    description: 'Read the full content of a file as text. Always read a file before editing it.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to read (relative or absolute).',
        },
      },
      required: ['path'],
    },
  },

  write_file: {
    name: 'write_file',
    description: 'Create or overwrite a file with full content. Use edit_file for small targeted changes instead.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to write.',
        },
        content: {
          type: 'string',
          description: 'Full file content to write.',
        },
      },
      required: ['path', 'content'],
    },
  },

  edit_file: {
    name: 'edit_file',
    description: 'Make targeted search-and-replace edits to a file. Preferred over write_file for small changes. Each old_string must match exactly once in the file.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to edit.',
        },
        replacements: {
          type: 'array',
          description: 'List of search-and-replace operations to apply sequentially.',
          items: {
            type: 'object',
            properties: {
              old_string: {
                type: 'string',
                description: 'Exact string to find. Must match exactly once in the file.',
              },
              new_string: {
                type: 'string',
                description: 'Replacement string.',
              },
            },
            required: ['old_string', 'new_string'],
          },
        },
      },
      required: ['path', 'replacements'],
    },
  },

  search_files: {
    name: 'search_files',
    description: 'Search for a text pattern across files using grep. Returns matching lines with file paths and line numbers.',
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: 'Text or regex pattern to search for.',
        },
        path: {
          type: 'string',
          description: 'Directory to search in. Defaults to project root.',
        },
        include: {
          type: 'string',
          description: "File glob pattern to filter files (e.g. '*.ts', '*.tsx'). Optional.",
        },
      },
      required: ['pattern'],
    },
  },

  find_files: {
    name: 'find_files',
    description: "Find files by name or glob pattern recursively. Excludes node_modules and .git. Use for discovering files by name (e.g. '*.tsx', 'Dashboard*', 'index.*').",
    parameters: {
      type: 'object',
      properties: {
        pattern: {
          type: 'string',
          description: "File name or glob pattern (e.g. '*.tsx', 'Dashboard*').",
        },
        path: {
          type: 'string',
          description: 'Directory to search in. Defaults to project root.',
        },
      },
      required: ['pattern'],
    },
  },

  create_directory: {
    name: 'create_directory',
    description: 'Create a directory and any necessary parent directories.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Directory path to create.',
        },
      },
      required: ['path'],
    },
  },

  rename_file: {
    name: 'rename_file',
    description: 'Rename or move a file or directory.',
    parameters: {
      type: 'object',
      properties: {
        old_path: {
          type: 'string',
          description: 'Current path of the file or directory.',
        },
        new_path: {
          type: 'string',
          description: 'New path for the file or directory.',
        },
      },
      required: ['old_path', 'new_path'],
    },
  },

  delete_file: {
    name: 'delete_file',
    description: 'Delete a file.',
    parameters: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'Path to the file to delete.',
        },
      },
      required: ['path'],
    },
  },

  exec_command: {
    name: 'exec_command',
    description: 'Run a shell command and return its output. Use for build checks, npm commands, verification, etc.',
    parameters: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Shell command to execute.',
        },
        cwd: {
          type: 'string',
          description: 'Working directory. Defaults to project root.',
        },
      },
      required: ['command'],
    },
  },

  save_plan: {
    name: 'save_plan',
    description: 'Save an implementation plan as a markdown file in .agents/plans/.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Short descriptive name for the plan.',
        },
        content: {
          type: 'string',
          description: 'Full plan content in markdown.',
        },
      },
      required: ['name', 'content'],
    },
  },

  load_skill: {
    name: 'load_skill',
    description: 'Load a skill guide by name. Returns the full SKILL.md content for detailed reference on a topic.',
    parameters: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Skill name (e.g. "api-patterns", "styling") or relative path to SKILL.md.',
        },
      },
      required: ['name'],
    },
  },
} as const
