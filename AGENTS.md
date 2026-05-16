# OpenFaith Community (dm)

## 项目概述

基于 Supabase + React 的社区应用，支持用户端和管理端两个入口。项目名称为 `openfaith-community`，技术项目位于 `dm` 子目录。

**重要架构说明**：应用采用统一服务器架构，所有数据存储在 server.js 的内存 Map 中，并通过 REST API 提供数据访问。数据自动持久化到 data.json 文件。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Webpack 5
- **样式**: Tailwind CSS
- **路由**: React Router v6
- **状态管理**: React Query
- **国际化**: i18next + react-i18next
- **后端**: server.js (Mock API + 内存数据存储)
- **包管理器**: pnpm
- **Node 版本**: 24

## 目录结构

```
dm/
├── src/                    # 用户端应用
│   ├── index.tsx          # 入口文件
│   ├── App.tsx            # 主应用组件
│   ├── pages/             # 页面组件
│   │   ├── BookDetail.tsx # 藏书阅读器（类微读圣经APP）
│   │   ├── Learn.tsx      # 学习页面（含藏书库层级显示）
│   │   ├── Downloads.tsx  # 我的下载（离线书籍和资源）
│   │   └── ...
│   ├── components/        # 公共组件
│   ├── contexts/          # React Context (ThemeContext)
│   ├── hooks/             # 自定义 Hooks
│   ├── i18n/              # 国际化配置
│   ├── styles/            # 全局样式
│   ├── utils/             # 工具函数
│   │   └── bookCache.ts   # 书籍缓存管理（提升加载速度和离线阅读）
│   └── supabase/
│       └── client.ts     # API 客户端（使用 server.js Mock API）
├── src/admin/             # 管理端应用
│   ├── index.tsx          # 管理端入口
│   ├── App.tsx           # 管理端主组件
│   ├── pages/            # 管理页面
│   │   ├── BookManagement.tsx    # 藏书管理
│   │   └── ReligionManagement.tsx # 百科管理
│   └── components/       # 管理端组件
├── functions/             # Supabase Edge Functions
├── migrations/            # 数据库迁移文件
├── scripts/               # Coze 平台脚本
│   ├── coze-preview-build.sh
│   ├── coze-preview-run.sh
│   ├── coze-deploy-build.sh
│   └── coze-deploy-run.sh
├── server.js              # 静态文件服务器 + Mock API (统一服务)
├── data.json              # 数据持久化文件
├── package.json
├── webpack.config.js      # Webpack 配置
├── tailwind.config.js     # Tailwind 配置
└── pnpm-lock.yaml
```

## API 架构

### 前台应用 (src/supabase/client.ts)
- 使用 fetch 调用 server.js REST API
- 数据实时从服务器获取

### 管理后台 API 调用
- **BookManagement.tsx**: 使用 adminFetch 统一 API 调用
- **ReligionManagement.tsx**: 使用 adminFetch 统一 API 调用
- 所有 API 调用自动携带认证 token

### 数据初始化
server.js 启动时初始化默认管理员账号：
- **管理员账号**: admin@example.com / admin123
- **超级管理员 ID**: 00000001

**注意**: 藏书和宗教百科数据需要通过管理后台添加，不包含默认示例数据。

## 权限系统
- `super_admin`: 超级管理员 (ID: 00000001)
- `admin`: 管理员
- `user`: 普通用户

**管理后台账号**: 869862742@qq.com / 123456

## 端口配置

| 模式 | 端口 |
|------|------|
| 用户端开发 | 3266 |
| 管理端开发 | 3267 |
| Coze 预览/部署 | 5000 |

## 运行与预览

### 安装依赖
```bash
cd dm && pnpm install
```

### 开发模式
```bash
# 用户端 (端口 3266)
pnpm dev

# 管理端 (端口 3267)
pnpm dev:admin
```

### 构建生产版本
```bash
pnpm build
pnpm build:admin
```

### Coze 平台预览（推荐）
```bash
# 自动启动 mock 服务器、构建和静态服务器
bash dm/scripts/coze-preview-build.sh
bash dm/scripts/coze-preview-run.sh
```

**构建优化**：
- 启用 webpack filesystem cache 加速二次构建
- 使用 `--prefer-offline` 跳过不必要的网络检查
- 预估时间：首次约 40 秒，后续约 15-20 秒（缓存命中）

