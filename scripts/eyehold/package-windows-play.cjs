#!/usr/bin/env node
/* Personal Windows play package. No installer, release publication, user data,
 * API key or signing credential is added to the bundle. Build on Windows so
 * runtime dependencies contain the correct native modules.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path');
function packagePlay({root,out,nodeExecutable=process.execPath,platform=process.platform}){
 if(platform!=='win32')throw Error('Build the Windows play package on a Windows runner.');
 if(!path.isAbsolute(root)||!path.isAbsolute(out)||out===root)throw Error('absolute separate output required');
 if(fs.existsSync(out))throw Error('output already exists; use a new empty directory');
 fs.mkdirSync(path.join(out,'runtime'),{recursive:true});
 fs.copyFileSync(nodeExecutable,path.join(out,'runtime','node.exe'));
 for(const name of ['sidecar','frontend','shared','node_modules']){
  fs.cpSync(path.join(root,name),path.join(out,name),{recursive:true,filter:source=>{
   const rel=path.relative(path.join(root,name),source).split(path.sep);
   return !rel.some(p=>['.git','.secrets','workspaces','__pycache__'].includes(p)||p==='.env'||p.startsWith('.env.'))&&!/^(runs|ledger|permissions\.allow|cron\.jobs|secrets)\.jsonl?$/.test(path.basename(source));
  }});
 }
 fs.copyFileSync(path.join(root,'package.json'),path.join(out,'package.json'));
 for(const name of ['LICENSE','NOTICE.md'])fs.copyFileSync(path.join(root,name),path.join(out,name));
 fs.mkdirSync(path.join(out,'scripts'),{recursive:true});
 fs.copyFileSync(path.join(root,'scripts/eyehold-owner-key.cjs'),path.join(out,'scripts/eyehold-owner-key.cjs'));
 fs.copyFileSync(path.join(root,'scripts/eyehold/windows-play-launcher.cjs'),path.join(out,'launch.cjs'));
 fs.writeFileSync(path.join(out,'PLAY-EYEHOLD.cmd'),'@echo off\r\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" "%~dp0launch.cjs"\r\nif errorlevel 1 pause\r\n');
 fs.writeFileSync(path.join(out,'OWNER-REVIEW-KEY.cmd'),'@echo off\r\ncd /d "%~dp0"\r\n"%~dp0runtime\\node.exe" scripts\\eyehold-owner-key.cjs --workspace-root "%LOCALAPPDATA%\\Eyehold\\workspaces"\r\npause\r\n');
 fs.writeFileSync(path.join(out,'RUN-ME-FIRST.txt'),[
  'THE EYEHOLD — WINDOWS PERSONAL PLAY BUILD','',
  '1. Extract this entire folder. Do not run it from inside the ZIP.',
  '2. Double-click PLAY-EYEHOLD.cmd. Leave its console window open.',
  '3. Your browser opens http://localhost:8787 after the real sidecar is ready.',
  '4. Complete the local engine setup with your own OpenRouter key. Never send the key in chat.',
  '5. In WORK BOARD: BACK UP & INSTALL NEW LAYOUT, then SUMMON & ASSIGN SIX SPECIALISTS.',
  '6. Use CHECK LIVE CREW, then PREPARE RAVEN → DEEPFORGE TASK. Review the message in COMMS and send it yourself.',
  '7. Watch actual runs and outputs in WORK BOARD. Finished does not mean owner-accepted.',
  '',
  'Initial model ceilings: $0.20/run, $0.40/agent, $1/day and $1 total. Review and adjust actual limits in the app before more work.',
  'No jobs, paid model calls, external accounts or background schedules start from opening this package.',
  'State: %LOCALAPPDATA%\\Eyehold\\workspaces. Existing upstream app folders are not the package workspace.',
  'Stop an active conversation before closing the console. The console must remain running for agents to work.',
  '',
  'Optional owner acceptance: double-click OWNER-REVIEW-KEY.cmd once, store its displayed key privately,',
  'then enter it only in the local Work Board owner review form. It is separate from the provider key.',
  '',
  'This is a personal development/test package. Public art/signing/release readiness is not certified.',
  'If port 8787 is already in use, the launcher stops instead of opening a different existing keep.'
 ].join('\r\n')+'\r\n');
 return out;
}
if(require.main===module){try{
 const arg=process.argv.indexOf('--output');if(arg<0||!process.argv[arg+1])throw Error('Usage: --output <new output directory>');
 console.log('Windows play package ready:',packagePlay({root:path.resolve(__dirname,'../..'),out:path.resolve(process.argv[arg+1])}));
}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={packagePlay};
