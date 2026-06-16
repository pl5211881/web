# UX 竞品深度分析工具

一个 Vite + Express 实现的竞品调研工作台，支持产品链接抓取、产品图片上传、AI 功能画像、UX 维度选择、结构化报告生成，以及 HTML/PDF 导出。

现在的输入方式为“产品链接 + 产品图片 + AI 功能画像”。功能画像可由模型根据联网抓取页面和上传图片一键生成，包含产品定位、核心流程、目标用户、设计风格、核心功能与联网资料洞察。

## 本地运行

1. 复制 `.env.example` 为 `.env`，填写 `OPENAI_API_KEY` 与 `OPENAI_MODEL`。
2. 安装依赖：

```bash
npm install
```

3. 启动开发环境：

```bash
npm run dev
```

前端默认由 Vite 提供，API 代理到 `http://localhost:3001`。

## API

- `GET /api/health`：检查服务状态与模型配置。
- `POST /api/extract`：测试 URL 正文抓取。
- `POST /api/profile`：根据产品链接与上传图片生成产品功能画像。
- `POST /api/analyze`：生成结构化 UX 竞品分析报告。

生产构建可运行：

```bash
npm run build
npm start
```

## 无依赖预览

如果当前网络无法安装 npm 依赖，可以临时运行：

```bash
npm run dev:standalone
```

这个模式使用 Node.js 内置 HTTP 服务预览前端并提供同名 API，适合快速查看界面；正式开发仍建议使用 `npm run dev`。

## 图片能力

前端支持每个产品上传最多 9 张 JPG/PNG/WebP 图片，每张建议不超过 2MB。后端会把图片以 OpenAI 兼容 Chat Completions 的 `image_url` 内容传入模型，因此 `OPENAI_MODEL` 需要支持视觉输入；如果兼容网关不支持图片消息，请改用支持多模态的模型。

## 部署到 Vercel

本项目包含后端 API，不适合只部署到 GitHub Pages。推荐使用 Vercel：

```bash
npm install
npm run build
```

在 Vercel 导入 GitHub 仓库后，保持默认构建命令 `npm run build`，输出目录 `dist`。API 由 `api/index.js` 提供，`/api/*` 会自动转发到 Express 服务。

可在 Vercel 环境变量中配置：

```bash
OPENAI_API_KEY=
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=
```

也可以不在服务端配置 Key，使用页面内“模型配置”弹层把 Key 缓存在当前浏览器。
