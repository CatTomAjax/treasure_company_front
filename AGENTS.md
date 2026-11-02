# 创客中心前端

本仓库为前端权威源码，分支 master。用户指定本机目录 D:/project/treasure_company_front；配套后端为 D:/project/treasure_company。业务 API、数据库迁移和 Agent 执行逻辑应修改后端仓库，本仓库只保留界面、共享合同及同源 API 代理。不要将后端 .env、数据库或模型密钥放入前端。

统一控件：components/ui/app-controls.tsx 和 components/app-controls.css。保留原生表单提交、必填、禁用、受控值与重置语义。验证 npm run typecheck、npm run test:controls、npm run test:portrait、npm run test:proxy、npm run build。

双击 start.cmd 启动配套前后端。默认前端 3002、后端 3003；本机 .env 指定前端 3002、后端 3013，保留已有 3003 服务。同步维护前端 BACKEND_PORT / API_BASE_URL 与后端 PORT；不要提交 .env。
