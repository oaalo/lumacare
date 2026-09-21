import test from "node:test";
import assert from "node:assert/strict";
import { previewAccess, createApp } from "../server/index.mjs";
import { request } from "node:http";

const env={CODESPACES:"true",CODESPACE_NAME:"latyai-example",GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:"app.github.dev"};
test("Codespaces origin is derived only from deployment environment",()=>{
 assert.equal(previewAccess(env,3000).origin,"https://latyai-example-3000.app.github.dev");
 assert.deepEqual(previewAccess({},3000).hosts,["127.0.0.1:3000"]);
});
test("private preview accepts forwarded origin and rejects unrelated origins",async()=>{
 const app=createApp(env);await new Promise(resolve=>app.listen(0,"127.0.0.1",resolve));
 const send=origin=>new Promise((resolve,reject)=>{
  const req=request({hostname:"127.0.0.1",port:app.address().port,path:"/api/chat",method:"POST",
   headers:{Host:"localhost:3000",Origin:origin,"Content-Type":"application/json"}},res=>{res.resume();res.on("end",()=>resolve(res.statusCode))});
  req.on("error",reject);req.end(JSON.stringify({question:"test"}));
 });
 try{
  assert.equal(await send("https://latyai-example-3000.app.github.dev"),503);
  assert.equal(await send("https://unrelated-3000.app.github.dev"),403);
 }finally{app.closeAllConnections();await new Promise(resolve=>app.close(resolve))}
});
