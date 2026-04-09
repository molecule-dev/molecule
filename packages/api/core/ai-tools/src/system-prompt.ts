/**
 * Composable system prompt builder for AI agents.
 *
 * Produces the coding-rules and tool-usage sections that any agent needs.
 * Consumers wrap this with domain-specific sections (Synthase adds sandbox/IDE rules,
 * polish pipeline adds design/ClassMap rules).
 *
 * @module
 */

import type { ExecutionBackend, SkillEntry } from './types.js'
import type { PromptContext } from './types.js'
import { TOOL_SCHEMAS } from './schemas.js'

/** Tool descriptions for the prompt, keyed by tool name. */
const TOOL_DESCRIPTIONS: Record<string, string> = {
  list_files: 'Browse the file tree',
  read_file: 'Read any source file',
  write_file: 'Create or overwrite files (full content)',
  edit_file: 'Make targeted search-and-replace edits (preferred for small changes)',
  search_files: 'Search for text patterns across files (grep)',
  find_files: 'Find files by name/glob pattern recursively',
  create_directory: 'Create directories (with parents)',
  rename_file: 'Rename or move files and directories',
  delete_file: 'Remove files',
  exec_command: 'Run shell commands (build checks, npm, verification)',
  save_plan: 'Save an implementation plan as markdown',
  load_skill: 'Load a skill guide for detailed reference on a topic',
}

/**
 * Re-export SkillEntry as DiscoveredSkill for backwards compatibility.
 * @deprecated Use SkillEntry from types.js instead.
 */
export type DiscoveredSkill = SkillEntry

/**
 * Discover skills from a project directory.
 *
 * Scans `.agents/skills/` and `.claude/skills/` for SKILL.md files.
 * Reads the YAML frontmatter of each to extract `name:` and `description:` fields.
 *
 * @param backend - Execution backend to use for filesystem access
 * @returns Array of discovered skills with name, description, and path
 */
export async function discoverSkills(backend: ExecutionBackend): Promise<SkillEntry[]> {
  const root = backend.projectRoot
  const skills: SkillEntry[] = []

  const skillDirs = ['.agents/skills', '.claude/skills']

  for (const skillDir of skillDirs) {
    const dirPath = `${root}/${skillDir}`
    let entries: Array<{ name: string; type: 'file' | 'directory' }>
    try {
      entries = await backend.readDir(dirPath)
    } catch {
      continue // directory doesn't exist
    }

    for (const entry of entries) {
      if (entry.type !== 'directory') continue

      const skillMdPath = `${dirPath}/${entry.name}/SKILL.md`
      let content: string
      try {
        content = await backend.readFile(skillMdPath)
      } catch {
        continue // no SKILL.md in this subdirectory
      }

      // Parse YAML frontmatter (--- delimited block at file start)
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/)
      if (!frontmatterMatch) {
        // No frontmatter — use directory name as skill name, first heading as description
        const headingMatch = content.match(/^#\s+(.+)/m)
        skills.push({
          name: entry.name,
          description: headingMatch ? headingMatch[1].trim() : entry.name,
          path: `${skillDir}/${entry.name}/SKILL.md`,
        })
        continue
      }

      const frontmatter = frontmatterMatch[1]
      const nameMatch = frontmatter.match(/^name:\s*(.+)$/m)
      const descMatch = frontmatter.match(/^description:\s*(.+)$/m)

      skills.push({
        name: nameMatch ? nameMatch[1].trim() : entry.name,
        description: descMatch ? descMatch[1].trim() : entry.name,
        path: `${skillDir}/${entry.name}/SKILL.md`,
      })
    }
  }

  return skills
}

/**
 * Build a coding-focused system prompt from composable sections.
 *
 * Returns a string that includes:
 * - Agent identity
 * - Available tools listing
 * - Coding best practices
 * - Tool argument formatting guidance
 * - Project docs (if provided)
 * - Discovered skills listing (if provided)
 * - Inline skills (if provided)
 * - Custom sections (if provided)
 */
export function buildAgentPrompt(ctx: PromptContext): string {
  const sections: string[] = []

  // Identity
  sections.push(`You are ${ctx.agentName}, an AI coding agent with full access to the project at \`${ctx.projectRoot}\`.`)

  // Tool listing
  const toolLines = ctx.tools
    .filter(name => TOOL_DESCRIPTIONS[name] || TOOL_SCHEMAS[name])
    .map(name => `- **${name}** — ${TOOL_DESCRIPTIONS[name] || TOOL_SCHEMAS[name]?.description || ''}`)
  if (toolLines.length > 0) {
    sections.push(`\n## Available Tools\n\n${toolLines.join('\n')}`)
  }

  // Coding rules
  sections.push(`
## Coding Rules

1. **Always read before editing.** Use read_file to understand the current content before making changes with edit_file or write_file. Never guess file contents.
2. **Use edit_file for small changes.** When modifying a few lines in an existing file, use edit_file with precise search-and-replace. Use write_file only for new files or complete rewrites.
3. **Implement fully.** Do not stop partway through a task. Do not describe remaining work — just do it. Do not ask "would you like me to continue?" — always continue.
4. **Verify your changes.** After editing, use exec_command to run build checks or type-checks to catch errors immediately. Fix any errors before moving on.
5. **Search before inventing.** Use search_files and find_files to discover existing patterns, utilities, and conventions before writing new code. Reuse what exists.
6. **Keep changes minimal.** Fix what was asked. Do not refactor surrounding code, add comments to unchanged code, or "improve" things that weren't requested.

## Tool Argument Formatting

When passing file content to write_file or edit_file, use real newlines in the JSON string value — NOT literal \\\\n escape sequences. Your tool arguments are JSON-parsed, so a JSON string \`"line1\\nline2"\` produces actual newlines. Never double-escape.

For edit_file: each old_string must match **exactly once** in the file. If it matches 0 times, you have the wrong string. If it matches multiple times, include more surrounding context to make it unique.`)

  // Project docs
  if (ctx.projectDocs) {
    sections.push(`\n## Project Guidelines\n\n${ctx.projectDocs}`)
  }

  // Discovered skills (on-demand via load_skill)
  if (ctx.discoveredSkills?.length) {
    const skillLines = ctx.discoveredSkills.map(
      s => `- **${s.name}** — ${s.description} \u2192 \`${s.path}\``,
    )
    sections.push(`\n## Available Skills\n\nThe project has detailed skill guides. Use \`load_skill\` to read them when relevant:\n${skillLines.join('\n')}`)
  }

  // Inline skills (full content injected directly)
  if (ctx.skills?.length) {
    sections.push(`\n## Reference\n\n${ctx.skills.join('\n\n')}`)
  }

  // Custom sections
  if (ctx.customSections?.length) {
    for (const section of ctx.customSections) {
      sections.push(`\n${section}`)
    }
  }

  return sections.join('\n')
}
