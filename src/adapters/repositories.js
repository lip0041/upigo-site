import { validateState } from '../core/model.js';
import { migrateLegacy, initialState, refreshExampleReadings } from '../core/planner.js';
const KEY = 'upigo.state.v2';
export class BrowserRepository {
  constructor(storage = localStorage) { this.storage = storage; this.mode = 'browser'; }
  async load(catalog) {
    const raw = this.storage.getItem(KEY);
    if (raw) return validateState(refreshExampleReadings(JSON.parse(raw),catalog));
    const old = this.storage.getItem('upigo.prototype.v1');
    const state = old ? migrateLegacy(JSON.parse(old), catalog) : initialState(catalog);
    this.storage.setItem(KEY, JSON.stringify(state)); return state;
  }
  async save(state, expectedRevision) {
    const stored = this.storage.getItem(KEY); const revision = stored ? JSON.parse(stored).revision : 0;
    if (revision !== expectedRevision) throw new Error('另一页面已更新记录，请刷新后再操作');
    const next = validateState({...structuredClone(state), revision: expectedRevision + 1});
    this.storage.setItem(KEY, JSON.stringify(next)); return next;
  }
}
export class HttpRepository {
  constructor(base = './api/state') { this.base = base; this.mode = 'markdown'; }
  async load(catalog) {
    const response = await fetch(this.base, {cache:'no-store'});
    if (response.status === 404) return initialState(catalog);
    if (!response.ok) throw new Error('无法读取本地记录');
    return validateState(refreshExampleReadings(await response.json(),catalog));
  }
  async save(state, expectedRevision) {
    const response = await fetch(this.base, { method: 'PUT', headers: {'Content-Type':'application/json','If-Match':String(expectedRevision)}, body:JSON.stringify(state) });
    if (response.status === 409) throw new Error('另一页面已更新记录，请刷新后再操作');
    if (!response.ok) throw new Error('本地记录保存失败，请稍后重试');
    return validateState(await response.json());
  }
}
export async function chooseRepository() {
  if (['127.0.0.1','localhost','[::1]'].includes(location.hostname)) {
    try { const response = await fetch('./api/capabilities', {signal:AbortSignal.timeout(1500),cache:'no-store'}); if (response.ok && (await response.json()).storage === 'markdown') return new HttpRepository(); } catch { /* Ordinary static localhost preview uses browser storage. */ }
  }
  return new BrowserRepository();
}
