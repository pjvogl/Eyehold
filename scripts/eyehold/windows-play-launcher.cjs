'use strict';
const path=require('node:path'),net=require('node:net'),{spawn}=require('node:child_process');
const root=__dirname,port=8787,url='http://localhost:'+port;
function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',()=>reject(Error('Port 8787 is already in use. Close the other local station before starting this package.')));s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
async function main(){
 if(process.platform!=='win32'||!process.env.LOCALAPPDATA)throw Error('This launcher is for your Windows personal desktop.');
 await freePort();
 const workspace=path.join(process.env.LOCALAPPDATA,'Eyehold','workspaces');
 const env={...process.env,SKYNET_PORT:String(port),EYEHOLD_PORT:String(port),SKYNET_WORKSPACES:workspace,EYEHOLD_WORKSPACES:workspace};
 for(const [suffix,value] of Object.entries({BUDGET_PER_RUN:'0.20',BUDGET_PER_AGENT:'0.40',BUDGET_PER_DAY:'1.00',BUDGET_GLOBAL:'1.00',MAX_CONCURRENT_AGENTS:'2'})){
  env['SKYNET_'+suffix]=value;env['EYEHOLD_'+suffix]=value;
 }
 console.log('Starting Eyehold. Keep this window open. Workspace: '+workspace);
 const child=spawn(process.execPath,[path.join(root,'sidecar/index.js')],{cwd:root,env,stdio:'inherit'});
 child.on('error',e=>{console.error('Could not start Eyehold:',e.message);process.exitCode=1});
 child.on('exit',code=>{process.exitCode=code||0});
 let ready=false;
 for(let n=0;n<120;n++){
  if(child.exitCode!==null||child.signalCode!==null)throw Error('The sidecar stopped. Read the message above.');
  try{if((await fetch('http://127.0.0.1:'+port+'/api/health',{signal:AbortSignal.timeout(500)})).ok){ready=true;break}}catch{}
  await new Promise(r=>setTimeout(r,250));
 }
 if(!ready){console.error('Browser did not open automatically. When the sidecar is ready, open '+url);return}
 console.log('Eyehold is ready at '+url);
 const browser=spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
 browser.on('error',()=>console.log('Open '+url+' in your browser.'));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
