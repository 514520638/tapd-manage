---
name: tapd-auto-log
description: 每日自动在TAPD平台创建日志任务，自动选择最佳任务并挂Log
url: https://dev.tapd.cn/
user-invocable: true
hidden: false

metadata:
  {
    "openclaw": {
      "emoji": "📋",
      "homepage": "https://dev.tapd.cn/",
      "platforms": ["darwin", "linux"],
      "requires": {
        "bins": ["node"],
        "env": [],
        "config": []
      }
    }
  }
---

# TAPD 自动挂Log Skill

这个Skill用于每日自动在TAPD平台上创建日志任务。

## 功能

- 首次运行时会询问用户输入USER_TOKEN（从TAPD开放平台获取）
- 自动保存USER_TOKEN到配置文件（后续运行无需再次输入）
- 自动获取用户信息和工作空间
- 获取用户的Task列表
- 根据业务价值评分自动选择最佳任务
- 创建Log并更新状态为"已处理"
- 自动打开浏览器查看结果

## 使用方法

### 首次配置

1. 前往 [TAPD开放平台](https://dev.tapd.cn/) 注册应用或查看已有应用的访问令牌
2. 运行命令时输入您的USER_TOKEN

### 运行命令

```bash
node {baseDir}/tapd-auto-log.js
```

### 注意事项

- USER_TOKEN会自动保存在 `tapd-config.json` 文件中
- 该配置文件已添加到.gitignore，不会被提交到仓库
- 如果需要更换USER_TOKEN，可以删除 `tapd-config.json` 文件后重新运行

## 依赖

- Node.js (需要安装Node.js环境)
- axios (Node.js模块，脚本会自动检查并提示安装)
