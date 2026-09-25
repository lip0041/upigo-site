import {escapeHtml as e, safeUrl} from '../core/markdown.js';
const renderers = {
  diagram: media => `<figure class="concept-diagram"><figcaption>${e(media.title)}</figcaption><ol>${media.steps.map(step=>`<li><strong>${e(step.title)}</strong><span>${e(step.text)}</span></li>`).join('')}</ol><small>${e(media.caption || '原理示意，不代表实测数据')}</small></figure>`,
  image: media => `<figure class="content-media"><img src="${e(safeUrl(media.src,true))}" alt="${e(media.alt)}" loading="lazy"><figcaption>${e(media.caption || media.alt)} ${media.credit?`· ${e(media.credit)}`:''}${safeUrl(media.licenseUrl)?` · <a href="${e(safeUrl(media.licenseUrl))}" target="_blank" rel="noopener">许可</a>`:''}${safeUrl(media.sourceUrl)?` · <a href="${e(safeUrl(media.sourceUrl))}" target="_blank" rel="noopener">来源与授权 ↗</a>`:''}</figcaption></figure>`,
  audio: media => `<figure class="content-media"><audio controls preload="none" src="${e(safeUrl(media.src,true))}"></audio><figcaption>${e(media.title)}${media.transcript?`<details><summary>文字稿</summary><p>${e(media.transcript)}</p></details>`:''}</figcaption></figure>`,
  video: media => `<figure class="content-media"><video controls preload="none" playsinline src="${e(safeUrl(media.src,true))}" ${safeUrl(media.poster,true)?`poster="${e(safeUrl(media.poster,true))}"`:''}></video><figcaption>${e(media.title)}${media.transcript?`<details><summary>文字说明</summary><p>${e(media.transcript)}</p></details>`:''}</figcaption></figure>`,
  resource: media => `<a class="resource-card" href="${e(safeUrl(media.src))}" target="_blank" rel="noopener"><span>${e(media.label || '延伸资源')}</span><strong>${e(media.title)} ↗</strong><small>${e(media.description || '在原网站打开')}</small></a>`
};
export function renderMedia(items = [], depth) {
  return items.filter(m=>!m.depths || m.depths.includes(depth)).map(media=> {
    if (!renderers[media.type] || (media.type!=='diagram' && !safeUrl(media.src,media.type!=='resource'))) return '';
    return renderers[media.type](media);
  }).join('');
}
