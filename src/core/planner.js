import { check, text, SAFE_ID, SCHEMA_VERSION } from './model.js';
export function validatePlugin(plugin) {
  check(plugin.apiVersion === 1 && SAFE_ID.test(plugin.id), '不支持的场景插件');
  text(plugin.name, '场景名', 80); text(plugin.version, '插件版本', 30);
  check(Array.isArray(plugin.phases) && plugin.phases.length >= 2 && plugin.phases.length <= 12, '插件阶段无效');
  const ids = new Set();
  for (const phase of plugin.phases) {
    check(SAFE_ID.test(phase.id) && !ids.has(phase.id), '插件阶段标识无效'); ids.add(phase.id);
    text(phase.title, '阶段名', 120); text(phase.objective, '阶段目标');
    check(Array.isArray(phase.contentIds) && phase.contentIds.every(id => SAFE_ID.test(id)), '插件内容引用无效');
    check(Array.isArray(phase.tasks) && phase.tasks.length > 0, '缺少阶段任务');
    phase.tasks.forEach(task => text(task, '任务', 1500));
  }
  return plugin;
}
function interpolate(value, vars) { return value.replace(/\{(goal|context|outcome)\}/g, (_, key) => vars[key]); }
/** Rule-based provider: deliberately not a claim of LLM or retrieval capability. */
export function planGoal(input, plugins, id = `goal-${crypto.randomUUID()}`) {
  const plugin = plugins.find(p => p.id === input.pluginId); check(plugin, '请选择可用场景'); validatePlugin(plugin);
  const vars = { goal: text(input.title, '目标名称', 100), context: (input.context || '').trim().slice(0, 1000) || '从当前基础出发', outcome: text(input.outcome || input.title, '完成标准', 500) };
  const dailyMinutes = Number(input.dailyMinutes); check(Number.isInteger(dailyMinutes) && dailyMinutes >= 5 && dailyMinutes <= 60, '每日时间应为 5—60 分钟');
  return {
    id, pluginId: plugin.id, pluginVersion: plugin.version, title: vars.goal,
    description: vars.outcome, context: vars.context, dailyMinutes, activeStage: 0,
    origin: 'template', createdAt: new Date().toISOString(),
    stages: plugin.phases.map(phase => ({ id: phase.id, title: phase.title,
      objective: interpolate(phase.objective, vars), contentIds: [...phase.contentIds],
      tasks: phase.tasks.map((task, i) => ({ id: `${phase.id}-task-${i + 1}`, title: interpolate(task, vars), done: false }))
    }))
  };
}
export function initialState(catalog) {
  return { schemaVersion: SCHEMA_VERSION, revision: 0, activeGoalId: catalog.example.id,
    goals: [structuredClone(catalog.example)], progress: {}, preferences: { depth: 'overview' } };
}
export function migrateLegacy(raw, catalog) {
  const state = initialState(catalog);
  if (!raw || typeof raw !== 'object') return state;
  state.goals[0].activeStage = Number.isInteger(raw.day) && raw.day >= 0 && raw.day < state.goals[0].stages.length ? raw.day : 1;
  state.preferences.depth = ({short:'overview',body:'explanation',deep:'deep'})[raw.depth] || 'overview';
  for (const id of Object.keys(catalog.lessons)) {
    const saved = Array.isArray(raw.saved) && raw.saved.includes(id), read = Array.isArray(raw.read) && raw.read.includes(id);
    const note = typeof raw.notes?.[id] === 'string' ? raw.notes[id].slice(0,10000) : '';
    const feedback = ['太基础','刚好','没看懂'].includes(raw.feedback?.[id]) ? raw.feedback[id] : null;
    if (saved || read || note || feedback) state.progress[`${state.activeGoalId}/${id}`] = {saved,read,note,feedback};
  }
  return state;
}
