# 深鲸文件整理（@deepwhale-cn/dsh-file-organizer）

散文件归档三件事：**按类型/年月整理**、**找重复**、**清空目录**。默认只看不动。

## 安装

```bash
dsh plugin --profile web add @deepwhale-cn/dsh-file-organizer
```

## 用法

```bash
dsh-file-organizer --plan ./下载            # 先看计划（不落盘）
dsh-file-organizer --apply ./下载           # 执行：doc/2026-10/xxx.docx
dsh-file-organizer --apply ./下载 --by date # 只按年月
dsh-file-organizer --dups ./下载            # 重复文件（大小+sha256）
dsh-file-organizer --clean ./下载 --delete  # 清空目录（默认只报告）
```

面板：侧栏「深鲸文件整理」。

## 安全

- 默认不删任何文件；`--apply` 才移动，`--delete` 才删除；
- 同名目标自动加 `-2`、`-3`，绝不覆盖；
- 跳过 node_modules / .git；本机完成，不上传。
