/**
 * 深鲸文件整理 · 内核
 *
 * 三个动作：
 *   dry   —— 只出计划（默认），不动物件
 *   move  —— 按「类型/年月」把文件挪进子目录（同名自动加序号）
 *   clean —— 清理空目录 + 列出重复/零字节/超大文件（--delete 才真删）
 *
 * 安全默认：不删任何东西；只有显式 --apply 才执行 move，--delete 才执行 clean 的删除。
 */
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync } from 'node:fs';
import { basename, extname, join, relative, sep } from 'node:path';

const SKIP = new Set(['node_modules', '.git', '.svn', '__pycache__', '.DS_Store']);

export const GROUPS = {
  doc: ['docx', 'doc', 'pdf', 'md', 'txt', 'rtf', 'odt', 'pages'],
  sheet: ['xlsx', 'xls', 'csv', 'numbers', 'ods'],
  slide: ['pptx', 'ppt', 'key', 'odp'],
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'svg', 'bmp', 'tif', 'tiff'],
  video: ['mp4', 'mov', 'mkv', 'avi', 'webm'],
  audio: ['mp3', 'wav', 'm4a', 'flac', 'aac'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz'],
  code: ['js', 'ts', 'py', 'java', 'go', 'rs', 'sh', 'json', 'yml', 'yaml', 'html', 'css'],
};

export function 归类(ext) {
  const e = String(ext || '').toLowerCase().replace(/^\./, '');
  for (const [k, list] of Object.entries(GROUPS)) if (list.includes(e)) return k;
  return 'other';
}

function 遍历(root, out) {
  const go = (dir) => {
    let names = [];
    try { names = readdirSync(dir); } catch { return; }
    for (const n of names) {
      if (n.startsWith('.')) continue;
      const p = join(dir, n);
      let st;
      try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { if (!SKIP.has(n)) go(p); continue; }
      if (st.isFile()) out.push({ path: p, size: st.size, mtime: st.mtime });
    }
  };
  go(root);
  return out;
}

function hashFile(f) {
  try { return createHash('sha256').update(readFileSync(f)).digest('hex'); } catch { return ''; }
}

/** 出整理计划（不落盘） */
export function plan({ root, by = 'type' }) {
  const dir = String(root || '').trim();
  if (!dir) return { ok: false, error: '请填写要整理的目录' };
  if (!existsSync(dir)) return { ok: false, error: `目录不存在：${dir}` };
  const files = 遍历(dir, []);
  const moves = [];
  for (const f of files) {
    const ext = extname(f.path);
    const group = 归类(ext);
    const ym = `${f.mtime.getFullYear()}-${String(f.mtime.getMonth() + 1).padStart(2, '0')}`;
    const target = by === 'date' ? ym : join(group, ym);
    moves.push({ from: relative(dir, f.path).split(sep).join('/'), to: join(target, basename(f.path)).split(sep).join('/'), size: f.size, group });
  }
  const 重名 = new Map();
  for (const m of moves) 重名.set(m.to, (重名.get(m.to) || 0) + 1);
  return {
    ok: true, applied: false, root: dir, total: moves.length,
    moves,
    duplicates: moves.filter((m) => m.size === 0).map((m) => m.from),
    emptyFiles: moves.filter((m) => m.size === 0).map((m) => m.from),
    conflictTargets: [...重名.entries()].filter(([, n]) => n > 1).map(([t, n]) => `${t}（${n} 个同名）`),
  };
}

/** 执行整理（apply=true 才真的移动） */
export function organize({ root, by = 'type', apply = false }) {
  const p = plan({ root, by });
  if (!p.ok) return p;
  if (!apply) return { ...p, applied: false };
  const 已用 = new Set();
  let moved = 0;
  for (const m of p.moves) {
    const src = join(p.root, m.from);
    let dest = join(p.root, m.to);
    // 同名冲突：加 -2、-3
    let i = 1;
    const ext = extname(dest), base = dest.slice(0, dest.length - ext.length);
    while (existsSync(dest) || 已用.has(dest)) { i += 1; dest = `${base}-${i}${ext}`; }
    已用.add(dest);
    try {
      mkdirSync(join(dest, '..'), { recursive: true });
      renameSync(src, dest);
      moved += 1;
    } catch { try { copyFileSync(src, dest); rmSync(src); moved += 1; } catch { /* 跳过 */ } }
  }
  return { ...p, applied: true, moved };
}

/** 清理：删空目录；可选删空文件；默认只报告 */
export function clean({ root, del = false, emptyFiles = false }) {
  const dir = String(root || '').trim();
  if (!existsSync(dir)) return { ok: false, error: `目录不存在：${dir}` };
  const removedDirs = [], empty = [];
  const go = (d) => {
    let names = [];
    try { names = readdirSync(d); } catch { return; }
    for (const n of names) {
      if (n.startsWith('.')) continue;
      const p = join(d, n);
      let st; try { st = statSync(p); } catch { continue; }
      if (st.isDirectory()) { if (!SKIP.has(n)) { go(p); if (readdirSync(p).length === 0) { removedDirs.push(relative(dir, p)); if (del) try { rmSync(p, { recursive: true }); } catch {} } } }
      else if (st.isFile() && st.size === 0) { empty.push(relative(dir, p).split(sep).join('/')); if (del && emptyFiles) try { rmSync(p); } catch {} }
    }
  };
  go(dir);
  return { ok: true, root: dir, deleted: del, removedDirs, emptyFiles: empty };
}

/** 重复文件检测（按大小分组后比对 sha256） */
export function dups({ root }) {
  const dir = String(root || '').trim();
  if (!existsSync(dir)) return { ok: false, error: `目录不存在：${dir}` };
  const files = 遍历(dir, []);
  const bySize = new Map();
  for (const f of files) { if (!bySize.has(f.size)) bySize.set(f.size, []); bySize.get(f.size).push(f); }
  const groups = [];
  for (const [size, list] of bySize) {
    if (size === 0 || list.length < 2) continue;
    const byHash = new Map();
    for (const f of list) {
      const h = hashFile(f.path); if (!h) continue;
      if (!byHash.has(h)) byHash.set(h, []);
      byHash.get(h).push(relative(dir, f.path).split(sep).join('/'));
    }
    for (const [, paths] of byHash) if (paths.length > 1) groups.push({ size, files: paths });
  }
  return { ok: true, root: dir, groups, 可回收字节: groups.reduce((s, g) => s + g.size * (g.files.length - 1), 0) };
}
