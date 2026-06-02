# AI Tryon（后端 + 微信小程序）

这个仓库现在包含两部分：

- `server.js`：Express + SQLite 后端
- `miniprogram/`：微信小程序前端（可直接导入微信开发者工具）

## 1. 启动后端

```bash
npm install
npm start
```

默认地址：`http://127.0.0.1:3000`

## 2. 在微信开发者工具导入项目

1. 打开微信开发者工具，进入“小程序”页。
2. 点“导入”。
3. 项目目录选择仓库根目录：`D:\1postgraduate stage\git`
4. AppID 可先用“测试号 / touristappid”（本项目 `project.config.json` 已配置）。
5. 点击“导入项目”。

导入后，开发者工具会识别：

- `project.config.json`
- `miniprogramRoot = miniprogram/`

无需再手工改目录。

## 3. 开发者工具本地调试设置

为了让小程序访问本地后端，请在开发者工具中：

1. 打开“详情”面板。
2. 勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。

## 4. 真实手机调试时要改的地址

`miniprogram/app.js` 里默认是：

```js
baseUrl: "http://127.0.0.1:3000"
```

- 这只适用于开发者工具模拟器。
- 真机调试时改成你电脑局域网 IP，例如：`http://192.168.1.10:3000`。
- 同时保证手机和电脑在同一网络，且防火墙放行 3000 端口。

## 5. 小程序页面说明

- `pages/wardrobe/index`：衣橱列表、筛选、选中试穿、删除
- `pages/wardrobe/edit`：新增/编辑衣物（支持上传图片）
- `pages/tryon/index`：试穿清单、模特切换、穿搭建议
- `pages/profile/index`：资料与身材信息维护

## 6. 后端新增兼容接口

为了适配小程序上传行为，后端额外支持：

- `POST /api/wardrobe/:id`（更新衣物，等价于 `PUT /api/wardrobe/:id`）
- `POST /api/profile`（更新资料，等价于 `PUT /api/profile`）

这样 `wx.uploadFile` 上传时可以直接工作。
