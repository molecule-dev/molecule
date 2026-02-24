/**
 * Tree-view file browser.
 *
 * @module
 */

import type { JSX } from 'react'
import { useCallback, useState } from 'react'

import { t } from '@molecule/app-i18n'
import { getClassMap } from '@molecule/app-ui'

import type { FileExplorerProps, FileNode } from '../types.js'

interface FileTreeItemProps {
  node: FileNode
  depth: number
  onFileSelect: (path: string) => void
}

/**
 * Renders a single file or directory node in the tree view.
 * @param root0 - The component props.
 * @param root0.node - The file system node to render.
 * @param root0.depth - The nesting depth for indentation.
 * @param root0.onFileSelect - Callback invoked when a file node is clicked.
 * @returns The rendered tree item element.
 */
function FileTreeItem({ node, depth, onFileSelect }: FileTreeItemProps): JSX.Element {
  const cm = getClassMap()
  const [expanded, setExpanded] = useState(depth < 1)
  const isDir = node.type === 'directory'

  const toggle = useCallback(() => {
    if (isDir) {
      setExpanded((prev) => !prev)
    } else {
      onFileSelect(node.path)
    }
  }, [isDir, node.path, onFileSelect])

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className={cm.cn(
          cm.w('full'),
          cm.flex({ direction: 'row', align: 'center', gap: 'xs' }),
          cm.sp('py', 1),
          cm.textSize('sm'),
        )}
        style={{
          paddingLeft: `${depth * 16 + 8}px`,
          border: 'none',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        {isDir && (
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0)',
              transition: 'transform 100ms',
            }}
          >
            \u25B6
          </span>
        )}
        {!isDir && <span style={{ display: 'inline-block', width: '12px' }} />}
        <span>{node.name}</span>
      </button>
      {isDir && expanded && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Tree-view file explorer component for browsing project files.
 * @param root0 - The component props.
 * @param root0.files - The root file nodes to display.
 * @param root0.onFileSelect - Callback invoked when a file is selected.
 * @param root0.className - Optional CSS class name for the container.
 * @returns The rendered file explorer element.
 */
export function FileExplorer({ files, onFileSelect, className }: FileExplorerProps): JSX.Element {
  const cm = getClassMap()

  return (
    <div className={cm.cn(cm.sp('py', 1), className)} style={{ overflowY: 'auto' }} role="tree">
      {files.length === 0 && (
        <div className={cm.cn(cm.textMuted, cm.textSize('sm'), cm.sp('p', 3))}>
          {t('ide.files.empty')}
        </div>
      )}
      {files.map((node) => (
        <FileTreeItem key={node.path} node={node} depth={0} onFileSelect={onFileSelect} />
      ))}
    </div>
  )
}

FileExplorer.displayName = 'FileExplorer'
