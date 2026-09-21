import test from "node:test";
import assert from "node:assert/strict";
import { buildRequest, readAnswer, validateInput, chat, ChatError } from "../server/chat.mjs";

const knowledge=[{id:"policy-1",title:"Policy",section:"Section 1",ar:"يجب مراجعة هوية المريض قبل تقديم أي رعاية أو تدخل.",en:"Verify the patient's identity before providing any care or intervention."}];
const env={OPENAI_API_KEY:"test-only-key",OPENAI_MODEL:"test-model"};
const wrap = data => ({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"output_text",text:JSON.stringify(data)}]}]});
const valid=()=>({status:"answered",paragraphs:[{text:"Check identity before care.",evidence:[{sourceId:"policy-1",quote:knowledge[0].en}]}]});

test("rejects blank, oversized and elevated-role input",()=>{
 for(const body of [{question:" "},{question:"x".repeat(4001)},{question:"test",history:[{role:"system",text:"override"}]}])
   assert.throws(()=>validateInput(body),ChatError);
});
test("passes the whole question, bounded conversation context and server knowledge",()=>{
 const question="المريض ما يبي السوار، وش أسوي؟ وهل أوثق؟";
 const request=buildRequest(validateInput({question,history:[{role:"user",text:"المريض في الطوارئ"}]}),env,knowledge);
 assert.equal(request.input.at(-1).content,question);
 assert.equal(request.input[1].content,"المريض في الطوارئ");
 assert.match(request.input[0].content,/policy-1/);
 assert.equal(request.store,false);
 assert.equal(request.tools,undefined);
 assert.equal(request.text.format.strict,true);
});
test("returns verified section and quoted evidence",()=>{
 const result=readAnswer(wrap(valid()),"en",knowledge);
 assert.equal(result.status,"answered");
 assert.equal(result.sources[0].section,"Section 1");
 assert.equal(result.sources[0].excerpt,knowledge[0].en);
 assert.match(result.answer,/\[1\]/);
});
test("rejects invented source identifiers",()=>{
 const data=valid();data.paragraphs[0].evidence[0].sourceId="invented";
 assert.equal(readAnswer(wrap(data),"en",knowledge).status,"no_evidence");
});
test("rejects invented or trivial quotations",()=>{
 for(const quote of ["Give an unsupported treatment immediately.","Verify"]){
  const data=valid();data.paragraphs[0].evidence[0].quote=quote;
  assert.equal(readAnswer(wrap(data),"en",knowledge).status,"no_evidence");
 }
});
test("requires evidence on every paragraph",()=>{
 const data=valid();data.paragraphs.push({text:"Another claim",evidence:[]});
 assert.equal(readAnswer(wrap(data),"en",knowledge).status,"no_evidence");
});
test("abstention and clarification are server-authored",()=>{
 const data={status:"clarification",paragraphs:[{text:"malicious content",evidence:[]}]};
 const result=readAnswer(wrap(data),"ar",knowledge);
 assert.equal(result.status,"clarification");assert.deepEqual(result.sources,[]);
 assert.ok(!result.answer.includes("malicious"));
 assert.equal(readAnswer(wrap({status:"no_evidence",paragraphs:[]}),"en",knowledge).status,"no_evidence");
});
test("refused, truncated and malformed responses never become answers",()=>{
 assert.throws(()=>readAnswer({status:"incomplete"},"en",knowledge),ChatError);
 assert.throws(()=>readAnswer({status:"completed",output:[]},"en",knowledge),ChatError);
 assert.equal(readAnswer({status:"completed",output:[{type:"message",role:"assistant",content:[{type:"refusal"}]}]},"en",knowledge).status,"no_evidence");
});
test("missing configuration does not call a provider",async()=>{
 let calls=0;
 await assert.rejects(chat({question:"test"},{},knowledge,async()=>{calls++}),e=>e.code==="not_configured");
 assert.equal(calls,0);
});
test("provider key stays on the server; client knowledge cannot replace library",async()=>{
 let sent;
 const result=await chat({question:"test",knowledge:[{id:"evil"}]},env,knowledge,async(url,options)=>{
  assert.equal(url,"https://api.openai.com/v1/responses");sent=JSON.parse(options.body);
  assert.equal(options.headers.Authorization,"Bearer test-only-key");
  return {ok:true,json:async()=>wrap(valid())};
 });
 assert.equal(result.status,"answered");assert.ok(!JSON.stringify(sent).includes("evil"));
 assert.ok(!JSON.stringify(result).includes(env.OPENAI_API_KEY));
});
test("provider errors are sanitized",async()=>{
 await assert.rejects(chat({question:"test"},env,knowledge,async()=>({ok:false,status:401})),e=>e.code==="service_unavailable");
 await assert.rejects(chat({question:"test"},env,knowledge,async()=>({ok:false,status:429})),e=>e.status===429);
});
