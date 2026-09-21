const $=s=>document.querySelector(s);
const allowedEmail=/^[A-Z0-9._%+-]+@moh\.gov\.sa$/i;
const state={email:"",messages:[],requestId:0,busy:false,controller:null,lang:localStorage.getItem("lumacare:lang")==="en"?"en":"ar"};
const ui={ar:{toggle:"English",assistant:"مساعد السياسات السريرية",status:"المحادثة متصلة بمكتبة السياسات",source:"سياسة في المكتبة",newChat:"＋ محادثة جديدة",history:"المحادثات",clear:"مسح",user:"مستخدم الوزارة",question:"اكتب سؤالك عن السياسات...",meta:"الإجابات من الملفات المعتمدة فقط",enter:"Enter للإرسال",welcome:"أهلًا بك في LATYAI",welcomeText:"اسأل عن سياسة التعرف الصحيح على المريض، وسأجيبك مع الإشارة إلى المصدر.",sourceLabel:"المصدر",empty:"لا توجد محادثات بعد"},en:{toggle:"العربية",assistant:"Clinical Policy Assistant",status:"Chat uses the policy library",source:"Policy in library",newChat:"＋ New conversation",history:"Conversations",clear:"Clear",user:"Ministry user",question:"Ask a question about the policies...",meta:"Answers use approved files only",enter:"Enter to send",welcome:"Welcome to LATYAI",welcomeText:"Ask about the Correct Patient Identification Policy and I will answer with a source reference.",sourceLabel:"Source",empty:"No conversations yet"}};
const loginUi={ar:{eyebrow:"المعرفة الأقرب لقرارك",badge:"نسخة تجريبية لمنسوبي وزارة الصحة",title:"ابحث في السياسات بثقة،<br><span>ووصل للمعلومة أسرع.</span>",copy:"مساعد معرفي يجيب من الملفات المعتمدة فقط، ويحتفظ بسجل محادثاتك للعودة إليه لاحقًا.",label:"بريد تسجيل الدخول",placeholder:"أكتب إيميلك الوظيفي",login:"الدخول إلى LATYAI",trust:["جلسة تجريبية","◉ مصادر موثقة","محفوظ في هذا المتصفح"]},en:{eyebrow:"Knowledge closer to your decision",badge:"Preview for Ministry of Health staff",title:"Search policies with confidence,<br><span>and reach answers faster.</span>",copy:"A knowledge assistant that answers only from approved files and keeps your conversation history for later.",label:"Login email",placeholder:"Enter your work email",login:"Sign in to LATYAI",trust:["Preview session","◉ Cited sources","Saved in this browser"]}};
function applyLanguage(){const t=ui[state.lang],l=loginUi[state.lang];document.documentElement.lang=state.lang;document.documentElement.dir=state.lang==="ar"?"rtl":"ltr";document.body.classList.toggle("english",state.lang==="en");$(".eyebrow").textContent=l.eyebrow;$(".security-badge").textContent=l.badge;$(".login-copy h2").innerHTML=l.title;$(".login-copy p").textContent=l.copy;$("label[for=email]").textContent=l.label;$("#email").placeholder=l.placeholder;$(".primary-button span:first-child").textContent=l.login;document.querySelectorAll(".trust-row span").forEach((x,i)=>x.textContent=l.trust[i]);$("#langToggle").textContent=t.toggle;$(".chat-header strong").textContent=t.assistant;$("#searchStatus").textContent=t.status;$(".source-count").innerHTML=`${t.source} <b>1</b>`;$("#newChat").textContent=t.newChat;$(".history-head span").textContent=t.history;$("#clearHistory").textContent=t.clear;$("#profileName").textContent=t.user;$("#question").placeholder=t.question;$(".composer-meta span:first-child").textContent=t.meta;$(".composer-meta span:last-child").textContent=t.enter;renderMessages();renderHistory();checkService()}
function key(email){return `lumacare:${email.toLowerCase()}`}
function save(){try{localStorage.setItem(key(state.email),JSON.stringify(state.messages))}catch{ /* Keep the current conversation usable if browser storage is full. */ }}
function load(){try{const stored=JSON.parse(localStorage.getItem(key(state.email))||"[]");state.messages=Array.isArray(stored)?stored.filter(m=>m&&["user","assistant"].includes(m.role)&&typeof m.text==="string"&&(m.source===undefined||typeof m.source==="string")):[]}catch{state.messages=[]}renderMessages();renderHistory()}
function login(email){state.email=email.toLowerCase();localStorage.setItem("lumacare:lastUser",state.email);$("#loginView").classList.add("hidden");$("#appView").classList.remove("hidden");$("#profileEmail").textContent=state.email;$("#avatar").textContent=state.email[0].toUpperCase();load();checkService()}
$("#loginForm").addEventListener("submit",e=>{e.preventDefault();const email=$("#email").value.trim();if(!allowedEmail.test(email)){$("#emailError").textContent=state.lang==="ar"?"البريد غير مقبول":"Email not accepted";$("#emailField").classList.add("invalid");return}$("#emailError").textContent="";$("#emailField").classList.remove("invalid");login(email)});
$("#email").addEventListener("input",()=>{$("#emailError").textContent="";$("#emailField").classList.remove("invalid")});
function renderMessages(){const box=$("#messages"),t=ui[state.lang];if(!state.messages.length){const suggestions=state.lang==="ar"?["متى يجب التحقق من هوية المريض؟","ماذا نفعل إذا رفض المريض ارتداء سوار التعريف؟","كيف يتم تعريف المريض فاقد الوعي؟"]:["When must patient identity be verified?","What if a patient refuses an ID wristband?","How is an unconscious patient identified?"];box.innerHTML=`<article class="welcome-message"><div class="spark">✦</div><h2>${t.welcome}</h2><p>${t.welcomeText}</p><div class="suggestions">${suggestions.map(x=>`<button>${x}</button>`).join("")}</div></article>`;wireSuggestions();return}box.innerHTML=state.messages.map(m=>`<article class="message ${m.role}" dir="auto">${escapeHtml(m.text)}${m.source?`<span class="citation">${t.sourceLabel}: ${escapeHtml(m.source)}</span>`:""}</article>`).join("");box.scrollTop=box.scrollHeight}
async function checkService(){
 const lang=state.lang;
 try{
  const response=await fetch("api/status",{signal:AbortSignal.timeout(5000)});
  const data=response.ok?await response.json():{};
  if(lang!==state.lang)return;
  $("#searchStatus").textContent=data.configured?ui[lang].status:(lang==="ar"?"المحادثة الذكية بانتظار التفعيل":"AI chat is awaiting activation");
 }catch{if(lang===state.lang)$("#searchStatus").textContent=lang==="ar"?"المحادثة الذكية غير متصلة حاليًا":"AI chat is currently unavailable"}
}
async function answer(q,history,signal){
 const response=await fetch("api/chat",{
  method:"POST",headers:{"Content-Type":"application/json"},
  body:JSON.stringify({question:q,history,language:state.lang}),signal
 });
 let data;try{data=await response.json()}catch{throw new Error("unavailable")}
 if(!response.ok)throw new Error(data.error||"unavailable");
 if(typeof data.answer!=="string"||!Array.isArray(data.sources))throw new Error("unavailable");
 return data;
}
function cancelPending(){state.requestId++;state.controller?.abort();state.controller=null;state.busy=false;$("#sendButton").disabled=false;$("#pendingAnswer")?.remove()}
function showPending(){const box=$("#messages"),node=document.createElement("article");node.id="pendingAnswer";node.className="message assistant pending";node.textContent=state.lang==="ar"?"أراجع المصادر المعتمدة…":"Checking the approved sources…";box.appendChild(node);box.scrollTop=box.scrollHeight}
async function ask(text){
 const q=text.trim();if(!q||!state.email||state.busy)return;
 if(q.length>4000){$("#question").value=q;return}
 const history=[];let budget=0;
 for(const m of state.messages.slice(-12).reverse()){
  const text=m.text.slice(0,6000);if(budget+text.length>24000)break;
  history.unshift({role:m.role,text});budget+=text.length;
 }
 const requestId=++state.requestId;state.busy=true;
 const controller=new AbortController();state.controller=controller;
 const timeout=setTimeout(()=>controller.abort(),50000);
 const current=()=>requestId===state.requestId;
 $("#sendButton").disabled=true;
 try{
  state.messages.push({role:"user",text:q});save();renderMessages();renderHistory();showPending();
  const result=await answer(q,history,controller.signal);if(!current())return;
  const source=result.sources.map((s,i)=>`[${i+1}] ${s.section||s.filename}\n${s.excerpt}`).join("\n\n");
  state.messages.push({role:"assistant",text:result.answer,source});
  save();
 }catch(error){
  if(!current())return;
  const notConfigured=error.message==="not_configured";
  state.messages.push({role:"assistant",text:state.lang==="ar"?
   (notConfigured?"المحادثة الذكية بانتظار تفعيل الخدمة. تواصل مع مسؤول المنصة.":"تعذّر الاتصال بالمساعد الآن. حاول مرة أخرى بعد قليل."):
   (notConfigured?"AI chat is awaiting service activation. Contact the platform administrator.":"The assistant is unavailable right now. Please try again shortly.")});
  save();
 }finally{
  clearTimeout(timeout);
  if(current()){state.busy=false;state.controller=null;$("#sendButton").disabled=false;renderMessages();renderHistory();$("#question").focus()}
 }
}
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();if(state.busy)return;const input=$("#question");const value=input.value;input.value="";ask(value)});$("#question").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();$("#chatForm").requestSubmit()}});
function wireSuggestions(){document.querySelectorAll(".suggestions button").forEach(b=>b.onclick=()=>ask(b.textContent))}
function renderHistory(){const userQs=state.messages.filter(m=>m.role==="user");$("#historyList").innerHTML=userQs.length?userQs.slice(-8).reverse().map(m=>`<button class="history-item" dir="auto">${escapeHtml(m.text)}</button>`).join(""):`<div style="color:#657c8c;font-size:12px;padding:10px">${ui[state.lang].empty}</div>`}
$("#newChat").onclick=()=>{cancelPending();state.messages=[];save();renderMessages();renderHistory()};$("#clearHistory").onclick=()=>{if(confirm(state.lang==="ar"?"هل تريد مسح سجل المحادثات؟":"Clear conversation history?")){cancelPending();state.messages=[];save();renderMessages();renderHistory()}};$("#logout").onclick=()=>{cancelPending();state.email="";state.messages=[];localStorage.removeItem("lumacare:lastUser");$("#appView").classList.add("hidden");$("#loginView").classList.remove("hidden")};
function escapeHtml(v){return v.replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
$("#langToggle").onclick=()=>{state.lang=state.lang==="ar"?"en":"ar";localStorage.setItem("lumacare:lang",state.lang);applyLanguage()};const last=localStorage.getItem("lumacare:lastUser");if(last&&allowedEmail.test(last))login(last);applyLanguage();

