import {safeUrl} from './markdown.js';

const DATE=/^\d{4}-\d{2}-\d{2}$/;
const ID=/^[a-z0-9][a-z0-9-]{1,63}$/;

function text(value,max){return typeof value==='string'&&value.trim()&&value.trim().length<=max;}
function calendarDate(value){
 if(typeof value!=='string'||!DATE.test(value))return false;
 const [year,month,day]=value.split('-').map(Number);
 const leap=year%4===0&&(year%100!==0||year%400===0);
 const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
 return year>=1&&month>=1&&month<=12&&day>=1&&day<=days[month-1];
}

// AI output is only a research draft. This validator deliberately has no way to
// turn it into a published lesson or write to a user's workspace.
export function reviewResearchDraft(draft){
 const issues=[];
 if(!draft||typeof draft!=='object')return {publishable:false,issues:['草稿必须是对象'],draft:null};
 if(!text(draft.topic,120))issues.push('主题缺失或过长');
 if(!Array.isArray(draft.sources)||draft.sources.length<2||draft.sources.length>8)issues.push('需要 2—8 个候选来源');
 if(!Array.isArray(draft.claims)||draft.claims.length<1||draft.claims.length>8)issues.push('需要 1—8 条待核查陈述');
 const sources=new Map();
 for(const source of Array.isArray(draft.sources)?draft.sources:[]){
  if(!ID.test(source?.id||''))issues.push('来源 id 无效');
  else if(sources.has(source.id))issues.push(`来源 id 重复：${source.id}`);
  else sources.set(source.id,source);
  if(!text(source?.title,180)||!text(source?.publisher,100))issues.push(`来源 ${source?.id||'?'} 缺少标题或发布者`);
  if(!safeUrl(source?.url))issues.push(`来源 ${source?.id||'?'} URL 无效`);
  if(!calendarDate(source?.checkedAt))issues.push(`来源 ${source?.id||'?'} 核查日期无效，须为真实的 YYYY-MM-DD 日期`);
 }
 for(const claim of Array.isArray(draft.claims)?draft.claims:[]){
  if(!ID.test(claim?.id||'')||!text(claim?.text,500))issues.push('陈述 id 或正文无效');
  if(!Array.isArray(claim?.sourceIds)||!claim.sourceIds.length)issues.push(`陈述 ${claim?.id||'?'} 没有引用`);
  for(const id of Array.isArray(claim?.sourceIds)?claim.sourceIds:[])if(!sources.has(id))issues.push(`陈述 ${claim?.id||'?'} 引用了未知来源 ${id}`);
  if(!['supported','uncertain','conflict'].includes(claim?.assessment))issues.push(`陈述 ${claim?.id||'?'} 缺少核查结论`);
 }
 if(draft.reviewStatus!=='pending-human-review')issues.push('AI 草稿必须等待人工复核');
 return {publishable:false,issues:[...new Set(issues)],draft:issues.length?null:structuredClone(draft)};
}