### Coze 平台部署
```bash
# 部署构建（需要先构建用户端，再构建管理端）
pnpm build && pnpm build:admin

# 部署运行 (端口 5000)
bash dm/scripts/coze-deploy-run.sh
```

## 关键入口

- **用户端入口**: `src/index.tsx` (包裹 ThemeProvider)
- **管理端入口**: `src/admin/index.tsx` (包裹 ThemeProvider)
- **Webpack 配置**: `webpack.config.js` (通过 `--env target=admin` 切换入口)
- **静态服务器**: `server.js` (静态文件 + Mock Auth + REST API)

## 架构说明

### 统一服务器 (server.js)
`server.js` 提供了完整的 Mock API 服务：
- **Auth API**: `/auth/v1/*` 和 `/sb-api/auth/v1/*`
  - 注册: `POST /sb-api/auth/v1/signup`
  - 登录: `POST /sb-api/auth/v1/token`
  - 用户信息: `GET /sb-api/auth/v1/user`
- **REST API**: `/rest/v1/*` 和 `/sb-api/rest/v1/*`
  - profiles, notes, groups, tags 表操作
  - 支持 Supabase 风格的查询参数 (如 `id=eq.xxx`)
- **RPC**: `/rpc/*` 和 `/sb-api/rpc/*`
  - share_note, get_shared_note, set_admin 等函数
- **静态文件服务**: SPA fallback 到 index.html

### 数据存储
使用内存 Map 存储数据（自动持久化到 data.json）：
- `users`: 用户账户
- `profiles`: 用户资料
- `notes`: 笔记
- `groups`: 群组
- `tags`: 标签
- `note_shares`: 分享记录
- `books`: 藏书（支持多宗教经典）
- `chapters`: 藏书章节
- `religions`: 宗教百科

**数据持久化**: 所有数据修改会自动保存到 `data.json` 文件，重启服务器后数据不丢失。

**重要**: 前台只显示后台添加的真实数据，不包含任何虚拟/示例数据。

#### 藏书管理
- **books 表字段**: id, title, religion, category, description, status, sort_order
- **chapters 表字段**: id, book_id, number, title, content, volume, status
- **智能导入**: 支持 JSON, CSV, TXT, Markdown, HTML, XML, USX 等多种格式自动解析
- **导出功能**: 支持导出全部藏书或单本书籍（含章节）

#### 发布书籍列表
- **发布列表功能**: 藏书管理界面增加"发布列表"按钮，点击切换到发布书籍列表视图
- **发布状态控制**: 
  - 只有 status='published' 的书籍才会显示在前台
  - 后台可批量发布/取消发布书籍
  - 未发布的书籍在后台可见但前台不显示
- **批量操作**: 支持全选、排序、批量取消发布、批量删除
- **前台同步**: 前台（Learn.tsx、ReligionDetail.tsx）只获取 status=eq.published 的书籍

#### 书籍群组
- **群组发布**: 每个群组都有"发布到前台"复选框，勾选后群组作为一本书籍在前台显示
- **顶级群组显示**: 左侧群组列表只显示顶级群组（parent_id 为空），子群组不显示在列表中
- **群组内容编辑**: 选中群组后可以编辑群组内的书籍（编辑按钮、章节管理）
  - 点击"章节"按钮会切换到书籍章节视图（清除 selectedGroupId）
  - 支持添加、编辑、删除、排序章节
  - 支持导入章节（JSON、CSV、Markdown、TXT 格式）
- **子群组展开**: 选中包含子群组的群组后，可以点击"展开"按钮查看子群组内的书籍
- **book_groups 表字段**: id, name, religion, description, book_ids, group_ids, parent_id, status

#### 宗教百科
- **religions 表字段**: id, name, type, origin_place, origin_time, distribution, followers_scale, core_belief, introduction, history, doctrines, classics, festivals, rituals, taboos, sacred_sites, famous_figures, is_active
- **前台实时同步**: 前台"发现"页面的"信仰百科"和"藏书库"数据从 API 实时获取
- **默认示例数据**: 基督教、伊斯兰教、佛教、印度教、道教（共5个示例宗教）

### 书籍缓存与离线阅读

#### 缓存机制 (src/utils/bookCache.ts)
- **群组缓存**: 首次加载群组数据后缓存到 localStorage，提升后续访问速度
- **智能缓存**: 优先从本地缓存读取，减少 API 调用
- **7天过期**: 缓存默认 7 天后自动过期，确保数据新鲜

