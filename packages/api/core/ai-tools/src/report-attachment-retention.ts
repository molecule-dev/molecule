/** Keep a published run's bounded native attachments independent of later runner cleanup. */
import type { PlaywrightRunReport } from './playwright-report.js'
import type { ExecutionBackend } from './types.js'

/** A single attachment larger than this is reported unavailable instead of copied. */
export const MAX_RETAINED_ATTACHMENT_BYTES = 32 * 1024 * 1024
/** The total copied bytes for one published report. */
export const MAX_RETAINED_RUN_BYTES = 128 * 1024 * 1024

const COPY = String.raw`
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const input=JSON.parse(Buffer.from(process.argv[1],'base64').toString('utf8'));
const digest=crypto.createHash('sha256').update(JSON.stringify(input.report)).digest('hex');
const cache=input.report.path+'.attachments-'+digest+'.json';
function previous(){
  const value=JSON.parse(fs.readFileSync(cache,'utf8'));
  if(value.schema!==1||value.report.path!==input.report.path)throw Error('invalid artifact record');
  return value.report;
}
if(fs.existsSync(cache)){process.stdout.write(JSON.stringify(previous()));process.exit(0)}
const directory=fs.mkdtempSync(input.report.path+'.attachments-');
let bytes=0,omitted=0;
const report=input.report;
try{
  for(let i=0;i<report.failures.length;i++){
    const test=report.failures[i],kept=[];
    for(let j=0;j<test.attachments.length;j++){
      const attachment=test.attachments[j];
      let destination;
      try{
        if(!path.isAbsolute(attachment.path))throw Error('relative attachment');
        const before=fs.lstatSync(attachment.path);
        if(!before.isFile()||before.size>input.single||bytes+before.size>input.total)throw Error('artifact unavailable or over budget');
        const folder=path.join(directory,String(i));fs.mkdirSync(folder,{recursive:true,mode:0o700});
        let name=path.basename(attachment.path);
        if(name.length>100)name=crypto.createHash('sha256').update(name).digest('hex').slice(0,16)+path.extname(name).slice(0,12);
        destination=path.join(folder,name);
        if(fs.existsSync(destination))destination=path.join(folder,String(j)+'-'+name);
        fs.copyFileSync(attachment.path,destination,fs.constants.COPYFILE_EXCL);
        const after=fs.lstatSync(attachment.path);
        if(before.ino!==after.ino||before.size!==after.size||before.mtimeMs!==after.mtimeMs)throw Error('artifact changed while copying');
        fs.utimesSync(destination,before.atimeMs/1000,before.mtimeMs/1000);
        fs.chmodSync(destination,0o400);bytes+=before.size;
        kept.push({...attachment,path:destination});
      }catch(error){if(destination)fs.rmSync(destination,{force:true});omitted++}
    }
    test.attachments=kept;
  }
  report.artifactRetention={status:omitted?'partial':'retained',directory,omittedAttachments:omitted,bytes};
  const temporary=path.join(directory,'record.json');
  fs.writeFileSync(temporary,JSON.stringify({schema:1,report}),{mode:0o600,flag:'wx'});
  try{fs.linkSync(temporary,cache)}catch(error){
    if(error.code!=='EEXIST')throw error;
    const winner=previous();fs.rmSync(directory,{recursive:true,force:true});
    process.stdout.write(JSON.stringify(winner));process.exit(0);
  }
  fs.rmSync(temporary);process.stdout.write(JSON.stringify(report));
}catch(error){fs.rmSync(directory,{recursive:true,force:true});throw error}
`

const quote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`

/**
 * Copy only the bounded files the report names into its own per-call scratch directory.
 * Native commands, configs and custom output directories are untouched. Missing, changed,
 * oversized or unsupported files lose their references rather than point at mutable evidence.
 * The derived record lives beside the call's existing report/log files and survives recollection.
 *
 * @param backend - The existing sandbox/local execution bond.
 * @param report - This call's normalized, redacted machine report.
 * @returns The same verdict/counts, with retained attachment paths or honest omissions.
 */
export async function retainPlaywrightArtifacts(
  backend: Pick<ExecutionBackend, 'run'>,
  report: PlaywrightRunReport,
): Promise<PlaywrightRunReport> {
  if (!report.failures.some((test) => test.attachments.length > 0)) return report
  const unavailable = (): PlaywrightRunReport => ({
    ...report,
    failures: report.failures.map((test) => ({ ...test, attachments: [] })),
    artifactRetention: {
      status: 'unavailable',
      omittedAttachments: report.failures.reduce(
        (count, test) => count + test.attachments.length,
        0,
      ),
      bytes: 0,
    },
  })
  try {
    const input = Buffer.from(
      JSON.stringify({
        report,
        single: MAX_RETAINED_ATTACHMENT_BYTES,
        total: MAX_RETAINED_RUN_BYTES,
      }),
    ).toString('base64')
    const result = await backend.run(`node -e ${quote(COPY)} ${quote(input)}`, {
      timeout: 10_000,
      budgetMs: 10_000,
    })
    if (result.exitCode !== 0) return unavailable()
    const retained = JSON.parse(result.stdout) as PlaywrightRunReport
    const directory = retained.artifactRetention?.directory
    const prefix = report.path + '.attachments-'
    if (
      retained.path !== report.path ||
      !Array.isArray(retained.failures) ||
      typeof directory !== 'string' ||
      !directory.startsWith(prefix) ||
      !/^[A-Za-z0-9]{6}$/.test(directory.slice(prefix.length)) ||
      retained.failures.some(
        (test) =>
          !Array.isArray(test.attachments) ||
          test.attachments.some(
            (item) => !item.path.startsWith(directory + '/') || item.path.split('/').includes('..'),
          ),
      )
    )
      return unavailable()
    return retained
  } catch (_error) {
    // Retention is optional evidence; a failed copy never publishes mutable fallback paths.
    return unavailable()
  }
}
