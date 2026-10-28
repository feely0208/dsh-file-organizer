import { createPlugin, pkgRootFrom } from '@deepwhale-cn/dsh-guard-core/plugin';
import { registerOrganizerApi } from './api.js';

const base = createPlugin({
  name: 'file-organizer',
  pkgRoot: pkgRootFrom(import.meta.url),
  skillFile: 'skill/file-organizer.md',
  binFile: 'bin/cli.mjs',
  description: '深鲸文件整理：按类型/年月归档、同名自动加序号、找重复、清空目录——默认只看不动',
  whenToUse: '当用户把一堆散文件要归档时使用：出整理计划（不落盘）、执行移动到 类型/年月 子目录、找重复文件、清理空目录。默认不删任何东西，删除必须显式确认。',
});
export const name = base.name;
export const inject = [...base.inject, 'webServer'];
export function apply(ctx) {
  base.apply(ctx);
  try { if (ctx.webServer?.register) registerOrganizerApi(ctx); } catch (e) { ctx.logger?.warn?.('[file-organizer] 面板出口注册失败: ' + (e?.message || e)); }
}
