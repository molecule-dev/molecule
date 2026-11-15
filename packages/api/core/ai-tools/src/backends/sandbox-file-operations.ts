/** Bounded file/command batching for sandbox transports; native file APIs remain the fallback. */

import type { ExecutionBackend } from '../types.js'
import { shellQuote } from '../utilities.js'

// envd may truncate command output; Docker also caps a shell argument at 128 KiB.
// Keep both envelopes small, and accept a read only after its complete JSON arrives.
const MAX_ENVELOPE = 24_000
const WRITE_MARK = 'MOL_FILE_WRITTEN\n'
const NO_WRITE_MARK = 'MOL_FILE_NOT_WRITTEN\n'

// Native text APIs may strip an initial UTF-8 BOM (Response.text), whereas
// command envelopes preserve it. Keep that provider-specific decoding on the native path.
const READ_SCRIPT = `const fs=require('fs'),cp=require('child_process');const p=process.argv[1],root=process.argv[2];let realPath='';if(root){const r=cp.spawnSync('readlink',['-f',p],{encoding:'utf8'});realPath=(r.status===0?r.stdout:p).trim()}let out={realPath};if(!root||!realPath||realPath===root||realPath.startsWith(root==='/'?'/':root+'/')){try{if(fs.statSync(p).size<=24000){const content=fs.readFileSync(p,'utf8');if(content.charCodeAt(0)!==65279&&Buffer.byteLength(JSON.stringify({realPath,content}))<=24000)out={realPath,content}}}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')out.content=null;/* other errors use the native API */}}process.stdout.write(JSON.stringify(out))`

const WRITE_SCRIPT = `const fs=require('fs'),cp=require('child_process'),path=require('path');const r=JSON.parse(Buffer.from(process.argv[1],'base64').toString('utf8'));try{fs.mkdirSync(path.dirname(r.path),{recursive:true});fs.writeFileSync(r.path,r.content,'utf8')}catch(e){process.stdout.write('MOL_FILE_NOT_WRITTEN\\n');process.exit(1)}process.stdout.write('MOL_FILE_WRITTEN\\n');const c=cp.spawnSync('sh',['-c',r.command],{cwd:path.dirname(r.path),encoding:'utf8',timeout:15000,maxBuffer:10*1024*1024});process.stdout.write(JSON.stringify({stdout:c.stdout||'',stderr:c.stderr||'',exitCode:c.status??1}))`

const REFUSED_MARK = 'MOL_FILE_REFUSED\n'

// write_file's guard, old-text read, write and parse in one process (X1 write-roundtrips: two
// sandbox calls and four processes per write were 0.7–1.0 s; one call is 0.3–0.5 s). The path check
// is the guard's own: `readlink -f`, else the path, refused when it resolves outside the root. The
// old text must arrive whole BEFORE anything is written: a file whose text does not fit the
// envelope, has a BOM or cannot be read is left untouched and the caller takes the native path.
const REPLACE_SCRIPT = `const fs=require('fs'),cp=require('child_process'),path=require('path');const r=JSON.parse(Buffer.from(process.argv[1],'base64').toString('utf8'));const p=r.path,root=r.root;let realPath='';if(root){const x=cp.spawnSync('readlink',['-f',p],{encoding:'utf8'});realPath=(x.status===0?x.stdout:p).trim()}if(root&&realPath&&realPath!==root&&!realPath.startsWith(root==='/'?'/':root+'/')){process.stdout.write('MOL_FILE_REFUSED\\n'+JSON.stringify({realPath}));process.exit(0)}let old;try{if(fs.statSync(p).size<=${MAX_ENVELOPE - 2_000}){const t=fs.readFileSync(p,'utf8');if(t.charCodeAt(0)!==65279&&Buffer.byteLength(JSON.stringify({realPath,oldContent:t}))<=${MAX_ENVELOPE - 2_000})old=t}}catch(e){if(e.code==='ENOENT'||e.code==='ENOTDIR')old=null}if(old===undefined){process.stdout.write('MOL_FILE_NOT_WRITTEN\\n');process.exit(0)}try{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,r.content,'utf8')}catch(e){process.stdout.write('MOL_FILE_NOT_WRITTEN\\n');process.exit(1)}process.stdout.write('MOL_FILE_WRITTEN\\n'+JSON.stringify({realPath,oldContent:old})+'\\n');if(r.command){const c=cp.spawnSync('sh',['-c',r.command],{cwd:path.dirname(p),encoding:'utf8',timeout:15000,maxBuffer:10*1024*1024});process.stdout.write(JSON.stringify({stdout:c.stdout||'',stderr:c.stderr||'',exitCode:c.status??1}))}`

/** A check result as the parse command printed it, or null when it is missing or cut. */
function parseCheck(text: string): { stdout: string; stderr: string; exitCode: number } | null {
  try {
    const check = JSON.parse(text) as { stdout: unknown; stderr: unknown; exitCode: unknown }
    if (
      typeof check.stdout === 'string' &&
      typeof check.stderr === 'string' &&
      typeof check.exitCode === 'number'
    )
      return { stdout: check.stdout, stderr: check.stderr, exitCode: check.exitCode }
  } catch (_error) {
    // A truncated envelope after an acknowledged write: the caller reruns only the check.
  }
  return null
}

/**
 * Batch sandbox filesystem work through the backend's current command wrapper.
 * Keeping `this.run` preserves a host's environment and module-resolution prelude.
 *
 * @param native - Original file delegates; host overrides must not be bypassed.
 * @returns Optional backend operations that retain native fallbacks for large files.
 */
