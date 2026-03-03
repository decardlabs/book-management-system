# 图书管理系统

一个基于 Node.js + Express + MySQL 的完整图书管理系统，支持图书管理、借阅管理和用户管理。

## 功能特性

- **用户认证**：基于 JWT 的登录注册功能
- **角色权限**：管理员和普通用户两种角色，权限分离
- **图书管理**：图书的增删改查，支持分类、搜索、筛选
- **借阅管理**：图书借阅、归还、逾期提醒
- **用户管理**：管理员可管理所有用户
- **数据统计**：系统概览统计

## 项目结构

```
book-management-system/
├── config/
│   └── db.js              # 数据库配置
├── middleware/
│   └── auth.js            # 认证中间件
├── models/
│   ├── Book.js            # 图书数据模型
│   ├── User.js            # 用户数据模型
│   └── BorrowRecord.js    # 借阅记录模型
├── routes/
│   ├── auth.js            # 认证路由
│   ├── books.js           # 图书路由
│   ├── users.js           # 用户路由
│   └── borrows.js         # 借阅路由
├── public/
│   ├── css/
│   │   └── style.css      # 样式文件
│   ├── js/
│   │   ├── login.js       # 登录脚本
│   │   └── app.js         # 主应用脚本
│   ├── index.html         # 登录页面
│   └── dashboard.html     # 管理面板
├── server.js              # 服务器入口
├── package.json           # 项目依赖
└── README.md              # 项目说明
```

## 环境要求

- Node.js 14+
- MySQL 5.7+

## 安装步骤

### 1. 安装依赖

```bash
cd book-management-system
npm install
```

### 2. 配置 MySQL（推荐使用 `.env`）

```bash
cp .env.example .env
```

然后在 `.env` 中填写你的 MySQL 信息。

示例：

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=book_management
PORT=3000
JWT_SECRET=replace_with_a_strong_secret
```

### 3. 启动服务

```bash
npm start
```

服务将运行在 http://localhost:3000

如果 MySQL 开启了密码认证，建议使用环境变量启动：

```bash
DB_HOST=localhost DB_PORT=3306 DB_USER=root DB_PASSWORD=你的密码 DB_NAME=book_management npm start
```

使用 `.env` 后可直接：

```bash
npm start
```

## 生产部署（PM2 + Nginx）

### 1. 服务器准备

- 安装 Node.js LTS（建议 20+）
- 安装 MySQL 5.7+ / 8.0+
- 安装 Nginx

### 2. 拉取代码并安装依赖

```bash
npm ci --omit=dev
```

### 3. 配置环境变量

在项目根目录创建 `.env`，至少包含：

```dotenv
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=book_user
DB_PASSWORD=strong_db_password
DB_NAME=book_management
PORT=3000
JWT_SECRET=strong_random_secret
```

### 4. 使用 PM2 启动

```bash
npm install -g pm2
pm2 start server.js --name book-management-system
pm2 save
pm2 startup
```

### 5. 配置 Nginx 反向代理

示例（`/etc/nginx/conf.d/book-management.conf`）：

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

重载 Nginx：

```bash
nginx -t && sudo systemctl reload nginx
```

### 6. 配置 HTTPS（推荐）

使用 Certbot 为域名签发证书，并在 Nginx 中启用 TLS。

## 安全建议

- 生产环境必须设置强随机 `JWT_SECRET`
- 不要使用默认管理员密码，首次登录后立即修改
- 将 MySQL 仅监听内网地址，限制数据库账号权限

## 默认账号

| 用户名 | 密码 | 角色 |
|--------|------|------|
| admin  | admin123 | 管理员 |

## API 接口

### 认证接口

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 注册用户（仅管理员）
- `GET /api/auth/me` - 获取当前用户信息

### 图书接口

- `GET /api/books` - 获取图书列表
- `GET /api/books/:id` - 获取单本图书
- `POST /api/books` - 添加图书（仅管理员）
- `PUT /api/books/:id` - 更新图书（仅管理员）
- `DELETE /api/books/:id` - 删除图书（仅管理员）

### 借阅接口

- `GET /api/borrows` - 获取所有借阅记录（仅管理员）
- `GET /api/borrows/my-borrows` - 获取当前用户借阅记录
- `GET /api/borrows/stats` - 获取借阅统计（仅管理员）
- `POST /api/borrows` - 借阅图书
- `PUT /api/borrows/:id/return` - 归还图书
- `DELETE /api/borrows/:id` - 删除借阅记录（仅管理员）

### 用户接口

- `GET /api/users` - 获取用户列表（仅管理员）
- `GET /api/users/me` - 获取当前用户信息
- `PUT /api/users/:id` - 更新用户信息
- `DELETE /api/users/:id` - 删除用户（仅管理员）

## 使用说明

### 管理员功能
- 查看系统统计
- 添加/编辑/删除图书
- 查看所有借阅记录
- 添加/删除用户

### 普通用户功能
- 浏览和搜索图书
- 借阅可借阅的图书
- 归还已借阅的图书
- 查看自己的借阅记录

## 技术栈

- **后端**：Node.js + Express
- **数据库**：MySQL
- **前端**：HTML5 + CSS3 + JavaScript (ES6+)
- **认证**：JWT (jsonwebtoken)
- **加密**：bcryptjs

## 开发说明

使用 nodemon 进行开发：

```bash
npm run dev
```
