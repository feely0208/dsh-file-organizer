#!/usr/bin/env node
import { dups, organize, plan, clean } from '../lib/organize.mjs';

const args = process.argv.slice(2);
const get = (n, d = '') => { const i = args.indexOf(n); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : d; };
const has = (n) => args.includes(n);

if (!args.length || has('--help')) {
  console.log(`dsh-file-organizer —— 深鲸文件整理（默认只看不动）

  --plan <目录> [--by type|date]     出整理计划（不落盘）
  --apply <目录> [--by type|date]    执行移动（按 类型/年月 归档，同名自动加 -2）
  --dups <目录>                       找重复文件（按大小+sha256）
  --clean <目录> [--delete] [--empty-files]   清空目录（--delete 才真删；--empty-files 才删空文件）

全都本地完成，不上传。默认不删任何文件。`);
  process.exit(0);
}
const root = get('--plan') || get('--apply') || get('--dups') || get('--clean');
const by = get('--by', 'type');
const json = has('--json');
const out = (o) => { console.log(JSON.stringify(o, null, 2)); };

if (has('--dups')) { const r = dups({ root }); json ? out(r) : (console.log(`重复文件组：${r.groups.length}，可回收 ${(r['可回收字节'] / 1048576).toFixed(2)} MB`), r.groups.forEach((g) => { console.log(`- ${(g.size / 1024).toFixed(1)} KB`); g.files.forEach((f) => console.log('   ', f)); })); process.exit(r.groups.length ? 1 : 0); }
if (has('--clean')) { const r = clean({ root, del: has('--delete'), emptyFiles: has('--empty-files') }); json ? out(r) : (console.log(`${r.deleted ? '已删除' : '将清理'}空目录 ${r.removedDirs.length} 个；空文件 ${r.emptyFiles.length} 个`), r.removedDirs.slice(0, 30).forEach((d) => console.log('  dir', d)), r.emptyFiles.slice(0, 30).forEach((f) => console.log('  file', f))); process.exit(0); }
const r = has('--apply') ? organize({ root, by, apply: true }) : plan({ root, by });
if (!r.ok) { console.error('❌', r.error); process.exit(1); }
if (json) { out(r); process.exit(0); }
console.log(`${r.applied ? '已移动' : '计划移动'} ${r.applied ? r.moved : r.total} 个文件（by=${by}）`);
r.moves.slice(0, 40).forEach((m) => console.log(`  ${m.from}  →  ${m.to}`));
if (r.moves.length > 40) console.log(`  … 还有 ${r.moves.length - 40} 条`);
if (r.emptyFiles.length) console.log(`空文件 ${r.emptyFiles.length} 个（可用 --clean --empty-files 处理）`);
if (r.conflictTargets.length) console.log(`同名冲突 ${r.conflictTargets.length} 处（执行时自动加序号）`);
