import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";

test("chat sends follow-up context, blocks duplicates and ignores cancelled replies", async()=>{
 const script=await readFile(new URL("../app.js",import.meta.url),"utf8");
 const nodes=new Map(), storage=new Map(), requests=[];
 const node=key=>{
  if(!nodes.has(key))nodes.set(key,{value:"",textContent:"",innerHTML:"",disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},appendChild(){},remove(){},focus(){}});
  return nodes.get(key);
 };
 const context=vm.createContext({
  document:{querySelector:node,querySelectorAll:()=>[],documentElement:{},body:{classList:{add(){},remove(){},toggle(){}}},createElement:()=>node("pending")},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  fetch:async(url,options)=>url==="api/status"?{ok:true,json:async()=>({configured:true})}:new Promise(resolve=>requests.push({options,resolve})),
  setTimeout,clearTimeout,AbortController,AbortSignal,confirm:()=>true,console
 });
 vm.runInContext(script,context);
 vm.runInContext('login("a@moh.gov.sa")',context);
 const first=vm.runInContext('ask("كيف أتحقق من الهوية؟")',context);
 await vm.runInContext('ask("duplicate")',context);
 assert.equal(requests.length,1);
 vm.runInContext('cancelPending();state.messages=[];login("b@moh.gov.sa")',context);
 requests[0].resolve({ok:true,json:async()=>({answer:"OLD",sources:[]})});
 await first;
 assert.equal(vm.runInContext("state.messages.length",context),0);
 const second=vm.runInContext('ask("What should I check?")',context);
 requests[1].resolve({ok:true,json:async()=>({answer:"Check identity.",sources:[]})});
 await second;
 const third=vm.runInContext('ask("And when?")',context);
 const body=JSON.parse(requests[2].options.body);
 assert.equal(body.question,"And when?");
 assert.equal(body.history.length,2);
 assert.equal(body.history[1].text,"Check identity.");
 requests[2].resolve({ok:true,json:async()=>({answer:"<script>example</script>",sources:[]})});
 await third;
 assert.equal(node("#sendButton").disabled,false);
 assert.ok(node("#messages").innerHTML.includes("&lt;script&gt;"));
 assert.ok(!node("#messages").innerHTML.includes("<script>"));
});
