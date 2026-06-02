# AI Try-On 项目

一个用于试穿（Try-On）功能的轻量级项目，包含 Node.js 后端、静态演示页和微信小程序原型。此文档简洁说明如何快速运行、开发与部署。

**主要特性**
- 图片上传与管理（本地 `uploads/`，可扩展到对象存储）
- 演示页面：`tryon.html`（浏览器预览）
- 微信小程序：`miniprogram/`（可在微信开发者工具中打开）
- 后端 API：位于 `server.js`，处理上传与数据接口

**仓库一览（关键文件）**
- [server.js](server.js) — 后端入口
- [tryon.html](tryon.html) — 静态演示页面
- [data/app-data.json](data/app-data.json) — 示例数据
- [uploads/](uploads/) — 上传文件目录
- [miniprogram/](miniprogram/) — 小程序代码（`utils/api.js` 为请求封装）

## 快速开始

环境要求：`Node.js`（建议 14+）、npm

1. 安装依赖（若存在 `package.json`）：

```bash
npm install
```

2. 启动后端服务器：

```bash
node server.js
```

3. 在浏览器打开 `tryon.html` 做快速预览，或在微信开发者工具中导入并运行 `miniprogram/`。

## 微信小程序开发要点
- 用微信开发者工具导入仓库根目录，`miniprogram/` 为小程序根目录。
- 如需在开发者工具中访问本地后端，可在“详情”中勾选“不校验合法域名、web-view、TLS 版本以及 HTTPS 证书”。
- 真机调试：在 `miniprogram/app.js` 中将 `baseUrl` 改为电脑局域网 IP（例如 `http://192.168.1.10:3000`），并确保手机与电脑同网且端口可访问。

引用文件：
- [miniprogram/utils/api.js](miniprogram/utils/api.js)

## API 与数据说明
- 后端路由集中在 `server.js`，用于图片上传、获取衣物/用户数据等接口。
- 示例数据：`data/app-data.json`。

建议：生产环境把文件存储切换到对象存储（OSS/S3），并在 `server.js` 中替换本地保存逻辑。

## 部署建议
- 后端：部署到 VPS 或 PaaS（Heroku、Render、Vercel Serverless），并配置域名与 HTTPS。
- 静态页面：可部署到 GitHub Pages、Netlify 等。
- 小程序：通过微信公众平台提审上线。

## 常见维护操作
- 修改端口：编辑 `server.js` 中的端口配置。
- 清理上传：删除 `uploads/` 中无用文件。

## 贡献
欢迎提交 Issues 或 Pull Requests。请在变更中包含复现步骤与相关日志。

## 许可证
仓库当前未指定许可证；公开发布前建议添加（如 MIT）。

---

## 合成示例图片（说明）
下面三张图示例说明仓库中试穿合成的不同结果：


- `top.jpg`（图 1）：单独合成上装（仅上衣）

	![上装示例](top.jpg)

- `bottom.jpg`（图 2）：单独合成下装（仅下装）

	![下装示例](bottom.jpg)

- `combined.jpg`（图 3）：上下装同时合成（上衣 + 下装）

	![合成示例](combined.jpg)

说明：仓库根目录下已存在 `top.jpg`、`bottom.jpg`、`combined.jpg`（若你想把图片移到特定目录，可将它们放到 `docs/images/` 或 `uploads/` 并相应修改路径）。

## 连接火山方舟（示例步骤）
如果你希望把合成功能调用迁移到火山方舟（或类似的 AI 服务），下面是通用接入步骤与示例：

1. 在火山方舟平台注册账号并创建应用，获取 **API Key** 与 **API Endpoint**（示例：`https://api.hsf.example.com/v1/inference`）。

2. 在本地或部署环境设置环境变量（示例变量名）：

```bash
# Linux / macOS
export HSF_API_KEY="your_api_key"
export HSF_API_URL="https://api.hsf.example.com/v1/inference"

# Windows (PowerShell)
$env:HSF_API_KEY = "your_api_key"
$env:HSF_API_URL = "https://api.hsf.example.com/v1/inference"

# Windows (cmd)
set HSF_API_KEY=your_api_key
set HSF_API_URL=https://api.hsf.example.com/v1/inference
```

3. 在 `server.js` 中将需要合成的请求转发到火山方舟。示例（使用 `axios`）：

```js
// 示例片段：在你的上传或合成路由中调用火山方舟
const axios = require('axios');

async function callHSF(payload) {
	const url = process.env.HSF_API_URL;
	const key = process.env.HSF_API_KEY;
	const res = await axios.post(url, payload, {
		headers: {
			'Authorization': `Bearer ${key}`,
			'Content-Type': 'application/json'
		}
	});
	return res.data;
}

// 在路由中：
// const result = await callHSF({ image: base64Image, mode: 'upper' });
```

4. 测试调用（curl 示例）：

```bash
curl -X POST "$HSF_API_URL" \
	-H "Authorization: Bearer $HSF_API_KEY" \
	-H "Content-Type: application/json" \
	-d '{"image":"<base64>","mode":"upper"}'
```

5. 在微信小程序端只需把图片上传到 `server.js`，由后端统一负责调用火山方舟并返回合成结果（避免小程序直接暴露 API Key）。

注意事项：
- 请根据火山方舟文档确认请求格式（如输入为二进制、Base64、还是 URL）与返回结构。
- 生产环境请使用 HTTPS 并对 API Key 做安全存储（例如使用密钥管理服务）。

---
