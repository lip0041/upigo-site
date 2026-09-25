import {COACH_EXAMPLES} from '../core/coach-examples.js';
import {createSession,applySignal,nextReason,updateMemory,modelInput,shareTemplate,importTemplate,SIGNALS} from '../core/coach.js';
import {escapeHtml as e,safeUrl} from '../core/markdown.js';

let readState,save,refresh,notify,available=false,busy=false,preview=null;
const formDraft={example:'nature',goal:COACH_EXAMPLES[0].goal,baseline:'从基础开始，想通过具体例子理解',preference:'每次一点，先自己消化，不需要对外讲解',minutes:'10',depth:'overview',mode:'offline',consent:false};
const answers=new Map(),memoryDrafts=new Map();
const answerKey=s=>`${s.id}/${s.position}`;
const active=()=>{const c=readState()?.coach;return c?.sessions.find(s=>s.id===c.activeId);};
const inputField=(id,label,value='',max=1000)=>`<label for="${e(id)}">${e(label)}</label><textarea id="${e(id)}" maxlength="${max}">${e(value)}</textarea>`;
function previewView(route){return `<div class="coach-preview"><h3>${e(route.title)}</h3>${route.stages.map(s=>`<article><h4>${e(s.title)}</h4>${[['objective','学习目标'],['overview','概览'],['explanation','具体例子'],['deep','边界与应用'],['exercise','可选练习'],['rubric','自我核对']].map(([key,label])=>`<p><strong>${label}</strong><br>${e(s[key])}</p>`).join('')}<p>来源：${s.sources.map(x=>`<a href="${e(safeUrl(x.url))}" target="_blank" rel="noopener">${e(x.title)}</a>`).join(' · ')}</p></article>`).join('')}</div>`;}
function shareView(session){
 if(['openai','deepseek'].includes(session.mode))return '<p>这份 AI 草稿尚未人工核查，暂不提供对外分享。</p>';
 return `<p>选择要分享的阶段。导出前可预览全部字段；不含个人目标描述、基础、记忆、反馈或练习回答。</p><div class="coach-share-options">${session.plan.stages.map(s=>`<label><input type="checkbox" data-share-stage="${e(s.id)}" ${!preview||preview.stages.some(x=>x.id===s.id)?'checked':''}> ${e(s.title)}</label>`).join('')}</div><button class="secondary" data-coach="preview">预览分享路线</button>${preview?`${previewView(preview)}<button class="primary" data-coach="export">下载这份分享文件</button>`:''}`;
}
export function coachPage(){
 const session=active(),coach=readState().coach;
 return `<section class="page-heading"><div><span class="eyebrow">GROW WITH UNDERSTANDING</span><h1>从你的目标开始<span class="blue">。</span></h1><p>把理解分成小步，让下一份内容回应你的反馈。</p></div></section>
 <div class="notice">成长实验 · ${available?'本机已配置 DeepSeek，可基于三个专题的人工资料生成待核查草稿。':'当前可体验离线演示，尚未连接在线模型。'} ${busy?'正在整理，请稍候…':''}</div>
 <details class="panel coach-setup" ${session?'':'open'}><summary>开始一个新的成长实验</summary>
 <form id="coach-form">
 <label for="coach-example">选择专题资料</label><select id="coach-example">${COACH_EXAMPLES.map(x=>`<option value="${x.id}" ${formDraft.example===x.id?'selected':''}>${e(x.title)}</option>`).join('')}</select>
 <p class="form-hint">离线模式使用人工编写的示例；DeepSeek 会在所选专题内根据你的目标与反馈调整内容。其他主题需要先补可靠资料。</p>
 ${inputField('coach-goal','这次你想获得什么变化？',formDraft.goal,200)}
 ${inputField('coach-baseline','你已经知道什么，或通常卡在哪里？',formDraft.baseline)}
 ${inputField('coach-preference','内容偏好（可选）',formDraft.preference)}
 <div class="coach-fields"><div><label for="coach-minutes">每次可用时间</label><select id="coach-minutes">${[5,10,20].map(n=>`<option value="${n}" ${String(n)===formDraft.minutes?'selected':''}>${n} 分钟</option>`).join('')}</select></div><div><label for="coach-depth">你想从哪个深度开始？</label><select id="coach-depth">${[['overview','先看概览'],['explanation','从具体例子开始'],['deep','直接看边界与应用']].map(([key,label])=>`<option value="${key}" ${formDraft.depth===key?'selected':''}>${label}</option>`).join('')}</select></div></div>
 <label for="coach-mode">内容来源</label><select id="coach-mode"><option value="offline" ${formDraft.mode==='offline'?'selected':''}>离线示例 · 规则调整</option>${available?`<option value="deepseek" ${formDraft.mode==='deepseek'?'selected':''}>DeepSeek · 基于专题资料生成草稿</option>`:''}</select>
 <label class="coach-consent"><input id="coach-consent" type="checkbox" ${formDraft.consent?'checked':''}> 在线生成时，将上面填写的目标、基础、偏好、时间和所选专题发送至 DeepSeek。</label>
 <p class="form-hint">离线模式无需勾选。模型内容需核对来源；练习不强制，也不做能力评级。</p>
 <button class="primary" type="submit" ${busy?'disabled':''}>${busy?'正在准备…':'准备我的第一步'}</button>
 <label for="coach-import">或用别人分享的路线开始</label><input id="coach-import" type="file" accept=".json,application/json"><p class="form-hint">先填写你自己的目标和基础。导入创建独立记录，不继承别人的进度。分享内容由分享者提供，请核对来源。</p>
 </form></details>
 ${session?`<label for="coach-session">我的成长实验</label><select id="coach-session">${coach.sessions.map(s=>`<option value="${s.id}" ${s.id===session.id?'selected':''}>${e(s.goal)}</option>`).join('')}</select>
 <section class="goal-hero"><span class="eyebrow">${['openai','deepseek'].includes(session.mode)?'AI 草稿 · 未经人工核查':session.mode==='shared'?'分享路线副本 · 来源需自行核对':'离线示例 · 人工内容 + 规则调整'}</span><h2>${e(session.plan.title)}</h2><p>${e(nextReason(session))}</p></section>
 <ol class="coach-route">${session.plan.stages.map((s,i)=>`<li ${i===session.position?'aria-current="step"':''}>${e(s.title)}${i===session.position?' · 当前':''}</li>`).join('')}</ol>
 ${stepView(session)}
 <div class="profile-grid"><section class="panel"><h2>我明确告诉 Upigo 的</h2><p>这些信息只属于这个目标。编辑即可纠正，清空后保存即可删除。</p>${session.memories.map(m=>`<div class="coach-memory">${inputField(`memory-${m.id}`,m.kind==='explicit'?'明确表达':'待你确认的推测',memoryDrafts.get(`${session.id}/${m.id}`)??m.text)}<button class="text-button" data-coach="memory" data-id="${e(m.id)}">保存修改</button></div>`).join('')||'<p>当前没有记忆。</p>'}<p class="form-hint">不会把没点击、跳过或一次答题，自动变成性格或能力标签。</p></section>
 <section class="panel"><h2>本轮留下的证据</h2>${session.events.map(ev=>`<div class="memory-item">${e(session.plan.stages.find(s=>s.id===ev.stageId)?.title)}<small>${e(SIGNALS[ev.signal])} · 用户自报${ev.answer?' · 含私人整理':''}</small>${ev.answer?`<details><summary>回看我的整理</summary><p class="coach-prose">${e(ev.answer)}</p></details>`:''}</div>`).join('')||'<p>还没有反馈，不推测你的掌握情况。</p>'}<p>明确表达、行为记录、待确认判断分开保存。本版只用你的明确反馈调整路线。</p><button class="secondary" data-coach="pause">${session.paused?'继续这条路线':'暂停这条路线'}</button></section></div>
 <details class="panel"><summary>按当前反馈，请 AI 准备新的后续路线</summary><p>会发送本目标、时间、目前保留的明确记忆、最近 6 条反馈的阶段名称和选项，以及所选专题；不会发送练习回答或其他目标。新路线独立保存，原来的记录保留。</p><label class="coach-consent"><input id="coach-adapt-consent" type="checkbox"> 我确认将这些信息发送至 DeepSeek。</label><button class="secondary" data-coach="adapt" ${!available||busy||!session.sourcePack?'disabled':''}>${!session.sourcePack?'该旧路线没有可用的专题资料':available?'准备后续路线':'需先配置本机 DeepSeek 服务'}</button></details>
 <details class="panel"><summary>分享这条成长路线</summary>${shareView(session)}</details>`:'<div class="empty"><h2>先从一个真实的小目标开始</h2><p>可以是看懂风景、改善手机摄影，或理解一个科技话题。</p></div>'}
 <p class="form-hint">记录沿用本机或当前浏览器存储，可在“我的偏好”导出 Markdown 备份。分享文件是手动传递的路线模板，尚无社区或云同步。</p>`;
}
function stepView(session){
 const s=session.plan.stages[session.position];if(!s||session.paused)return '';
 return `<section class="panel coach-step"><span class="eyebrow">第 ${session.position+1} 步 / ${session.plan.stages.length} 步 · ${session.minutes} 分钟预算，按需停下</span><h2>${e(s.title)}</h2><p>${e(s.objective)}</p>
 <div class="choice-list">${[['overview','概览'],['explanation','具体例子'],['deep','边界与应用']].map(([key,label])=>`<button class="chip ${session.depth===key?'selected':''}" aria-pressed="${session.depth===key}" data-coach="depth" data-coach-depth="${key}">${label}</button>`).join('')}</div>
 <p class="coach-prose">${e(s[session.depth])}</p>
 <div class="source">${s.sources.map(source=>`<a href="${e(safeUrl(source.url))}" target="_blank" rel="noopener">${e(source.title)} ↗</a>`).join('<br>')}</div>
 <details><summary>想检查一下理解？可选的小练习</summary><p>${e(s.exercise)}</p>${inputField('coach-answer','用自己的话整理（提交反馈后保存；未提交草稿刷新会丢失）',answers.get(answerKey(session))||'',2000)}<details><summary>展开自我核对要点</summary><p>${e(s.rubric)}</p><small>这是自我核对参考，不是 AI 批改或掌握认证。</small></details></details>
 <p>接下来怎样更适合你？</p><div class="choice-list">${Object.entries(SIGNALS).map(([key,label])=>`<button class="secondary" data-coach="signal" data-signal="${key}">${label}</button>`).join('')}</div><p class="form-hint">选择反馈会保存这次的整理并调整下一步。还没看懂会保留当前阶段；不感兴趣只跳过当前内容。</p></section>`;
}
function formInput(){return {goal:document.getElementById('coach-goal').value,baseline:document.getElementById('coach-baseline').value,preference:document.getElementById('coach-preference').value,minutes:Number(document.getElementById('coach-minutes').value)};}
async function add(session){await save(s=>{s.coach??={version:1,sessions:[],activeId:null};s.coach.sessions.push(session);s.coach.activeId=session.id;});preview=null;refresh();}
async function generate(input){
 if(busy)throw new Error('请求正在处理中');busy=true;refresh();
 try{const response=await fetch('./api/coach/generate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input),signal:AbortSignal.timeout(95000)});const data=await response.json();if(!response.ok)throw new Error(data.error||'生成失败');return data.plan;}
 catch(error){if(error.name==='TimeoutError')throw new Error('生成超时，请稍后重试');throw error;}
 finally{busy=false;refresh();}
}
export function initCoach({getState,commit,render,toast}){
 readState=getState;save=commit;refresh=render;notify=toast;
 document.addEventListener('input',event=>{
  const target=event.target,key=target.id?.replace(/^coach-/,'');
  if(Object.hasOwn(formDraft,key))formDraft[key]=target.type==='checkbox'?target.checked:target.value;
  const session=active();if(!session)return;
  if(target.id==='coach-answer')answers.set(answerKey(session),target.value);
  if(target.id?.startsWith('memory-'))memoryDrafts.set(`${session.id}/${target.id.slice(7)}`,target.value);
 });
 if(['127.0.0.1','localhost','[::1]'].includes(location.hostname))fetch('./api/capabilities').then(r=>r.ok?r.json():null).then(x=>{available=x?.coach?.available===true;refresh();}).catch(()=>{});
 document.addEventListener('submit',async event=>{if(event.target.id!=='coach-form')return;event.preventDefault();
  try{const input=formInput(),mode=document.getElementById('coach-mode').value,depth=document.getElementById('coach-depth').value;
   const sample=COACH_EXAMPLES.find(x=>x.id===document.getElementById('coach-example').value);
   // Validate user input before incurring a model request.
   const session=createSession({...input,sourcePack:sample.id},sample.plan);
   if(mode==='deepseek'){const consent=document.getElementById('coach-consent').checked;if(!consent)throw new Error('在线生成前，请确认发送信息');session.plan=await generate({...input,sourcePack:sample.id,consent});session.mode='deepseek';}
   session.depth=depth;await add(session);notify(mode==='deepseek'?'已保存待核查的 AI 路线':'已准备离线示例路线');
  }catch(error){notify(error.message);}
 });
 document.addEventListener('change',async event=>{try{
  if(event.target.id==='coach-example'){formDraft.example=event.target.value;formDraft.goal=COACH_EXAMPLES.find(x=>x.id===event.target.value).goal;document.getElementById('coach-goal').value=formDraft.goal;}
  if(event.target.id==='coach-session'){preview=null;await save(s=>{s.coach.activeId=event.target.value;});}
  if(event.target.matches('[data-share-stage]')){preview=null;document.querySelector('.coach-preview')?.remove();document.querySelector('[data-coach="export"]')?.remove();}
  if(event.target.id==='coach-import'&&event.target.files[0]){const file=event.target.files[0];if(file.size>100000)throw new Error('分享文件过大');const input=formInput();await add(importTemplate(JSON.parse(await file.text()),input));notify('已复制为你的独立路线');}
 }catch(error){notify(error.message);}});
 document.addEventListener('click',async event=>{const b=event.target.closest('[data-coach]');if(!b)return;
  try{const session=active();if(!session)return;const id=session.id;
   const change=fn=>save(s=>fn(s.coach.sessions.find(x=>x.id===id)));
   if(b.dataset.coach==='signal'){if(b.disabled)return;b.disabled=true;const key=answerKey(session),position=session.position,eventCount=session.events.length,answer=document.getElementById('coach-answer')?.value||'';try{await change(s=>{if(s.position!==position||s.events.length!==eventCount)throw new Error('反馈已更新，请查看当前阶段');applySignal(s,b.dataset.signal,answer);});answers.delete(key);refresh();}finally{b.disabled=false;}}
   if(b.dataset.coach==='depth')await change(s=>{s.depth=b.dataset.coachDepth;});
   if(b.dataset.coach==='memory'){const value=document.getElementById(`memory-${b.dataset.id}`).value;await change(s=>updateMemory(s,b.dataset.id,value));memoryDrafts.delete(`${session.id}/${b.dataset.id}`);}
   if(b.dataset.coach==='pause')await change(s=>{s.paused=!s.paused;});
   if(b.dataset.coach==='preview'){preview=shareTemplate(session,[...document.querySelectorAll('[data-share-stage]:checked')].map(x=>x.dataset.shareStage));refresh();const details=document.querySelector('.coach-preview')?.closest('details');if(details)details.open=true;}
   if(b.dataset.coach==='export'&&preview){const url=URL.createObjectURL(new Blob([JSON.stringify(preview,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='upigo-shared-route.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
   if(b.dataset.coach==='adapt'){
    if(!document.getElementById('coach-adapt-consent').checked)throw new Error('请先确认发送范围');
    const context=modelInput(session),input={goal:context.goal,minutes:context.minutes,baseline:context.memories.map(m=>m.text).join('\n').slice(0,1000)||'用户未提供基础，不作推断',preference:'',feedback:context.feedback,sourcePack:session.sourcePack,consent:true};
    const plan=await generate(input);await add(createSession(input,plan,'deepseek'));notify('已创建新的后续路线，原记录保留');
   }
  }catch(error){notify(error.message);}
 });
}
