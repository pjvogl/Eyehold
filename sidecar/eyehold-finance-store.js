/* Host-only financial evidence store. No HTTP/agent import route.
 * An operator reviews local USD receipt exports before invoking the CLI.
 * This is evidence-backed operator review, not bank reconciliation.
 */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {reportBusinessProfit}=require('./eyehold-finance-truth.js');
const TYPES=['revenue','expense','refund','fee','model-cost'];
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function receipt(bytes){
 if(typeof bytes!=='string'||Buffer.byteLength(bytes)>65536)throw Error('Receipt exceeds 64 KiB');
 const r=JSON.parse(bytes);
 if(!r||typeof r.id!=='string'||!r.id.trim()||r.id.length>200||r.currency!=='USD'||!TYPES.includes(r.type)||!Number.isSafeInteger(r.cents)||r.cents<0)throw Error('Receipt must contain a unique id, USD currency, valid type and nonnegative integer cents');
 return r;
}
function createFinanceStore({file, now}){
 if(!path.isAbsolute(file))throw Error('Absolute host store path required');
 function snapshot(){
  let state;
  try{if(fs.statSync(file).size>16*1024*1024)throw Error('Evidence store exceeds limit');state=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(e){return {...reportBusinessProfit(),source:'owner-reviewed-evidence',reason:e.code==='ENOENT'?'No owner-reviewed financial evidence imported':'Financial evidence store unreadable',unlockedMilestonesUSD:[]};}
  try{
   if(state.version!==1||state.reviewedBy!=='local-operator'||!Array.isArray(state.receipts)||state.receipts.length>10000)throw Error('Invalid evidence store');
   const seen=new Set();
   const records=state.receipts.map(entry=>{
    if(typeof entry.bytes!=='string'||hash(entry.bytes)!==entry.sha256)throw Error('Financial evidence hash mismatch');
    const r=receipt(entry.bytes);if(seen.has(r.id))throw Error('Duplicate receipt id');seen.add(r.id);
    return {type:r.type,cents:r.cents,verified:true,evidenceRef:'sha256:'+entry.sha256};
   });
   const report=reportBusinessProfit({records});
   return {...report,source:'owner-reviewed-evidence',reviewedAt:state.reviewedAt,unlockedMilestonesUSD:report.completedMilestonesUSD,
    scope:'Only owner-reviewed imported USD receipts, including supplied fees and model costs. Not a reconciled bank balance; completeness is not independently established.'};
  }catch(e){return {...reportBusinessProfit(),source:'owner-reviewed-evidence',reason:'Financial evidence invalid: '+e.message,unlockedMilestonesUSD:[]};}
 }
 function replaceReviewed(receipts,{confirmedReviewed=false}={}){
  if(confirmedReviewed!==true)throw Error('Explicit local operator review required');
  if(!Array.isArray(receipts)||!receipts.length||receipts.length>10000)throw Error('Import requires 1-10000 receipts');
  const seen=new Set();const entries=receipts.map(bytes=>{const r=receipt(bytes);if(seen.has(r.id))throw Error('Duplicate receipt id');seen.add(r.id);return {bytes,sha256:hash(bytes)};});
  // Validate arithmetic before replacing the last good state.
  reportBusinessProfit({records:entries.map(e=>{const r=receipt(e.bytes);return {type:r.type,cents:r.cents,verified:true,evidenceRef:e.sha256};})});
  if(entries.reduce((n,e)=>n+Buffer.byteLength(e.bytes),0)>8*1024*1024)throw Error('Receipt batch exceeds 8 MiB');
  const state={version:1,reviewedBy:'local-operator',reviewedAt:typeof now==='function'?now():'unspecified',receipts:entries};
  fs.mkdirSync(path.dirname(file),{recursive:true,mode:0o700});
  const temp=file+'.'+crypto.randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify(state)+'\n',{mode:0o600,flag:'wx'});fs.renameSync(temp,file);}
  finally{fs.rmSync(temp,{force:true});}
  return snapshot();
 }
 function readEntries(){
  let state;
  try{state=JSON.parse(fs.readFileSync(file,'utf8'));}
  catch(e){if(e.code==='ENOENT')return [];throw e;}
  if(state.version!==1||!Array.isArray(state.receipts))throw Error('Invalid evidence store');
  return state.receipts.map(entry=>{
   if(typeof entry.bytes!=='string'||hash(entry.bytes)!==entry.sha256)throw Error('Financial evidence hash mismatch');
   return entry.bytes;
  });
 }
 function appendReviewed(receipts,{confirmedReviewed=false}={}){
  if(confirmedReviewed!==true)throw Error('Explicit local operator review required');
  return replaceReviewed(readEntries().concat(receipts),{confirmedReviewed:true});
 }
 return Object.freeze({snapshot,replaceReviewed,appendReviewed});
}
module.exports={createFinanceStore};
