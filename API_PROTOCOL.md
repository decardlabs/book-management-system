# 前后端数据交互协议（Book Management System）

本文档基于当前代码实现整理，作为前后端联调与接口对接规范。

- 后端入口：server.js
- API 前缀：/api
- 鉴权方式：JWT Bearer Token
- 默认数据格式：application/json

---

## 1. 通用约定

### 1.1 Base URL

- 本地开发：http://localhost:3000
- API 基础前缀：/api

示例：
- 登录接口：/api/auth/login

### 1.2 请求头

- 公共请求头：
  - Content-Type: application/json
- 需要登录的接口额外带：
  - Authorization: Bearer <token>

### 1.3 错误响应格式

后端统一错误结构（主要）：

```json
{ "error": "错误描述" }
```

部分删除/成功场景会返回：

```json
{ "message": "操作成功" }
```

### 1.4 认证与权限

- verifyToken：校验 Token 并注入 req.user
- isAdmin：仅管理员可访问

角色枚举：
- admin
- user

---

## 2. 数据结构定义

## 2.1 User（用户）

```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@library.com",
  "role": "admin",
  "created_at": "2026-03-03T12:00:00.000Z"
}
```

说明：
- 登录接口内部会查询用户 password，但不会在响应中返回 password。

## 2.2 Book（图书）

```json
{
  "id": 1,
  "isbn": "9787300000001",
  "title": "示例图书",
  "author": "作者A",
  "publisher": "出版社A",
  "publish_date": "2025-01-01",
  "category": "文学",
  "total_quantity": 10,
  "available_quantity": 8,
  "description": "图书简介",
  "created_at": "2026-03-03T12:00:00.000Z",
  "updated_at": "2026-03-03T12:00:00.000Z"
}
```

## 2.3 BorrowRecord（借阅记录）

```json
{
  "id": 1,
  "user_id": 2,
  "book_id": 1,
  "borrow_date": "2026-03-03T12:00:00.000Z",
  "due_date": "2026-04-02",
  "return_date": null,
  "status": "borrowed",
  "created_at": "2026-03-03T12:00:00.000Z",
  "user_name": "tom",
  "book_title": "示例图书",
  "book_author": "作者A",
  "isbn": "9787300000001"
}
```

状态枚举：
- borrowed
- returned
- overdue

---

## 3. 接口协议明细

## 3.1 认证模块 /api/auth

### 3.1.1 POST /api/auth/login

功能：用户登录

请求体：

```json
{
  "username": "admin",
  "password": "admin123"
}
```

成功响应 200：

```json
{
  "token": "<jwt_token>",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@library.com",
    "role": "admin"
  }
}
```

失败响应：
- 400：{ "error": "用户名和密码不能为空" }
- 401：{ "error": "用户名或密码错误" }
- 500：{ "error": "服务器错误" }

前端调用点：
- public/js/login.js

### 3.1.2 POST /api/auth/register

功能：新建用户（仅管理员）

权限：verifyToken + isAdmin

请求头：Authorization: Bearer <token>

请求体：

```json
{
  "username": "newuser",
  "password": "123456",
  "email": "newuser@test.com",
  "role": "user"
}
```

成功响应 201：

```json
{
  "id": 2,
  "username": "newuser",
  "email": "newuser@test.com",
  "role": "user"
}
```

失败响应：
- 400：{ "error": "用户名和密码不能为空" }
- 400：{ "error": "用户名已存在" }
- 401：{ "error": "未提供认证令牌" } / { "error": "无效的认证令牌" }
- 403：{ "error": "需要管理员权限" }
- 500：{ "error": "注册失败" }

前端调用点：
- public/js/app.js（添加用户弹窗）

### 3.1.3 GET /api/auth/me

功能：获取当前登录用户

权限：verifyToken

成功响应 200：User 对象

---

## 3.2 图书模块 /api/books

### 3.2.1 GET /api/books

功能：获取图书列表（支持筛选）

查询参数：
- search：模糊匹配 title/author/isbn
- category：分类精确匹配
- status：available | borrowed

成功响应 200：Book[]

### 3.2.2 GET /api/books/stats/category

功能：分类统计（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
[
  {
    "category": "文学",
    "count": 12,
    "total_books": 40,
    "available_books": 21
  }
]
```

### 3.2.3 GET /api/books/:id

功能：按 ID 获取图书

成功响应 200：Book

失败响应：
- 404：{ "error": "图书不存在" }

### 3.2.4 POST /api/books

功能：新增图书（管理员）

权限：verifyToken + isAdmin

请求体：

```json
{
  "isbn": "9787300000001",
  "title": "示例图书",
  "author": "作者A",
  "publisher": "出版社A",
  "publish_date": "2025-01-01",
  "category": "文学",
  "total_quantity": 10,
  "description": "图书简介"
}
```

成功响应 201：Book

失败响应：
- 400：{ "error": "ISBN、标题和作者不能为空" }
- 400：{ "error": "ISBN已存在" }

### 3.2.5 PUT /api/books/:id

功能：更新图书（管理员）

权限：verifyToken + isAdmin

请求体：同新增（除 isbn 不在更新字段内）

成功响应 200：更新后的 Book

失败响应：
- 404：{ "error": "图书不存在" }

### 3.2.6 DELETE /api/books/:id

功能：删除图书（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
{ "message": "图书删除成功" }
```

---

## 3.3 借阅模块 /api/borrows

### 3.3.1 GET /api/borrows

功能：获取全部借阅记录（管理员）

权限：verifyToken + isAdmin

查询参数：
- user_id：按用户筛选
- status：borrowed | returned | overdue
- overdue：任意非空值时，筛选逾期未还

