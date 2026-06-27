# 后端接口文档

本文档根据当前 Flask 后端代码整理，供前端开发对接使用。未能从代码中确定的内容以“待补充”标记。

## 基础约定

- API 前缀：`/api`
- 认证方式：基于 Flask Session Cookie。登录成功后，浏览器会通过 Cookie 维持登录状态。
- 请求体格式：除特别说明外，`POST` 请求使用 `Content-Type: application/json`
- 时间字段：后端直接返回 Python `datetime` 经 Flask JSON 序列化后的结果，具体字符串格式：待补充
- 跨域：后端启用了 CORS 并允许携带凭据。前端跨域请求时需要带上凭据。

前端请求示例：

```js
fetch("/api/auth/me", {
  credentials: "include",
});
```

## 通用错误

以下错误在多个接口中会出现：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录或登录态无效 | `401` | `"Unauthorized"` |
| 资源不存在 | `404` | 具体字符串，见各接口 |
| 权限不足 | `401` | `"Unauthorized"` |

说明：部分接口使用 `one_or_404()`，当记录不存在时可能返回 Flask 默认 404 HTML/JSON 格式。前端如需统一错误格式，需后端后续补充错误处理。

## 认证接口

### 登录

`POST /api/auth/login`

请求体：

```json
{
  "username": "admin",
  "password": "admin123"
}
```

成功响应：

状态码：`200`

```json
{
  "success": true,
  "username": "admin"
}
```

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 密码错误 | `403` | `"用户名或密码错误"` |
| 用户不存在 | `403` | `"用户名或密码错误"` |

### 登出

`POST /api/auth/logout`

请求体：无

成功响应：

状态码：`200`

```json
"logout success"
```

失败响应：

状态码：`401`

```json
"failed to logout"
```

### 获取当前用户

`GET /api/auth/me`

成功响应：

状态码：`200`

```json
{
  "id": 1,
  "username": "admin"
}
```

失败响应：

状态码：`401`

```json
"Unauthorized"
```

### 修改用户名

`POST /api/auth/me/change_username`

请求体：

```json
{
  "new_username": "new_name"
}
```

成功响应：

状态码：`200`

```json
"successfully updated username to new_name"
```

说明：修改成功后后端会清空当前 Session，前端应跳转到登录页或重新拉取登录状态。

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 用户名已存在 | `403` | `"用户名已存在"` |
| 用户名为空字符串 | `403` | `"用户名不能为空"` |
| 当前用户记录不存在 | `404` | 待补充 |

### 修改密码

`POST /api/auth/me/change_password`

请求体：

```json
{
  "old_password": "old_password",
  "new_password": "NewPassword123!"
}
```

成功响应：

状态码：`200`

```json
"success!"
```

说明：修改成功后后端会清空当前 Session，前端应跳转到登录页或重新拉取登录状态。

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 原密码错误 | `403` | `"原密码错误"` |
| 新密码强度不足 | `403` | 字符串数组，内容见下方 |
| 当前用户记录不存在 | `404` | 待补充 |

密码强度错误示例：

```json
[
  "密码长度至少需要 11 个字符",
  "密码至少需要包含一个大写字母",
  "密码至少需要包含一个小写字母",
  "密码至少需要包含一个数字",
  "密码至少需要包含一个特殊字符"
]
```

密码规则：

- 至少 11 个字符
- 至少包含一个大写字母
- 至少包含一个小写字母
- 至少包含一个数字
- 至少包含一个特殊字符

## 会话接口

### 创建会话

`POST /api/conversations`

请求体：无

成功响应：

状态码：`200`

```json
{
  "success": true,
  "uuid": "conversation-uuid"
}
```

失败响应：

状态码：`401`

```json
"Unauthorized"
```

### 获取会话列表

`GET /api/conversations`

成功响应：

状态码：`200`

```json
[
  {
    "title": "新会话",
    "uuid": "conversation-uuid",
    "updated_at": "Fri, 26 Jun 2026 13:39:44 GMT"
  }
]
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `title` | string | 会话标题 |
| `uuid` | string | 会话 UUID |
| `updated_at` | string | 更新时间 |

失败响应：

状态码：`401`

```json
"Unauthorized"
```

### 获取会话消息

`GET /api/conversations/<conversation_uuid>/messages`

路径参数：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `conversation_uuid` | uuid string | 会话 UUID |

成功响应：

状态码：`200`

```json
[
  {
        "content": [
            {
                "text": "who are you",
                "type": "text"
            }
        ],
        "model": "gpt-5.5",
        "role": "user"
    },
    {
        "content": [
            {
                "text": "I’m GPT-5.1, an AI assistant trained by OpenAI. In this environment, I’m running inside Codex CLI, so I can help inspect code, edit files, run commands, debug issues, and answer general questions.",
                "type": "text"
            }
        ],
        "model": "gpt-5.5",
        "role": "assistant"
    }
]
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `role` | string | `user`、`assistant` 或 `system` |
| `model` | string/null | 消息对应模型。`system` 消息当前不返回该字段 |
| `content` | array | 消息内容数组。目前代码主要保存文本内容 |

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 会话不存在或不属于当前用户 | `404` | `"no such conversation"` |