#### 我的下载页面 (src/pages/Downloads.tsx)
- **离线书籍**: 显示已下载的经典藏书，支持离线阅读
- **批量下载**: 可按群组下载整本藏书（包含所有书卷和章节）
- **笔记资源**: 显示从笔记中保存的图片和视频
- **网络状态**: 实时显示在线/离线状态

#### 阅读器优化 (src/pages/BookDetail.tsx)
- **预缓存**: 打开书籍时自动缓存群组内所有书籍和章节
- **全书搜索**: 搜索内容支持整本群组书籍（如整本圣经和合本）
- **实时搜索**: 150ms 防抖优化搜索性能
- **感悟高亮**: 在原文中高亮显示感悟内容（带下划线）

### 权限系统
- `super_admin`: 超级管理员 (ID: 00000001)
- `admin`: 管理员
- `user`: 普通用户

超级管理员可以将普通用户设置为管理员，管理员可以访问后台管理界面。
默认管理员账号: admin@example.com / admin123

### 主题系统
使用 `ThemeContext` 提供主题管理：
- 主题模式 (light/dark)
- 主题颜色 (12种颜色可选)
- 字体大小 (small/standard/large)

## 用户偏好与长期约束

1. **pnpm 优先**: 所有依赖管理必须使用 pnpm，禁止 npm 或 yarn
2. **端口固定**: Coze 平台部署端口必须为 5000
3. **环境变量**: Supabase 连接信息通过 Webpack DefinePlugin 注入
4. **多语言支持**: 应用支持多语言，默认语言文件位于 `src/i18n/locales/`
5. **主题切换**: 使用 `data-theme` 属性和 `ThemeContext`，需要 ThemeProvider 包裹
6. **API 路径**: 前端使用 `/sb-api/*` 路径访问 Mock API
7. **服务器端存储**: 使用 server.js 内存 Map + data.json 持久化

## 认证流程

### 认证架构
- **状态管理**: Zustand (useAuthStore)
- **Token 存储**: localStorage (user_token, sb_auth)
- **Session 恢复**: Supabase auth.getSession()
- **路由守卫**: RouterGuard (src/router/guard.tsx)

### 登录流程
```
用户输入账号密码
    ↓
点击登录 → authStore.login(email, password)
    ↓
Supabase signInWithPassword
    ↓
成功 → 保存 token 到 localStorage + 更新 Zustand store
    ↓
跳转到 LoadingPage (/loading?redirect=目标路径)
    ↓
LoadingPage 调用 supabase.auth.getSession()
    ↓
更新全局 store (token, userInfo, isInitialized)
    ↓
hash 路由跳转到目标页面
```

### Token 安全策略
1. **双重存储**: localStorage + Zustand store
2. **双重检查**: RouterGuard 同时检查 store.token 和 localStorage
3. **自动恢复**: LoadingPage 自动恢复 session
4. **等待初始化**: RouterGuard 等待 isInitialized 后才判断

### 公开路径 (无需登录可访问)
- `/` - 首页
- `/login` - 登录页
- `/register` - 注册页
- `/loading` - 加载中转页
- `/learn` - 学习页 (Tab)
- `/profile` - 个人页 (Tab)
- `/messages` - 消息页 (Tab)
- `/books`, `/book` - 藏书页
- `/community` - 社区页
- `/settings` - 设置页

### Tab 切换
- 使用 hash 路由 (`window.location.hash`)
- BottomNav 点击使用 `window.location.hash = path`
- RouterGuard 从 `window.location.hash` 提取路径

## 常见问题和预防

1. **依赖安装失败**: 如遇网络问题，可配置 npm registry
2. **端口占用**: 使用 `fuser -k <port>/tcp` 清理端口
3. **构建缓存**: 删除 `node_modules` 和 `dist` 后重新安装和构建
4. **API 请求失败**: 确保 server.js 正常运行在 5000 端口
5. **主题不生效**: 确保 App 被 ThemeProvider 包裹
6. **Coze 预览白屏**: 确保 server.js 正常运行在 5000 端口
7. **登录后 Tab 跳回首页**: 检查 RouterGuard 的 token 判断逻辑
8. **藏书页面显示"书籍不存在"**: api.ts 已配置为使用相对路径 `/sb-api/rest/v1`，开发环境 webpack 代理会转发到 localhost:5000
