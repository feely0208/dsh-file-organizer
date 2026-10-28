# 深鲸文件整理（dsh-file-organizer）

**什么时候用**：用户要把散文件归档、找重复、清空目录时。会说「把下载目录按类型整理一下」「这些文件有没有重复的」「空文件夹清一清」。

## 怎么用

```bash
<cli 路径> --plan <目录> [--by type|date]     # 只看计划，不落盘
<cli 路径> --apply <目录> [--by type|date]    # 执行移动
<cli 路径> --dups <目录>                      # 找重复（大小+sha256）
<cli 路径> --clean <目录> [--delete] [--empty-files]
```

## 规则

- **默认什么都不动**：只有 `--apply` 才移动，只有 `--delete` 才删除；
- 同名目标自动加 `-2`、`-3`，不会覆盖；
- 跳过 node_modules/.git 等目录；
- 全部本机完成，不上传文件。
