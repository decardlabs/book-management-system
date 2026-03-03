# 图书管理系统部署说明（www.golf009.com）

本文档用于将当前项目部署到生产服务器，并通过域名 `www.golf009.com` 对外访问。

## 1. 部署目标

- 域名：`www.golf009.com`
- 建议同时支持：`golf009.com`（自动 301 跳转到 `www`）
- 部署方式：`Node.js + PM2 + Nginx + MySQL + Let's Encrypt`
- 应用监听：`127.0.0.1:3000`

## 2. 前置条件

- 一台 Linux 服务器（推荐 Ubuntu 22.04）
- 服务器公网 IP（示例：`1.2.3.4`）
- 域名 DNS 可管理权限
- 服务器已开放端口：`80`、`443`

## 3. DNS 配置

在域名解析平台添加：

- `A` 记录：`@` -> `1.2.3.4`
- `A` 记录：`www` -> `1.2.3.4`

生效后可验证：

```bash
dig +short golf009.com
dig +short www.golf009.com
```

## 4. 服务器基础环境安装

```bash
sudo apt update
sudo apt install -y nginx mysql-server git curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

验证版本：

```bash
node -v
npm -v
pm2 -v
nginx -v
mysql --version
```

## 5. 拉取项目并安装依赖

```bash
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone <你的仓库地址> book-management-system
cd book-management-system
npm ci --omit=dev
```

## 6. MySQL 初始化

登录 MySQL：

```bash
sudo mysql
```

执行 SQL（请替换强密码）：

```sql
CREATE DATABASE IF NOT EXISTS book_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'book_user'@'localhost' IDENTIFIED BY 'Strong_DB_Password_ChangeMe';
GRANT ALL PRIVILEGES ON book_management.* TO 'book_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 7. 配置应用环境变量

在项目根目录创建 `.env`：

```bash
cat > .env << 'EOF'
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=book_user
DB_PASSWORD=Strong_DB_Password_ChangeMe
DB_NAME=book_management
PORT=3000
JWT_SECRET=Please_Replace_With_A_Long_Random_String_At_Least_32_Chars
EOF
```

> 注意：`JWT_SECRET` 必须替换为高强度随机字符串。

## 8. PM2 启动应用

```bash
cd /var/www/book-management-system
pm2 start server.js --name book-management-system
pm2 save
pm2 startup
```

查看状态与日志：

```bash
pm2 status
pm2 logs book-management-system --lines 100
```

## 9. Nginx 反向代理配置

创建配置文件：

```bash
sudo tee /etc/nginx/sites-available/book-management-system > /dev/null << 'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name golf009.com;
    return 301 http://www.golf009.com$request_uri;
}

server {
    listen 80;
    listen [::]:80;
    server_name www.golf009.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

启用配置并重载：

```bash
sudo ln -sf /etc/nginx/sites-available/book-management-system /etc/nginx/sites-enabled/book-management-system
sudo nginx -t
sudo systemctl reload nginx
```

## 10. 配置 HTTPS（Let's Encrypt）

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

签发证书（包含根域和 www）：

```bash
sudo certbot --nginx -d golf009.com -d www.golf009.com
```

验证自动续期：

```bash
sudo certbot renew --dry-run
```

## 11. 验收清单

- `https://www.golf009.com` 可访问
- `http://golf009.com` 自动跳转到 `https://www.golf009.com`
- 登录接口可用：`POST /api/auth/login`
- PM2 状态为 `online`
- Nginx 配置检查通过：`nginx -t`

## 12. 常见问题排查

### 端口被占用（EADDRINUSE）

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
pkill -f "node server.js"
pm2 restart book-management-system
```

### 数据库连接失败

- 检查 `.env` 中 `DB_*` 配置
- 检查 MySQL 服务状态：

```bash
sudo systemctl status mysql
```

### Nginx 502 Bad Gateway

- 应用未启动或崩溃：

```bash
pm2 status
pm2 logs book-management-system --lines 200
```

## 13. 建议的运维命令

```bash
# 重启应用
pm2 restart book-management-system

# 查看实时日志
pm2 logs book-management-system

# 重载 Nginx
sudo systemctl reload nginx

# 更新代码后发布
cd /var/www/book-management-system
git pull
npm ci --omit=dev
pm2 restart book-management-system
```
