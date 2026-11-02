# 前海创客中心 · 前端工作台

React 19 + Vinext + shadcn/ui / Base UI。包含企业工作台、AI 企业脸谱、统一下拉框和按钮、Agent 中心、业务与财税界面。业务 API 和 MySQL 在配套后端仓库：

https://github.com/CatTomAjax/treasure_company

## 本地运行

要求 Node.js 22.18+。复制 .env.example 为 .env，设置 API_BASE_URL 为后端地址（默认 http://127.0.0.1:3003）。

```powershell
npm ci
npm run build
npm start
```

访问 http://localhost:3002/#ppt/portrait。后端默认端口为 3003，前端通过同源 /api 代理访问业务接口；登录 Cookie、文件和 AI 事件流保持兼容。前端不需要 MySQL 密码或模型密钥。

双击 `start.cmd` 或执行 `npm run start:workspace` 可启动相邻的两个仓库。前端 `.env` 使用 `FRONTEND_PORT`、`BACKEND_PORT` 配置配套端口，后端 `.env` 的 `PORT` 与之保持一致；`API_BASE_URL` 用于前端单独启动。本机后端使用 3013，前端使用 3002，避免与已有 3003 服务冲突。

## 验证

```powershell
npm run typecheck
npm run test:controls
npm run test:portrait
npm run test:proxy
```

组件预览：/ui-controls/preview；虚构企业网络演示：/enterprise-portrait/preview。所有示例均与真实业务台账分离。

源码和说明不包含运行数据库、.env、模型密钥或临时验收文件。许可证说明见 docs/licenses/app-controls.txt。
