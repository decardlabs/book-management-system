# 图书管理系统 - Ubuntu 服务器部署文档

> 本文档详细说明如何在 Ubuntu 服务器上部署图书管理系统。

## 目录

- [系统要求](#系统要求)
- [一、服务器基础配置](#一服务器基础配置)
- [二、安装 Node.js](#二安装-nodejs)
- [三、安装 MySQL 数据库](#三安装-mysql-数据库)
- [四、部署应用](#四部署应用)
- [五、配置 PM2 进程管理](#五配置-pm2-进程管理)
- [六、配置 Nginx 反向代理](#六配置-nginx-反向代理)
- [七、配置防火墙](#七配置防火墙)
- [八、SSL/HTTPS 配置](#八sslhttps-配置)
- [九、常见问题排查](#九常见问题排查)

---

## 系统要求

- **操作系统**: Ubuntu 20.04 / 22.04 / 24.04 LTS
- **内存**: 最低 1GB，推荐 2GB+
- **磁盘**: 最低 10GB
- **权限**: sudo 权限

---

## 一、服务器基础配置

### 1.1 更新系统包

```bash
# 更新软件包列表
sudo apt update

# 升级已安装的软件包
sudo apt upgrade -y
```

### 1.2 设置时区（可选）

```bash
# 设置为上海时区
sudo timedatectl set-timezone Asia/Shanghai

# 查看时区
timedatectl
```

### 1.3 创建部署用户（可选，推荐）

```bash
# 创建用户
sudo adduser bookadmin

# 将用户添加到 sudo 组
sudo usermod -aG sudo bookadmin

# 切换到新用户
su - bookadmin
```

---

## 二、安装 Node.js

### 2.1 使用 NodeSource 仓库安装 Node.js 18 LTS

```bash
# 安装必要的依赖
sudo apt install -y curl

# 下载并运行 NodeSource 安装脚本
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# 安装 Node.js
sudo apt install -y nodejs

# 验证安装
node --version
npm --version
```

### 2.2 配置 npm 使用淘宝镜像（国内服务器推荐）

```bash
npm config set registry https://registry.npmmirror.com
npm config get registry
```

---

## 三、安装 MySQL 数据库

### 3.1 安装 MySQL Server

```bash
# 安装 MySQL
sudo apt install -y mysql-server

# 启动 MySQL 服务
sudo systemctl start mysql

# 设置 MySQL 开机自启
sudo systemctl enable mysql

# 检查 MySQL 状态
sudo systemctl status mysql
```

### 3.2 安全配置 MySQL

```bash
# 运行安全配置脚本
sudo mysql_secure_installation

# 按提示进行配置：
# 1. 是否设置密码验证策略？选择 Y
# 2. 选择密码强度等级（推荐：1 - Medium）
# 3. 设置 root 密码（请记住此密码）
# 4. 删除匿名用户？选择 Y
# 5. 禁止 root 远程登录？选择 Y
# 6. 删除 test 数据库？选择 Y
# 7. 重新加载权限表？选择 Y
```

### 3.3 创建项目数据库和用户

```bash
# 登录 MySQL
sudo mysql -u root -p

# 进入 MySQL 命令行后，执行以下 SQL：
```

```sql
-- 创建数据库（项目会自动创建，这里可手动创建验证）
CREATE DATABASE IF NOT EXISTS book_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建专用数据库用户
CREATE USER 'bookuser'@'localhost' IDENTIFIED BY 'YourStrongPassword123!';

-- 授予权限
GRANT ALL PRIVILEGES ON book_management.* TO 'bookuser'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

---

## 四、部署应用

### 4.1 上传项目文件

将项目文件上传到服务器，推荐使用以下方式之一：

**方式一：使用 scp 上传（本地执行）**

```bash
scp -r /path/to/book-management-system bookadmin@your-server-ip:/home/bookadmin/
```

**方式二：使用 git 克隆（推荐）**

```bash
cd /home/bookadmin
git clone <your-repository-url> book-management-system
cd book-management-system
```

**方式三：使用 SFTP 工具（如 FileZilla）**

---

### 4.2 安装项目依赖

```bash
cd /home/bookadmin/book-management-system

# 安装依赖
npm install --production
```

### 4.3 配置环境变量

```bash
# 编辑 .env 文件
nano .env
```

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=bookuser
DB_PASSWORD=YourStrongPassword123!
DB_NAME=book_management

# 服务器配置
PORT=3000

# JWT 密钥（请使用强随机字符串）
JWT_SECRET=$(openssl rand -hex 32)
```

### 4.4 测试启动

```bash
# 测试启动
npm start

# 看到 "图书管理系统运行在 http://localhost:3000" 表示启动成功
# 按 Ctrl+C 停止
```

---

## 五、配置 PM2 进程管理

PM2 是 Node.js 应用的进程管理器，可以实现自动重启、日志管理等。

### 5.1 全局安装 PM2

```bash
npm install -g pm2
```

### 5.2 启动应用

```bash
cd /home/bookadmin/book-management-system

# 使用 PM2 启动
pm2 start server.js --name book-management

# 查看运行状态
pm2 status

# 查看日志
pm2 logs book-management
```

### 5.3 配置 PM2 开机自启

```bash
# 生成启动脚本
pm2 startup

# 按照提示执行输出的命令

# 保存当前 PM2 进程列表
pm2 save
```

### 5.4 PM2 常用命令

```bash
# 重启应用
pm2 restart book-management

# 停止应用
pm2 stop book-management

# 查看详细信息
pm2 show book-management

# 监控资源使用
pm2 monit

# 查看日志
pm2 logs book-management --lines 100

# 清空日志
pm2 flush
```

---

## 六、配置 Nginx 反向代理

使用 Nginx 可以提高性能、安全性，并支持 HTTPS。

### 6.1 安装 Nginx

```bash
sudo apt install -y nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

### 6.2 配置 Nginx

```bash
# 创建站点配置文件
sudo nano /etc/nginx/sites-available/book-management
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名或服务器IP

    # 日志配置
    access_log /var/log/nginx/book-management-access.log;
    error_log /var/log/nginx/book-management-error.log;

    # 前端静态文件
    location / {
        root /home/bookadmin/book-management-system/public;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        root /home/bookadmin/book-management-system/public;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.3 启用站点配置

```bash
# 创建软链接
sudo ln -s /etc/nginx/sites-available/book-management /etc/nginx/sites-enabled/

# 测试配置语法
sudo nginx -t

# 重载 Nginx
sudo systemctl reload nginx
```

### 6.4 删除默认站点（可选）

```bash
sudo rm /etc/nginx/sites-enabled/default
sudo systemctl reload nginx
```

---

## 七、配置防火墙

### 7.1 使用 UFW 配置防火墙

```bash
# 安装 UFW（如果未安装）
sudo apt install -y ufw

# 允许 SSH（重要！防止无法连接）
sudo ufw allow 22/tcp

# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS（如果配置了 SSL）
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 7.2 限制 MySQL 远程访问（安全建议）

```bash
# 编辑 MySQL 配置
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf

# 确保 bind-address 设置为：
bind-address = 127.0.0.1

# 重启 MySQL
sudo systemctl restart mysql
```

---

## 八、SSL/HTTPS 配置

使用 Let's Encrypt 免费证书配置 HTTPS。

### 8.1 安装 Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 8.2 申请 SSL 证书

```bash
# 自动配置 Nginx
sudo certbot --nginx -d your-domain.com

# 按提示输入邮箱，同意服务条款
```

### 8.3 更新 Nginx 配置（如果手动配置）

Certbot 会自动更新 Nginx 配置。如果需要手动配置，修改站点配置：

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # ... 其他配置保持不变 ...
}

# HTTP 自动跳转 HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}
```

### 8.4 自动续期证书

```bash
# 测试续期
sudo certbot renew --dry-run

# Certbot 会自动配置定时任务进行续期
```

---

## 九、常见问题排查

### 9.1 应用无法启动

```bash
# 检查 PM2 日志
pm2 logs book-management --lines 50

# 检查数据库连接
mysql -u bookuser -p -h localhost book_management
```

### 9.2 数据库连接失败

```bash
# 检查 MySQL 状态
sudo systemctl status mysql

# 检查 MySQL 监听端口
sudo netstat -tlnp | grep 3306

# 检查防火墙
sudo ufw status
```

### 9.3 Nginx 502 Bad Gateway

```bash
# 检查 Nginx 错误日志
sudo tail -50 /var/log/nginx/error.log

# 检查应用是否运行
pm2 status

# 检查端口占用
sudo netstat -tlnp | grep 3000
```

### 9.4 端口已被占用

```bash
# 查找占用端口的进程
sudo lsof -i :3000

# 终止进程
sudo kill -9 <PID>
```

### 9.5 权限问题

```bash
# 确保文件权限正确
sudo chown -R bookadmin:bookadmin /home/bookadmin/book-management-system
chmod -R 755 /home/bookadmin/book-management-system/public
```

---

## 附录

### A. 目录结构

```
/home/bookadmin/book-management-system/
├── config/          # 配置文件
│   └── db.js
├── middleware/      # 中间件
│   └── auth.js
├── models/         # 数据模型
│   ├── Book.js
│   ├── BorrowRecord.js
│   └── User.js
├── public/         # 前端文件
│   ├── css/
│   ├── js/
│   ├── index.html
│   └── dashboard.html
├── routes/         # API 路由
│   ├── auth.js
│   ├── books.js
│   ├── borrows.js
│   └── users.js
├── .env            # 环境变量（需手动创建）
├── package.json
├── package-lock.json
└── server.js       # 入口文件
```

### B. 默认管理员账户

- **用户名**: `admin`
- **密码**: `admin123`
- **首次登录后请立即修改密码！**

### C. 常用端口说明

| 服务 | 默认端口 | 说明 |
|------|----------|------|
| HTTP | 80 | Web 访问 |
| HTTPS | 443 | 安全 Web 访问 |
| 应用服务 | 3000 | Node.js 应用（内网） |
| MySQL | 3306 | 数据库（仅内网） |
| SSH | 22 | 远程登录 |

### D. 参考文档

- [Node.js 官方文档](https://nodejs.org/)
- [Express.js 官方文档](https://expressjs.com/)
- [MySQL 官方文档](https://dev.mysql.com/doc/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [PM2 官方文档](https://pm2.keymetrics.io/)

---

**文档版本**: v1.0
**最后更新**: 2026-03-04
**维护者**: Your Name
