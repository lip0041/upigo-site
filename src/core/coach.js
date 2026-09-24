// Versioned learning-loop protocol, independent of UI, storage and model vendor.
import {safeUrl} from './markdown.js';

const requireValue=(ok,message)=>{if(!ok)throw new Error(message);};
const str=(v,max=2000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const list=(v,min,max)=>Array.isArray(v)&&v.length>=min&&v.length<=max;
export const SIGNALS={understood:'这次理解了',hard:'还没看懂',known:'这部分会了',dislike:'暂不感兴趣'};
export function validatePlan(plan){
 requireValue(plan&&str(plan.title,120)&&list(plan.stages,2,6),'计划需有标题和 2—6 个阶段');
 const ids=new Set();
 for(const s of plan.stages){
  requireValue(s&&/^[a-z][a-z0-9-]{0,60}$/.test(s.id)&&!ids.has(s.id),'阶段标识无效');ids.add(s.id);
  for(const key of ['title','objective','overview','explanation','deep','exercise','rubric'])requireValue(str(s[key],key==='title'?120:4000),`阶段 ${key} 无效`);
  requireValue(list(s.sources,1,5),'每阶段需要 1—5 个来源');
  for(const source of s.sources)requireValue(source&&str(source.title,200)&&safeUrl(source.url),'来源无效');
 }
 return plan;
}
export function createSession(input,plan,mode='offline'){
 requireValue(str(input.goal,200)&&str(input.baseline,1000),'请说明目标和当前基础');
 requireValue(Number.isInteger(input.minutes)&&input.minutes>=5&&input.minutes<=60,'每次时间应为 5—60 分钟');
 requireValue(typeof input.preference==='string'&&input.preference.length<=1000,'偏好过长');
 requireValue(['offline','openai','shared'].includes(mode),'提供方无效');validatePlan(plan);
 return {id:`coach-${crypto.randomUUID()}`,goal:input.goal.trim(),minutes:input.minutes,mode,plan:structuredClone(plan),
  memories:[{id:'baseline',text:input.baseline.trim(),kind:'explicit'},...(input.preference.trim()?[{id:'preference',text:input.preference.trim(),kind:'explicit'}]:[])],events:[],position:0,depth:'overview',paused:false};
}
export function validateCoach(coach){
 requireValue(coach&&coach.version===1&&list(coach.sessions,0,30),'成长记录版本或数量无效');
 const ids=new Set();
 for(const s of coach.sessions){
  requireValue(s&&/^coach-[a-z0-9-]+$/.test(s.id)&&!ids.has(s.id),'成长记录标识无效');ids.add(s.id);
  requireValue(str(s.goal,200)&&Number.isInteger(s.minutes)&&s.minutes>=5&&s.minutes<=60&&['offline','openai','shared'].includes(s.mode),'成长目标无效');
  validatePlan(s.plan);
  requireValue(Number.isInteger(s.position)&&s.position>=0&&s.position<=s.plan.stages.length&&['overview','explanation','deep'].includes(s.depth)&&typeof s.paused==='boolean','成长阶段无效');
  requireValue(list(s.memories,0,20)&&list(s.events,0,100),'记忆或反馈过多');
  const mids=new Set();
  for(const m of s.memories){requireValue(m&&str(m.id,100)&&!mids.has(m.id)&&str(m.text,1000)&&['explicit','hypothesis'].includes(m.kind),'记忆无效');mids.add(m.id);}
  for(const ev of s.events)requireValue(ev&&s.plan.stages.some(st=>st.id===ev.stageId)&&Object.hasOwn(SIGNALS,ev.signal)&&typeof ev.answer==='string'&&ev.answer.length<=2000&&typeof ev.at==='string'&&Number.isFinite(Date.parse(ev.at)),'反馈记录无效');
 }
 requireValue(coach.activeId===null&&coach.sessions.length===0||ids.has(coach.activeId),'当前成长记录不存在');return coach;
}
export function applySignal(session,signal,answer=''){
 requireValue(Object.hasOwn(SIGNALS,signal),'反馈无效');requireValue(typeof answer==='string'&&answer.length<=2000,'整理内容过长');
 const stage=session.plan.stages[session.position];requireValue(stage&&!session.paused,'请先选择可继续的阶段');
 requireValue(session.events.length<100,'本次实验记录已满，请导出备份并创建新实验');
 session.events.push({stageId:stage.id,signal,answer,at:new Date().toISOString()});
 if(signal==='hard')session.depth='explanation';
 else {session.position++;session.depth=signal==='known'?'deep':'overview';}
 // Only explicit feedback moves the route. No inference from not clicking.
 return session;
}
export function nextReason(session){
 if(session.paused)return '已暂停，不会继续安排内容。';
 if(session.position>=session.plan.stages.length)return '本轮已走完。跳过和自报理解不等于已掌握，可以回顾或开始新目标。';
 const last=session.events.at(-1);
 if(last?.signal==='hard')return '你说还没看懂，保留当前问题，换成具体解释；也可以先停下来。';
 if(last?.signal==='known')return '你说这部分会了，下一阶段直接展开细节；这是一条自报反馈。';
 if(last?.signal==='dislike')return '本次跳过这部分，换下一个角度；不会据此认定你长期不感兴趣。';
 if(last)return '按你这次的理解反馈，继续下一阶段；自测不是必需步骤。';
 return `根据你选择的目标安排第一阶段。每次预算 ${session.minutes} 分钟，可随时停下。`;
}
export function updateMemory(session,id,value){
 const item=session.memories.find(m=>m.id===id);requireValue(item,'记忆不存在');
 requireValue(typeof value==='string'&&value.length<=1000,'记忆过长');
 if(!value.trim())session.memories=session.memories.filter(m=>m.id!==id);
 else {item.text=value.trim();item.kind='explicit';}
}
// Never send notes, exercise answers, unrelated goals or unconfirmed hypotheses.
export function modelInput(session){
 return {goal:session.goal,minutes:session.minutes,memories:session.memories.filter(m=>m.kind==='explicit').map(m=>({text:m.text,kind:m.kind})),
  feedback:session.events.slice(-6).map(ev=>({stage:session.plan.stages.find(s=>s.id===ev.stageId).title,signal:ev.signal})),
  previousStages:session.plan.stages.map(s=>s.title)};
}
// A public template is an explicit whitelist, never a serialized workspace.
export function shareTemplate(session,selected){
 requireValue(session.mode!=='openai','AI 草稿尚未人工核查，暂不支持对外分享');
 const stages=session.plan.stages.filter(s=>selected.includes(s.id));requireValue(stages.length>=2,'请选择至少两个阶段');
 return {kind:'upigo-route',version:1,title:session.plan.title,stages:stages.map(s=>({id:s.id,title:s.title,objective:s.objective,overview:s.overview,explanation:s.explanation,deep:s.deep,exercise:s.exercise,rubric:s.rubric,sources:s.sources.map(x=>({title:x.title,url:x.url}))}))};
}
export function importTemplate(raw,input){
 requireValue(raw&&raw.kind==='upigo-route'&&raw.version===1,'分享文件格式不兼容');
 validatePlan(raw);
 // Strip unknown fields and create fresh personal progress.
 const clean=shareTemplate({mode:'shared',plan:raw},raw.stages.map(s=>s.id));
 return createSession(input,{title:clean.title,stages:clean.stages},'shared');
}
