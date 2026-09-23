import {check, text, SAFE_ID, getProgress, updateProgress} from './model.js';

// Published content owns the answer; user records only carry a versioned attempt.
export function validatePractice(practice) {
  if (!practice) return;
  check(SAFE_ID.test(practice.id), '自测标识无效');
  text(practice.prompt, '自测问题');
  check(Array.isArray(practice.options) && practice.options.length >= 2 && practice.options.length <= 5, '自测选项无效');
  practice.options.forEach(option => text(option, '自测选项', 500));
  check(Number.isInteger(practice.answer) && practice.answer >= 0 && practice.answer < practice.options.length, '自测答案无效');
  text(practice.explanation, '自测解释'); text(practice.say, '交流示例'); text(practice.ask, '交流问题');
}
export function attemptFor(progress, lesson) {
  const a=progress.attempt;
  return a && lesson.practice && a.practiceId===lesson.practice.id && a.choice<lesson.practice.options.length ? a : null;
}
export function answerPractice(state, lesson, choice) {
  validatePractice(lesson.practice);
  check(lesson.practice && Number.isInteger(choice) && choice>=0 && choice<lesson.practice.options.length, '请选择有效选项');
  updateProgress(state,lesson.id,{attempt:{practiceId:lesson.practice.id,choice,answeredAt:new Date().toISOString()}});
}
export function recommendLesson(state, goal, catalog) {
  const entries=goal.stages[goal.activeStage].contentIds.map(id=>catalog.lessons[id]).filter(Boolean).map(lesson=>{
    const progress=getProgress(state,goal.id,lesson.id),attempt=attemptFor(progress,lesson);
    const retry=attempt && attempt.choice!==lesson.practice.answer;
    const reason=retry?'上次自测卡在这里，先回看解释，再重新自测。':progress.feedback==='没看懂'?'你反馈还没看懂，先把这个问题弄清楚。':!progress.read?'这一阶段还没读过，从这里开始。':null;
    return {lesson,reason,depth:retry?'explanation':progress.feedback==='没看懂'?'overview':undefined,rank:retry||progress.feedback==='没看懂'?0:!progress.read?1:reason?2:3};
  }).filter(item=>item.reason);
  entries.sort((a,b)=>a.rank-b.rank || Number(a.lesson.minutes>goal.dailyMinutes)-Number(b.lesson.minutes>goal.dailyMinutes));
  const next=entries[0];
  if(!next)return null;
  return {...next,depth:next.lesson.minutes>goal.dailyMinutes?'overview':next.depth,short:next.lesson.minutes>goal.dailyMinutes};
}
