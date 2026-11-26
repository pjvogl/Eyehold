#!/usr/bin/env node
/* Prevent inherited release jobs from publishing or mirroring upstream art.
 * This gate makes no external requests and never obtains signing credentials.
 */
'use strict';
function validateTarget({sourceRepo,targetRepo,config,review}={}){
 const reasons=[],repo=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
 if(!repo.test(sourceRepo||''))reasons.push('source-repository-required');
 if(!repo.test(targetRepo||''))reasons.push('owned-release-repository-required');
 else if((targetRepo.split('/')[0]||'').toLowerCase()!==(String(sourceRepo||'').split('/')[0]||'').toLowerCase())reasons.push('release-repository-must-have-source-owner');
 if(String(targetRepo||'').toLowerCase()==='androoagi/eyehold-releases')reasons.push('upstream-release-destination-forbidden');
 if(!config?.bundle?.publisher||config.bundle.publisher==='Eyehold')reasons.push('owned-publisher-identity-required');
 if(config?.bundle?.createUpdaterArtifacts!==true)reasons.push('signed-updater-configuration-required');
 const expected='https://github.com/'+String(targetRepo||'')+'/releases/latest/download/latest.json';
 if(!config?.plugins?.updater?.endpoints?.includes(expected))reasons.push('updater-must-use-owned-release-repository');
 if(review?.status!=='approved-for-distribution'||typeof review?.reviewer!=='string'||!review.reviewer.trim()||!Array.isArray(review?.evidence)||!review.evidence.length)reasons.push('completed-artwork-and-distribution-review-required');
 return {ok:reasons.length===0,reasons};
}
if(require.main===module){
 const fs=require('node:fs'),path=require('node:path');const root=path.resolve(__dirname,'../..');
 let review=null;try{review=JSON.parse(fs.readFileSync(path.join(root,'docs/eyehold-distribution-review.json'),'utf8'))}catch{}
 const config=JSON.parse(fs.readFileSync(path.join(root,'src-tauri/tauri.conf.json'),'utf8'));
 const result=validateTarget({sourceRepo:process.env.GITHUB_REPOSITORY,targetRepo:process.env.EYEHOLD_RELEASE_REPOSITORY,config,review});
 if(!result.ok){console.error('Eyehold public distribution BLOCKED: '+result.reasons.join(', '));process.exitCode=1}
 else console.log('Owned release target and explicit distribution review are configured; platform signing/build proofs remain mandatory.');
}
module.exports={validateTarget};
