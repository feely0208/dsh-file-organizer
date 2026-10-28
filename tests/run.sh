#!/bin/bash
set -uo pipefail
cd "$(dirname "$0")/.."
PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }
T=$(mktemp -d); mkdir -p "$T/in/子" "$T/in/空目录"
printf abc > "$T/in/a.docx"; printf abc > "$T/in/b.docx"; printf 'pdf' > "$T/in/子/c.pdf"; printf 'img' > "$T/in/d.png"
echo ""; echo "  深鲸文件整理 · 回归"
P=$(node bin/cli.mjs --plan "$T/in" --json)
echo "$P" | python3 -c "import json,sys;d=json.load(sys.stdin);assert d['total']==4,d['total'];assert not d['applied']" && ok "plan：4 个文件、未落盘" || bad "plan 异常"
[ -f "$T/in/a.docx" ] && ok "plan 不移动文件" || bad "plan 竟移动了文件"
node bin/cli.mjs --apply "$T/in" >/dev/null
[ -f "$T/in/doc/$(date +%Y-%m)/a.docx" ] && ok "apply 按类型/年月归档" || bad "apply 未归档：$(find "$T/in" -type f | head -3)"
D=$(node bin/cli.mjs --dups "$T/in" --json)
echo "$D" | python3 -c "import json,sys;d=json.load(sys.stdin);assert len(d['groups'])==1,d['groups']" && ok "找到 1 组重复（a/b 内容相同）" || bad "重复检测异常"
C=$(node bin/cli.mjs --clean "$T/in" --json)
echo "$C" | python3 -c "import json,sys;d=json.load(sys.stdin);assert len(d['removedDirs'])>=1" && ok "列出空目录" || bad "空目录未列出"
[ -d "$T/in/空目录" ] && ok "clean 默认不删除" || bad "clean 竟删了目录"
node bin/cli.mjs --clean "$T/in" --delete >/dev/null
[ ! -d "$T/in/空目录" ] && ok "clean --delete 真删" || bad "--delete 未生效"
node bin/cli.mjs --plan "$T/nonexist" >/dev/null 2>&1; [ $? -eq 1 ] && ok "不存在目录退出码 1" || bad "错误处理异常"
echo "  ────────────────────────────────────────"; echo "  通过 $PASS · 失败 $FAIL"; rm -rf "$T"; [ "$FAIL" -eq 0 ]
