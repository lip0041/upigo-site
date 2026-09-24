import {validateCoach} from './coach.js';
export const SCHEMA_VERSION = 2;
export const DEPTHS = ['overview', 'explanation', 'deep'];
export const FEEDBACK = ['太基础', '刚好', '没看懂'];
export const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,95}$/;
export function check(condition, message) { if (!condition) throw new Error(message); }
export function text(value, name, max = 2000) {
  check(typeof value === 'string' && value.trim().length > 0 && value.length <= max, `${name}不能为空，且不能超过 ${max} 字`);
  return value.trim();
}
export function validateState(state) {
  if(state?.coach!==undefined)validateCoach(state.coach);
  check(state && state.schemaVersion === SCHEMA_VERSION, '记录版本不兼容');
  check(Number.isInteger(state.revision) && state.revision >= 0, '记录版本号无效');
  check(Array.isArray(state.goals) && state.goals.length >= 1 && state.goals.length <= 100, '目标数量无效');
  const ids = new Set();
  for (const goal of state.goals) {
    check(SAFE_ID.test(goal.id) && !ids.has(goal.id), '目标标识重复或无效'); ids.add(goal.id);
    text(goal.title, '目标名称', 100); text(goal.description, '目标描述', 2000);
    check(SAFE_ID.test(goal.pluginId), '场景标识无效');
    check(typeof goal.pluginVersion === 'string', '缺少场景版本');
    check(Number.isInteger(goal.dailyMinutes) && goal.dailyMinutes >= 5 && goal.dailyMinutes <= 60, '每日时间无效');
    check(Array.isArray(goal.stages) && goal.stages.length > 0 && goal.stages.length <= 30, '阶段数量无效');
    check(Number.isInteger(goal.activeStage) && goal.activeStage >= 0 && goal.activeStage < goal.stages.length, '当前阶段无效');
    const stages = new Set();
    for (const stage of goal.stages) {
      check(SAFE_ID.test(stage.id) && !stages.has(stage.id), '阶段标识无效'); stages.add(stage.id);
      text(stage.title, '阶段名称', 180); text(stage.objective, '阶段目标');
      check(Array.isArray(stage.contentIds) && stage.contentIds.every(id => SAFE_ID.test(id)), '内容引用无效');
      check(Array.isArray(stage.tasks) && stage.tasks.length <= 20, '任务无效');
      const taskIds = new Set();
      for (const task of stage.tasks) {
        check(SAFE_ID.test(task.id) && !taskIds.has(task.id) && typeof task.done === 'boolean', '任务状态无效'); taskIds.add(task.id);
        text(task.title, '任务说明', 2000);
      }
    }
  }
  check(ids.has(state.activeGoalId), '当前目标不存在');
  check(state.preferences && DEPTHS.includes(state.preferences.depth), '讲解深度无效');
  check(state.progress && typeof state.progress === 'object' && !Array.isArray(state.progress), '进度数据无效');
  check(Object.keys(state.progress).length <= 10000, '进度记录过多');
  for (const [key, record] of Object.entries(state.progress)) {
    check(/^[a-z0-9_-]+\/[a-z0-9_-]+$/.test(key), '进度标识无效');
    check(record && typeof record === 'object', '进度记录无效');
    check(typeof record.saved === 'boolean' && typeof record.read === 'boolean', '阅读状态无效');
    check(typeof record.note === 'string' && record.note.length <= 10000, '笔记过长');
    if (record.attempt !== undefined) {
      const a=record.attempt;
      check(a && SAFE_ID.test(a.practiceId) && Number.isInteger(a.choice) && a.choice>=0 && a.choice<5 && typeof a.answeredAt==='string' && Number.isFinite(Date.parse(a.answeredAt)), '自测记录无效');
    }
    check(record.feedback === null || FEEDBACK.includes(record.feedback), '反馈无效');
  }
  return state;
}
export const progressKey = (goalId, contentId) => `${goalId}/${contentId}`;
export function getProgress(state, goalId, contentId) {
  return state.progress[progressKey(goalId, contentId)] || { saved: false, read: false, note: '', feedback: null };
}
export function activeGoal(state) { return state.goals.find(g => g.id === state.activeGoalId); }
export function updateProgress(state, contentId, patch) {
  check(SAFE_ID.test(contentId), '内容标识无效');
  const key = progressKey(state.activeGoalId, contentId);
  state.progress[key] = { ...getProgress(state, state.activeGoalId, contentId), ...patch };
}
