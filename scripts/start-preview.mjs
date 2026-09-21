import { spawn } from "node:child_process";
import { openSync, closeSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const port = Number(process.env.PORT || 3000);
const local = "http://127.0.0.1:" + port;
async function running() {
  try {
    const response = await fetch(local + "/api/status", {signal: AbortSignal.timeout(1500)});
    return response.ok && typeof (await response.json()).configured === "boolean";
  } catch { return false; }
}
if (!(await running())) {
  const log = openSync(join(tmpdir(), "latyai-preview.log"), "a", 0o600);
  const child = spawn(process.execPath, ["--env-file-if-exists=.env", "server/index.mjs"], {
    cwd:root, detached:true, stdio:["ignore",log,log], env:process.env
  });
  child.unref();
  closeSync(log);
  let ready = false;
  for (let attempt=0;attempt<20;attempt++) {
    if(await running()){ready=true;break}
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!ready)throw new Error("Preview did not start. Check /tmp/latyai-preview.log.");
}
console.log("LATYAI preview: " + local);
console.log("Open port 3000 in the Ports tab. Keep its visibility Private.");
console.log(process.env.GROQ_API_KEY ? "Groq key is configured; try a question." : "Add GROQ_API_KEY to Codespaces secrets, then stop and restart the codespace.");
