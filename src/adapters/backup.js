import { validateState } from '../core/model.js';
export function exportMarkdown(state) {
  validateState(state);
  return '# Upigo 私人记录备份\n\n包含目标、阶段任务、笔记和反馈。请保存在自己的设备，不要提交到公开仓库。\n\n<!-- upigo-state-v2 -->\n```json\n' + JSON.stringify(state, null, 2) + '\n```\n';
}
export function importMarkdown(markdown) {
  if (typeof markdown !== 'string' || markdown.length > 2_000_000) throw new Error('备份文件过大');
  const match = markdown.match(/<!-- upigo-state-v2 -->\s*```json\s*\n([\s\S]*?)\n```/);
  if (!match) throw new Error('这不是 Upigo v2 备份文件');
  return validateState(JSON.parse(match[1]));
}
