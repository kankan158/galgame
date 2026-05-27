# AI Tryon — 后端 (Express + SQLite)

快速说明：本项目提供最小可运行的本地后端，用于 `ai-tryon` 前端 demo。支持衣橱 CRUD、profile 与身形信息，并通过 `multipart/form-data` 上传图片，保存到 `uploads/` 并在 DB 中保存路径。

安装与启动

```bash
npm install
npm start
```

默认服务地址：`http://localhost:3000`

重要目录

- `uploads/`：上传的图片文件（可通过 `/uploads/<filename>` 访问）
- `data/ai-tryon.db`：SQLite 数据库文件

常用 API 示例

- 获取衣橱列表：GET `/api/wardrobe`
- 新增衣物（文件字段名 `image`）：

```
curl -X POST -F "name=My Shirt" -F "category=top" -F "note=Nice" -F "image=@/path/to/file.jpg" http://localhost:3000/api/wardrobe
```

- 编辑衣物（可替换图片）：PUT `/api/wardrobe/:id`，表单字段同上。
- 删除衣物：DELETE `/api/wardrobe/:id`

- 获取/更新 profile：GET `/api/profile` / PUT `/api/profile`（可上传 avatar, 字段名 `avatar`）
- 获取/更新 身形：GET `/api/bodyinfo` / PUT `/api/bodyinfo`（JSON body: `height`, `weight`, `shape`）

下一步建议

- 在前端 `ai-tryon.html` 中实现对这些接口的调用，并在网络不可用时回退到 `localStorage`。