### 删除会话

`DELETE /api/conversations/<conversation_uuid>/messages`

说明：该接口路径名是 `messages`，但代码实际删除的是整个会话以及该会话下的消息。

成功响应：

状态码：`200`

```json
"successfully deletedconversation-uuid"
```

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 会话不存在或不属于当前用户 | `404` | `"no such conversation"` |

### 重命名会话

`POST /api/conversations/<conversation_uuid>/rename`

请求体：

```json
{
  "new_name": "新的会话标题"
}
```

成功响应：

状态码：`200`

```json
"successfully updated conversation-uuid 's title:新的会话标题"
```

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 会话不存在或不属于当前用户 | `404` | `"no such conversation"` |

## 聊天接口

### 发送消息并获取流式回复

`POST /api/chat`

请求体：

```json
{
  "conversation_uuid": "conversation-uuid",
  "message": "你好",
  "requested_model": "model-name",
  "provider": "provider-name"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `conversation_uuid` | uuid string | 是 | 会话 UUID |
| `message` | string | 是 | 用户输入消息 |
| `requested_model` | string | 是 | 模型名称，应来自 `/api/models` |
| `provider` | string | 是 | 模型供应商，应来自 `/api/models` |

成功响应：

状态码：`200`

响应类型：`text/event-stream`

流式数据格式：

```text
data:[{"type": "text", "text": "", "phase": "final_answer", "index": 0}]

data:[{"type": "text", "text": "我们", "index": 0}]

data:[{"type": "text", "text": "之前", "index": 0}]

data:[{"type": "text", "text": "聊", "index": 0}]

data:[{"type": "text", "text": "了", "index": 0}]

data:[{"type": "text", "text": "这些", "index": 0}]

