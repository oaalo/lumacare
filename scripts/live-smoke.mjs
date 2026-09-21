import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { chat, configured } from "../server/chat.mjs";
const knowledge=JSON.parse(await readFile(new URL("../server/knowledge.json",import.meta.url),"utf8"));
assert.ok(configured(process.env),"GROQ_API_KEY is not configured");
const samples=[
 {name:"Arabic paraphrase",question:"المريض مو راضي يلبس اسورة التعريف، وش اسوي؟",id:"patient-identification-3"},
 {name:"English paraphrase",question:"Can I use the bed number to identify someone before giving their medication?",language:"en",id:"patient-identification-2"},
 {name:"Unsupported question",question:"ما جرعة المضاد الحيوي لعلاج الالتهاب الرئوي؟",status:"no_evidence"}
];
for(let i=0;i<samples.length;i++){
 if(i)await new Promise(r=>setTimeout(r,25000));
 const sample=samples[i];
 const reply=await chat({question:sample.question,language:sample.language},process.env,knowledge,async(url,options)=>{
  const response=await fetch(url,options);
  if(!response.ok)console.error("Provider HTTP status:",response.status);
  return response;
 });
 assert.equal(reply.status,sample.status||"answered",sample.name);
 if(sample.id)assert.ok(reply.sources.some(s=>s.sourceId===sample.id),sample.name+" must cite relevant policy");
 console.log("PASS:",sample.name,"status="+reply.status,"sources="+reply.sources.length);
}
console.log("Live Groq smoke tests passed. No keys or provider payloads logged.");