成功响应 200：BorrowRecord[]

### 3.3.2 GET /api/borrows/my-borrows

功能：获取当前用户借阅记录

权限：verifyToken

成功响应 200：BorrowRecord[]（仅当前用户，且状态为 borrowed/overdue）

### 3.3.3 GET /api/borrows/stats

功能：借阅状态统计（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
[
  { "status": "borrowed", "count": 8 },
  { "status": "returned", "count": 20 },
  { "status": "overdue", "count": 2 }
]
```

### 3.3.4 POST /api/borrows

功能：借阅图书

权限：verifyToken

请求体：

```json
{
  "book_id": 1,
  "due_days": 30
}
```

说明：
- due_days 可选，默认 30 天。

成功响应 201：BorrowRecord

失败响应：
- 400：{ "error": "图书ID不能为空" }
- 404：{ "error": "图书不存在" }
- 400：{ "error": "图书暂无库存" }
- 400：{ "error": "您已借阅此书，请先归还后再借阅" }

### 3.3.5 PUT /api/borrows/:id/return

功能：归还图书（本人或管理员）

权限：verifyToken

成功响应 200：更新后的 BorrowRecord（status=returned）

失败响应：
- 404：{ "error": "借阅记录不存在" }
- 403：{ "error": "无权操作此借阅记录" }
- 400：{ "error": "图书已归还" }

### 3.3.6 DELETE /api/borrows/:id

功能：删除借阅记录（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
{ "message": "借阅记录删除成功" }
```

---

## 3.4 用户模块 /api/users

### 3.4.1 GET /api/users

功能：获取用户列表（管理员）

权限：verifyToken + isAdmin

成功响应 200：User[]

### 3.4.2 GET /api/users/stats

功能：用户角色统计（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
[
  { "role": "admin", "count": 1 },
  { "role": "user", "count": 12 }
]
```

### 3.4.3 GET /api/users/me

功能：获取当前用户

权限：verifyToken

成功响应 200：User

### 3.4.4 PUT /api/users/:id

功能：更新用户信息

权限：verifyToken

规则：
- 普通用户只能改自己
- 管理员可改任何人
- 普通用户提交 role 字段会被后端忽略

请求体（示例）：

```json
{
  "username": "newname",
  "email": "new@test.com",
  "role": "user"
}
```

成功响应 200：User

失败响应：
- 403：{ "error": "无权修改该用户" }
- 404：{ "error": "用户不存在" }

### 3.4.5 PUT /api/users/:id/password

功能：修改密码（仅本人）

权限：verifyToken

请求体：

```json
{
  "oldPassword": "old_pass",
  "newPassword": "new_pass"
}
```

成功响应 200：

```json
{ "message": "密码修改成功" }
```

失败响应：
- 403：{ "error": "无权修改该用户密码" }
- 400：{ "error": "旧密码和新密码不能为空" }
- 401：{ "error": "旧密码错误" }

### 3.4.6 DELETE /api/users/:id

功能：删除用户（管理员）

权限：verifyToken + isAdmin

成功响应 200：

```json
{ "message": "用户删除成功" }
```

失败响应：
- 400：{ "error": "不能删除自己" }
- 404：{ "error": "用户不存在" }

---

## 4. 前端调用协议补充

前端统一封装（public/js/app.js）：
- 自动携带 Authorization: Bearer <token>
- 非 2xx 时抛出后端 error 文本

登录页（public/js/login.js）：
- 成功后本地存储：
  - localStorage.token
  - localStorage.user（JSON 字符串）

Token 失效时：
- 受保护接口返回 401，前端应引导重新登录。

---

## 5. 联调建议

- 接口联调先跑 auth/login 获取 token，再测试受保护接口。
- 管理员权限接口务必用 admin 账号测试。
- 借阅流程建议按顺序验证：
  1) 新增图书（库存 > 0）
  2) 借阅图书
  3) 归还图书
  4) 统计接口校验状态变化

---

## 6. Postman 导入与联调顺序

### 6.1 需要导入的文件

- Collection：`postman/book-management-system.postman_collection.json`
- 本地环境：`postman/book-management-system.local.postman_environment.json`
- 生产环境：`postman/book-management-system.prod.postman_environment.json`

### 6.2 推荐使用方式

1. 在 Postman 中先导入 Collection。
2. 再导入 Environment（本地/生产都可导入）。
3. 选择当前要使用的环境：
   - 本地联调选 `Book Management - Local`
   - 线上联调选 `Book Management - Production`
4. 先执行 `Auth/Login`，Collection Test 会自动把 `token` 写入变量。
5. 再执行需要鉴权的接口（Users、Borrows、部分 Books、Register 等）。

### 6.3 推荐联调顺序（最小闭环）

1. `Auth/Login`
2. `Books/Get Books`
3. `Books/Create Book (Admin)`
4. `Borrows/Create Borrow`
5. `Borrows/Return Borrow`
6. `Borrows/Borrow Stats (Admin)`

### 6.4 变量说明

- `baseUrl`：接口域名与端口（local/prod 环境不同）
- `token`：登录后自动写入
- `bookId` / `borrowId` / `userId`：用于路径参数，可按实际数据修改

### 6.5 常见问题

- 401 Unauthorized
  - 未先执行 Login，或 token 过期/无效
  - 检查环境是否选错（例如把 prod token 用在 local）

- 403 Forbidden
  - 当前账号不是 admin，但访问了管理员接口

- 404 Not Found
  - `bookId`、`borrowId`、`userId` 变量对应记录不存在

- 500 Internal Server Error
  - 优先查看后端日志（`npm start`/`pm2 logs`）定位数据库或配置问题