export function sandboxFileOperations(
  native: Pick<ExecutionBackend, 'readFile' | 'writeFile'>,
): Pick<ExecutionBackend, 'readFileForUpdate' | 'writeFileAndCheck' | 'replaceFileAndCheck'> {
  let supported = false
  const { readFile, writeFile } = native
  return {
    async replaceFileAndCheck(this: ExecutionBackend, path, content, command, symlinkRoot) {
      // Relative paths and host file wrappers keep the native APIs, as for the two-call form.
      if (!path.startsWith('/') || this.readFile !== readFile || this.writeFile !== writeFile)
        return null
      const request = Buffer.from(
        JSON.stringify({ path, content, command, root: symlinkRoot ?? '' }),
      ).toString('base64')
      if (request.length > MAX_ENVELOPE) return null
      const result = await this.run(
        `node -e ${shellQuote(REPLACE_SCRIPT)} ${shellQuote(request)}`,
        {
          cwd: this.projectRoot,
          timeout: 20_000,
        },
      )
      if (result.stdout.startsWith(REFUSED_MARK)) {
        try {
          const body = JSON.parse(result.stdout.slice(REFUSED_MARK.length)) as {
            realPath?: unknown
          }
          if (typeof body.realPath === 'string') return { realPath: body.realPath, refused: true }
        } catch (_error) {
          // A cut refusal still wrote nothing; the guard's own path decides with its own read.
        }
        return null
      }
      if (!result.stdout.startsWith(WRITE_MARK)) {
        // Nothing was written: no Node, a file too large for the envelope, or a filesystem
        // error the native API reports in its own words.
        if (
          result.stdout.startsWith(NO_WRITE_MARK) ||
          (result.exitCode === 127 && /node.*not found/.test(result.stderr))
        )
          return null
        throw new Error(
          'Sandbox file write returned no completion acknowledgement; not retrying an uncertain write',
        )
      }
      const rest = result.stdout.slice(WRITE_MARK.length)
      const newline = rest.indexOf('\n')
      let head: { realPath?: unknown; oldContent?: unknown } = {}
      try {
        head = JSON.parse(newline === -1 ? rest : rest.slice(0, newline)) as typeof head
      } catch (_error) {
        // Handled below: without the old text the result's diff cannot be told.
      }
      if (
        typeof head.realPath !== 'string' ||
        !(typeof head.oldContent === 'string' || head.oldContent === null)
      )
        throw new Error(
          'Sandbox file write was acknowledged without its previous text; not retrying an uncertain write',
        )
      return {
        realPath: head.realPath,
        oldContent: head.oldContent,
        check: command && newline !== -1 ? parseCheck(rest.slice(newline + 1)) : null,
      }
    },

    async readFileForUpdate(this: ExecutionBackend, path, symlinkRoot) {
      const q = shellQuote(path)
      // The native API may resolve relative paths against a different base than exec.
      if (!path.startsWith('/') || this.readFile !== readFile) {
        if (!symlinkRoot) return { realPath: '' }
        const checked = await this.run(`readlink -f ${q} 2>/dev/null || echo ${q}`, {
          timeout: 5000,
        })
        return { realPath: checked.stdout.trim() }
      }
      const result = await this.run(
        `node -e ${shellQuote(READ_SCRIPT)} ${q} ${shellQuote(symlinkRoot ?? '')}`,
        {
          timeout: 5000,
        },
      )
      try {
        const body: unknown = JSON.parse(result.stdout)
        if (
          body &&
          typeof body === 'object' &&
          'realPath' in body &&
          typeof body.realPath === 'string'
        ) {
          supported = true
          if ('content' in body && (typeof body.content === 'string' || body.content === null))
            return { realPath: body.realPath, content: body.content }
          return { realPath: body.realPath }
        }
      } catch (_error) {
        // Missing Node or truncated/malformed stdout cannot supply file contents.
      }
      supported = false
      if (!symlinkRoot) return { realPath: '' }
      // Native path verification still decides safety when batching is unavailable.
      const checked = await this.run(`readlink -f ${q} 2>/dev/null || echo ${q}`, { timeout: 5000 })
      return { realPath: checked.stdout.trim() }
    },

    async writeFileAndCheck(this: ExecutionBackend, path, content, command) {
      if (!path.startsWith('/') || !supported || this.writeFile !== writeFile) return null
      const request = Buffer.from(JSON.stringify({ path, content, command })).toString('base64')
      if (request.length > MAX_ENVELOPE) return null
      const result = await this.run(`node -e ${shellQuote(WRITE_SCRIPT)} ${shellQuote(request)}`, {
        // The target's parent may be created by this very write. The child parse
        // command enters it only after mkdir/write have succeeded.
        cwd: this.projectRoot,
        timeout: 20_000,
      })
      if (!result.stdout.startsWith(WRITE_MARK)) {
        // No successful write acknowledged (e.g. no Node or a filesystem error).
        // The native API retains its provider-specific error and directory behavior.
        if (
          result.stdout.startsWith(NO_WRITE_MARK) ||
          (result.exitCode === 127 && /node.*not found/.test(result.stderr))
        )
          return null
        throw new Error(
          'Sandbox file write returned no completion acknowledgement; not retrying an uncertain write',
        )
      }
      const check = parseCheck(result.stdout.slice(WRITE_MARK.length))
      if (check) return check
      // The write succeeded, but its check output was truncated. Recheck only;
      // never replay an acknowledged write or a failed transport.
      return this.run(command, {
        cwd: path.slice(0, path.lastIndexOf('/')) || '/',
        timeout: 15_000,
      }).catch((_error) => {
        // Like the ordinary post-write check, an unavailable parser adds no syntax note.
        // The write was acknowledged above, so only the best-effort check failed here.
        return { stdout: '', stderr: '', exitCode: 0 }
      })
    },
  }
}