data:[{"type": "text", "text": "：\n\n", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": " ", "index": 0}]

data:[{"type": "text", "text": "你", "index": 0}]

data:[{"type": "text", "text": "问", "index": 0}]

data:[{"type": "text", "text": "我", "index": 0}]

data:[{"type": "text", "text": "“", "index": 0}]

data:[{"type": "text", "text": "你", "index": 0}]

data:[{"type": "text", "text": "是什么", "index": 0}]

data:[{"type": "text", "text": "模型", "index": 0}]

data:[{"type": "text", "text": "”，", "index": 0}]

data:[{"type": "text", "text": "我", "index": 0}]

data:[{"type": "text", "text": "回答", "index": 0}]

data:[{"type": "text", "text": "我是", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "GPT", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": "5", "index": 0}]

data:[{"type": "text", "text": ".", "index": 0}]

data:[{"type": "text", "text": "1", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": "，", "index": 0}]

data:[{"type": "text", "text": "在", "index": 0}]

data:[{"type": "text", "text": " Cod", "index": 0}]

data:[{"type": "text", "text": "ex", "index": 0}]

data:[{"type": "text", "text": " CLI", "index": 0}]

data:[{"type": "text", "text": " ", "index": 0}]

data:[{"type": "text", "text": "里", "index": 0}]

data:[{"type": "text", "text": "运行", "index": 0}]

data:[{"type": "text", "text": "。\n", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": " ", "index": 0}]

data:[{"type": "text", "text": "你", "index": 0}]

data:[{"type": "text", "text": "多", "index": 0}]

data:[{"type": "text", "text": "次", "index": 0}]

data:[{"type": "text", "text": "问", "index": 0}]

data:[{"type": "text", "text": "了", "index": 0}]

data:[{"type": "text", "text": "“", "index": 0}]

data:[{"type": "text", "text": "Fl", "index": 0}]

data:[{"type": "text", "text": "ask", "index": 0}]

data:[{"type": "text", "text": " 如何", "index": 0}]

data:[{"type": "text", "text": "返回", "index": 0}]

data:[{"type": "text", "text": " L", "index": 0}]

data:[{"type": "text", "text": "LM", "index": 0}]

data:[{"type": "text", "text": " 输出", "index": 0}]

data:[{"type": "text", "text": "的", "index": 0}]

data:[{"type": "text", "text": "流", "index": 0}]

data:[{"type": "text", "text": "式", "index": 0}]

data:[{"type": "text", "text": "响应", "index": 0}]

data:[{"type": "text", "text": "，并", "index": 0}]

data:[{"type": "text", "text": "讲", "index": 0}]

data:[{"type": "text", "text": "一下", "index": 0}]

data:[{"type": "text", "text": " Flask", "index": 0}]

data:[{"type": "text", "text": " 的", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "Response", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 类", "index": 0}]

data:[{"type": "text", "text": "”", "index": 0}]

data:[{"type": "text", "text": "。\n", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": " 我", "index": 0}]

data:[{"type": "text", "text": "解释", "index": 0}]

data:[{"type": "text", "text": "了", "index": 0}]

data:[{"type": "text", "text": " Flask", "index": 0}]

data:[{"type": "text", "text": " 流", "index": 0}]

data:[{"type": "text", "text": "式", "index": 0}]

data:[{"type": "text", "text": "响应", "index": 0}]

data:[{"type": "text", "text": "的", "index": 0}]

data:[{"type": "text", "text": "做", "index": 0}]

data:[{"type": "text", "text": "法", "index": 0}]

data:[{"type": "text", "text": "：", "index": 0}]

data:[{"type": "text", "text": "用", "index": 0}]

data:[{"type": "text", "text": "生成", "index": 0}]

data:[{"type": "text", "text": "器", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "yield", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 持", "index": 0}]

data:[{"type": "text", "text": "续", "index": 0}]

data:[{"type": "text", "text": "产", "index": 0}]

data:[{"type": "text", "text": "出", "index": 0}]

data:[{"type": "text", "text": " L", "index": 0}]

data:[{"type": "text", "text": "LM", "index": 0}]

data:[{"type": "text", "text": " 的", "index": 0}]

data:[{"type": "text", "text": " token", "index": 0}]

data:[{"type": "text", "text": "/ch", "index": 0}]

data:[{"type": "text", "text": "unk", "index": 0}]

data:[{"type": "text", "text": "，再", "index": 0}]

data:[{"type": "text", "text": "用", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "Response", "index": 0}]

data:[{"type": "text", "text": "(generator", "index": 0}]

data:[{"type": "text", "text": ",", "index": 0}]

data:[{"type": "text", "text": " mim", "index": 0}]

data:[{"type": "text", "text": "etype", "index": 0}]

data:[{"type": "text", "text": "=", "index": 0}]

data:[{"type": "text", "text": "...)", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 返回", "index": 0}]

data:[{"type": "text", "text": "。\n", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": " 我", "index": 0}]

data:[{"type": "text", "text": "提", "index": 0}]

data:[{"type": "text", "text": "到", "index": 0}]

data:[{"type": "text", "text": "普通", "index": 0}]

data:[{"type": "text", "text": "文本", "index": 0}]

data:[{"type": "text", "text": "流", "index": 0}]

data:[{"type": "text", "text": "可以", "index": 0}]

data:[{"type": "text", "text": "用", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "text", "index": 0}]

data:[{"type": "text", "text": "/plain", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": "，", "index": 0}]

data:[{"type": "text", "text": "如果", "index": 0}]

data:[{"type": "text", "text": "是", "index": 0}]

data:[{"type": "text", "text": "浏览", "index": 0}]

data:[{"type": "text", "text": "器", "index": 0}]

data:[{"type": "text", "text": "实时", "index": 0}]

data:[{"type": "text", "text": "接", "index": 0}]

data:[{"type": "text", "text": "收", "index": 0}]

data:[{"type": "text", "text": "，更", "index": 0}]

data:[{"type": "text", "text": "推荐", "index": 0}]

data:[{"type": "text", "text": " SSE", "index": 0}]

data:[{"type": "text", "text": "：", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": "text", "index": 0}]

data:[{"type": "text", "text": "/event", "index": 0}]

data:[{"type": "text", "text": "-stream", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": "。\n", "index": 0}]

data:[{"type": "text", "text": "-", "index": 0}]

data:[{"type": "text", "text": " 我", "index": 0}]

data:[{"type": "text", "text": "还", "index": 0}]

data:[{"type": "text", "text": "讲", "index": 0}]

data:[{"type": "text", "text": "了", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "stream", "index": 0}]

data:[{"type": "text", "text": "_with", "index": 0}]

data:[{"type": "text", "text": "_context", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 用", "index": 0}]

data:[{"type": "text", "text": "来", "index": 0}]

data:[{"type": "text", "text": "保", "index": 0}]

data:[{"type": "text", "text": "留", "index": 0}]

data:[{"type": "text", "text": "请求", "index": 0}]

data:[{"type": "text", "text": "上下", "index": 0}]

data:[{"type": "text", "text": "文", "index": 0}]

data:[{"type": "text", "text": "，以及", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "Response", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 类", "index": 0}]

data:[{"type": "text", "text": "用于", "index": 0}]

data:[{"type": "text", "text": "设置", "index": 0}]

data:[{"type": "text", "text": "响应", "index": 0}]

data:[{"type": "text", "text": "体", "index": 0}]

data:[{"type": "text", "text": "、", "index": 0}]

data:[{"type": "text", "text": "状态", "index": 0}]

data:[{"type": "text", "text": "码", "index": 0}]

data:[{"type": "text", "text": "、", "index": 0}]

data:[{"type": "text", "text": "headers", "index": 0}]

data:[{"type": "text", "text": "、", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": "m", "index": 0}]

data:[{"type": "text", "text": "imetype", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " /", "index": 0}]

data:[{"type": "text", "text": " `", "index": 0}]

data:[{"type": "text", "text": "content", "index": 0}]

data:[{"type": "text", "text": "_type", "index": 0}]

data:[{"type": "text", "text": "`", "index": 0}]

data:[{"type": "text", "text": " 等", "index": 0}]

data:[{"type": "text", "text": "。", "index": 0}]

data:[{"type": "text", "text": "", "id": "msg_001229577db4c48f016a3cf2076d94819ab6fc9a74d2c48cbc", "index": 0}]

data: [DONE]


```

说明：

- 每次收到 `data:` 事件，前端需要解析其中的 JSON，并将文本片段追加到当前 assistant 消息。
- 流式输出结束后，后端会把完整 assistant 回复保存到数据库。

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录 | `401` | `"Unauthorized"` |
| 会话不存在或不属于当前用户 | `404` | `"no such conversation"` |
| 模型或供应商不存在 | `404` | `"当前模型不存在，请检查模型名称和供应商名称"` |
| LLM 调用异常 | 待补充 | 待补充 |

## 模型接口

### 获取可用模型列表

`GET /api/models`

成功响应：

状态码：`200`

```json
[
  {
    "model_name": "model-name",
    "provider": "provider-name",
    "type": "openai"
  }
]
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `model_name` | string | 模型名称 |
| `provider` | string | 供应商名称 |
| `type` | string | 模型调用类型，目前代码仅处理 `openai` |

失败响应：

状态码：`401`

```json
"Unauthorized"
```

## 管理员接口

以下接口需要当前登录用户的 `privilege` 为 `admin`。

### 新增用户

`POST /api/admin/useradd`

请求体：

```json
{
  "username": "new_user",
  "password": "NewPassword123!",
  "privilege": "user"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |
| `privilege` | string | 是 | `user` 或 `admin` |

成功响应：

状态码：`200`

```json
"success!"
```

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录或非管理员 | `401` | `"Unauthorized"` |
| 用户名已存在 | `400` | `"用户名已存在"` |
| 用户名或密码为空字符串 | `400` | `"用户名或密码不能为空"` |
| `privilege` 类型错误 | `400` | `"请插入正确的用户privilege类型:admin or user"` |
| 密码强度不足 | `403` | 字符串数组，内容同修改密码接口 |

### 删除用户

`POST /api/admin/userdel`

请求体：

```json
{
  "id": 2
}
```

成功响应：

状态码：`200`

```json
"successfully deleted 2"
```

失败响应：

| 场景 | 状态码 | 响应体 |
| --- | --- | --- |
| 未登录或非管理员 | `401` | `"Unauthorized"` |
| 删除自己 | `403` | `"E:不能删除自己"` |
| 用户不存在 | `404` | 待补充 |

### 获取用户列表

`GET /api/admin/users`

成功响应：

状态码：`200`

```json
[
  {
    "id": 1,
    "name": "admin",
    "privilege": "admin",
    "created_at": "Fri, 26 Jun 2026 13:39:44 GMT",
    "updated_at": "Fri, 26 Jun 2026 13:39:44 GMT"
  }
]
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | number | 用户 ID |
| `name` | string | 用户名 |
| `privilege` | string | `user` 或 `admin` |
| `created_at` | string | 创建时间 |
| `updated_at` | string | 更新时间 |

失败响应：

状态码：`401`

```json
"Unauthorized"
```

## 前端对接建议

- 登录后先调用 `GET /api/auth/me` 判断登录态。
- 跨域开发时，前端请求需要开启 `credentials: "include"`。
- 聊天页初始化流程建议为：
  1. `GET /api/models` 获取模型列表
  2. `GET /api/conversations` 获取会话列表
  3. 没有会话时调用 `POST /api/conversations` 创建会话
  4. 进入会话后获取消息调用 `GET /api/conversations/<uuid>/messages`
  5. 发送消息时调用 `POST /api/chat` 并按 SSE 处理流式回复
- 修改用户名或密码成功后，当前登录态会被清空，前端应回到登录页。
