import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/index.mjs";

test("HTTP routes restrict assets, reject cross-origin calls and report missing setup", async()=>{
 const env={};const app=createApp(env,async()=>{throw new Error("Must not call provider")});
 await new Promise(resolve=>app.listen(0,"127.0.0.1",resolve));
 const port=app.address().port;
 // createApp fixes its origin at creation time; supply its default Host in this local test.
 const url="http://127.0.0.1:"+port;
 const headers={Host:"127.0.0.1:3000"};
 try{
  let response=await fetch(url+"/api/status",{headers});
  assert.equal(response.status,200);assert.deepEqual(await response.json(),{configured:false});
  for(const path of ["/.env","/server/knowledge.json","/server/chat.mjs","/package.json"]){
   response=await fetch(url+path,{headers});assert.equal(response.status,404);
  }
  response=await fetch(url+"/api/chat",{method:"POST",headers:{...headers,"Content-Type":"application/json",Origin:"https://other.example"},body:'{"question":"test"}'});
  assert.equal(response.status,403);
  response=await fetch(url+"/api/chat",{method:"POST",headers:{...headers,"Content-Type":"application/json",Origin:"http://127.0.0.1:3000"},body:'{"question":"test"}'});
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:"not_configured"});
 }finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve))}
});
