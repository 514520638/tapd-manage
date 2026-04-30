---
name: tapd-log-api
description: "封装 Tapd 开放平台 API，用于获取用户信息、工单列表、自动创建日志等操作。当用户提到 'TAPD'、'tapd日志'、'自动创建日志'、'获取工单'、'查询TAPD' 时使用此 skill。"
metadata: {"openclaw":{"emoji":"📋","requires":{"env":["TAPD_USER_TOKEN"]}}}
---

# Skill: Tapd Log API

## 何时使用
- 用户说 "帮我查一下 TAPD 待办"
- 用户说 "自动创建日志"
- 用户说 "获取我的任务列表"
- 用户说 "TAPD" 相关操作

## 环境变量（必需）

使用此 skill 前，AI 需要询问用户以下配置：

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `TAPD_USER_TOKEN` | ✅ | Tapd OAuth Access Token，从 [Tapd 开放平台](https://dev.tapd.cn/) 获取 |

**重要：AI 必须先确认用户已提供 `TAPD_USER_TOKEN`，否则无法调用 API。**

---

## API 方法

### 1. getUserInfo
获取当前用户信息。

```javascript
const tapd = require('./src/api/tapd-skill.js');
const info = await tapd.getUserInfo();
```

### 2. getUserWorkspace
获取用户工作空间 ID。

```javascript
const workspaceId = tapd.getUserWorkspace();
```

### 3. getWorkTypeList(workspace_id)
获取工单类型列表（如 Story、Task、LOG 等）。

```javascript
const types = await tapd.getWorkTypeList(workspaceId);
const taskTypeId = types.find(t => t.WorkitemType.english_name === 'Task').WorkitemType.id;
```

### 4. getUserStoryList(workspace_id, workTypeId)
获取指定类型的用户 Story/Task 列表，包含业务价值评分计算。

```javascript
const tasks = await tapd.getUserStoryList(workspaceId, taskTypeId);
```

### 5. autoLog（核心功能）
自动执行：获取用户信息 → 计算最优 Task → 创建 LOG 子需求 → 状态改为已完成 → 返回链接。

```javascript
const result = await tapd.autoLog();
// result = { resultLog, editLogResult, resultUrl }
```

---

## 执行示例

### 完整日志创建流程

```bash
# 1. 首先确保有 TAPD_USER_TOKEN 环境变量
# 2. 调用 autoLog 方法

node -e "
const tapd = require('./src/api/tapd-skill.js')(process.env.TAPD_USER_TOKEN);
tapd.autoLog().then(r => console.log(r.resultUrl));
"
```

---

## 输出格式

执行完成后返回：
- ✅ 选中的 Task 名称和评分
- 🔗 创建的 LOG 链接
- 📊 执行状态

---

## 错误处理

| 错误码 | 说明 | 处理方式 |
|--------|------|----------|
| 401 | Token 无效或过期 | 请用户重新从 Tapd 开放平台获取新的 Access Token |
| 403 | 权限不足 | 检查 Token 是否有对应接口权限 |
| 422 | 参数缺失 | 检查 workspace_id 等必填参数 |
| 500 | 服务器错误 | 重试或稍后再试 |

---

## 注意事项

- 所有 API 请求通过 `https://api.tapd.cn` 代理
- 请求自动携带 `Authorization: Bearer {TOKEN}` 头
- `autoLog` 方法会打开浏览器窗口显示创建的日志页面