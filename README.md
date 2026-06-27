# AI Chat Flask

一个基于 Flask 的多 LLM 对话 WebUI。项目后端提供会话、认证、管理员用户管理和 LLM 流式调用接口；前端不使用 Vue/React 等框架，而是由 Flask 直接返回 HTML 页面，并将 HTML、CSS、JavaScript 分文件维护。为了让后端与前端尽量的解耦，我将所有的页面路由都放在了pages.py里面，其他文件不返回html。

## 核心技术栈

- 后端框架：Flask
- 数据库：SQLite + Flask-SQLAlchemy
- 认证方式：Flask Session Cookie
- 密码处理：Werkzeug password hash
- LLM 调用：LangChain + `langchain-openai`
- 模型接口：OpenAI 兼容接口，通过 `llm_config.json` 配置 `base_url`、`api_key`、模型名和供应商
- 前端：原生 HTML + CSS + JavaScript
- Markdown 渲染：marked
- 代码高亮：highlight.js
- 数学公式：KaTeX
- 流式输出：Server-Sent Events, SSE

## 功能亮点

- 登录认证
  - 支持用户名、密码登录。
  - 后端sqlite存储加密的用户密码而非明文
  - 登录态通过 Flask Session 维护。
  - 支持登出、修改用户名、修改密码。
  
- ChatGPT 风格聊天页
  - 左侧会话列表，按更新时间倒序展示。
  - 支持新建、切换、重命名、删除会话。
  - 支持模型选择。
  - 支持 SSE 流式输出。
  - 流式输出时可以停止生成。
  - 消息内容支持 Markdown、代码块高亮和 LaTeX 数学公式渲染。
  - 发送消息使用 `Command + Enter` 或 `Ctrl + Enter`，降低误触回车发送的概率。

- 多模型配置
  - 模型列表来自 `llm_config.json`。
  - 支持配置多个 OpenAI 兼容供应商和模型。

- 账号设置页
  - 修改用户名。
  - 修改密码。
  - 登出。
  - 管理员用户会显示进入管理员面板的入口，普通用户不显示。

- 管理员面板
  - 仅管理员可访问。
  - 查看用户列表。
  - 创建普通用户。
  - 删除单个用户。
  - 批量删除用户。
  - 禁止管理员删除自己。

- 接口文档
  - 后端接口说明见 [API.md](API.md)。

## 项目结构

```text
.
├── API.md                     # 后端接口文档
├── README.md                  # 项目说明
├── requirements.txt           # Python 依赖
├── run.py                     # 启动入口
├── llm_config.json.example    # 模型配置示例
├── app
│   ├── __init__.py            # Flask app 工厂、数据库初始化、蓝图注册
│   ├── auth.py                # 登录、登出、当前用户、修改用户名/密码
│   ├── admin.py               # 管理员用户管理接口
│   ├── routes.py              # 会话、消息、模型列表、聊天接口
│   ├── call_llms.py           # LangChain LLM 调用和 SSE 响应
│   ├── models.py              # SQLAlchemy 数据模型
│   ├── pages.py               # 前端页面路由
│   ├── templates              # HTML 页面
│   └── static                 # CSS 和 JavaScript
└── instance
    └── local.db               # SQLite 数据库，运行后生成
```

## 本地部署方法

### 1. 准备环境

建议使用 Python 3.10 或更高版本。

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Windows PowerShell 可使用：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. 配置模型

复制示例配置：

```bash
cp llm_config.json.example llm_config.json
```

然后编辑 `llm_config.json`：

```json
[
  {
    "model_name": "your-model-name",
    "base_url": "https://your-openai-compatible-endpoint",
    "api_key": "sk-your-key",
    "type": "openai",
    "provider": "sub2api"
  }
]
```

字段说明：

- `model_name`：模型名称，前端会展示并传给后端。
- `base_url`：OpenAI 兼容接口地址。
- `api_key`：接口密钥。
- `type`：当前代码支持 `openai`。
- `provider`：供应商标识，需要和前端请求一起传入。

`llm_config.json` 已加入 `.gitignore`，不要提交真实 API Key。

### 3. 启动项目

```bash
python run.py
```

默认访问地址：

```text
http://127.0.0.1:5000
```

首次运行会创建 SQLite 数据库 `instance/local.db`，并自动创建管理员用户 `admin`。

注意：当前代码中管理员初始化密码和终端提示存在不一致风险，建议首次运行后立刻检查并修改管理员密码，或直接统一 `app/__init__.py` 中的初始化逻辑。

### 4. 页面入口

- 登录页：`/login`
- 聊天页：`/chat`
- 账号设置页：`/settings`
- 管理员面板：`/admin`

未登录访问需要鉴权的页面会跳转到登录页。

## 常用接口

完整接口请看 [API.md](API.md)。常用接口包括：

- `POST /api/auth/login`：登录
- `POST /api/auth/logout`：登出
- `GET /api/auth/me`：获取当前用户
- `POST /api/auth/me/change_username`：修改用户名
- `POST /api/auth/me/change_password`：修改密码
- `GET /api/models`：获取模型列表
- `GET /api/conversations`：获取会话列表
- `POST /api/conversations`：创建会话
- `GET /api/conversations/<uuid>/messages`：获取会话消息
- `POST /api/chat`：发送消息并返回 SSE 流式响应
- `GET /api/admin/users`：管理员获取用户列表
- `POST /api/admin/useradd`：管理员创建用户
- `POST /api/admin/userdel`：管理员删除用户

## 待改进部分

- 配置管理
  - `SECRET_KEY` 当前每次启动都会重新生成，重启后已有 Session 会失效；后续应改为从环境变量读取固定密钥。
  - 管理员初始密码应统一配置来源，避免代码初始化值和终端提示不一致。
  - `llm_config.json` 可以改为数据库或后台配置页面管理。

- 安全性
  - 当前适合本地/内网演示，生产部署前需要补充 CSRF 防护、登录限流、审计日志和更严格的 Cookie 配置。
  - 管理员接口的权限检查可以进一步健壮化，例如处理 Session 中用户 ID 存在但数据库用户已删除的情况。
  - 错误响应格式目前不完全统一，前端需要做兼容处理。

- 前端资源
  - Markdown、KaTeX、highlight.js 当前通过 CDN 加载；如果演示环境不能访问公网，建议下载到本地静态目录。
  - 可继续优化移动端聊天页、代码块复制按钮、模型选择体验等细节。

- LLM 调用
  - 前端停止生成主要中断浏览器请求，后端侧还可以增加更明确的取消、超时和异常恢复机制。
  - 当前消息内容主要支持文本，文件上传、多模态输入还未实现。
  - 可以补充 token 用量统计、模型调用日志和失败重试策略。
