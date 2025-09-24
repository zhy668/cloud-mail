# 入站邮件配置指南

## 概述
本指南说明如何配置入站邮件功能，该功能接收来自 smtp2http 的邮件并通过 cloud-mail 系统进行处理。

## 配置

### 1. 环境变量配置

**重要**：对于 Cloudflare Workers 项目，环境变量需要在 Cloudflare Dashboard 中配置，而不是在代码文件中。

#### 配置步骤

1. **登录 Cloudflare Dashboard**
   - 访问 https://dash.cloudflare.com
   - 进入你的账户

2. **找到 Workers 项目**
   - 点击左侧菜单 "Workers & Pages"
   - 找到你的 `cloud-mail` 项目并点击进入

3. **配置环境变量**
   - 在项目详情页面，点击 "Settings" 标签
   - 找到 "Environment variables" 部分
   - 点击 "Add variable" 按钮

4. **添加必需的环境变量**

   **INBOUND_API_KEYS**（必需）：
   - Variable name: `INBOUND_API_KEYS`
   - Value: `your-secret-key-1,your-secret-key-2`
   - Type: 选择 "Encrypted" (敏感信息)

   **INBOUND_IP_WHITELIST**（可选）：
   - Variable name: `INBOUND_IP_WHITELIST`
   - Value: `192.168.1.100,203.0.113.10,198.51.100.5`
   - Type: 选择 "Text"
   - 说明：多个IP用逗号分隔，留空则不限制IP

5. **保存并部署**
   - 点击 "Save and deploy"
   - 系统会自动重新部署 Worker

**注意：**
- 如果不配置 IP 白名单，则允许所有 IP 访问
- 支持多个 IP 地址，用逗号分隔
- 建议配置你的 smtp2http 服务器 IP 地址

### 2. smtp2http 配置

#### 使用修改版 smtp2http
我们已经修改了 smtp2http 源码以支持 cloud-mail 的 API Key 认证。

**配置你的 smtp2http 实例**：
```
POST https://your-domain.com/api/inbound
Headers:
  Content-Type: application/json
  X-Inbound-Key: your-secret-key-1
```

#### smtp2http 命令示例
```bash
smtp2http --listen=:25 --webhook=https://your-domain.com/api/inbound --inbound-key=your-secret-key-1
```

**参数说明**：
- `--listen=:25`：监听标准 SMTP 端口 25
- `--webhook=URL`：cloud-mail 入站 API 地址
- `--inbound-key=KEY`：API 认证密钥（自动添加 X-Inbound-Key 头部）

### 3. 服务器配置

#### systemd 服务配置（推荐）
为确保 smtp2http 服务在服务器重启后自动启动，建议配置 systemd 服务：

**创建服务文件** `/etc/systemd/system/smtp2http.service`：
```ini
[Unit]
Description=SMTP to HTTP bridge for cloud-mail
After=network.target

[Service]
Type=simple
User=smtp2http
Group=smtp2http
ExecStart=/usr/local/bin/smtp2http --listen=:25 --webhook=https://your-domain.com/api/inbound --inbound-key=your-secret-key-1
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

# 安全设置
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/log

[Install]
WantedBy=multi-user.target
```

**启用服务**：
```bash
sudo systemctl daemon-reload
sudo systemctl enable smtp2http
sudo systemctl start smtp2http
sudo systemctl status smtp2http
```

## API 端点

### POST /api/inbound
接收来自 smtp2http 的邮件。

**请求头：**
- `Content-Type: application/json`
- `X-Inbound-Key: <your-api-key>`

**请求体：** smtp2http 的 EmailMessage 格式

**响应：**
```json
{
  "success": true,
  "data": {
    "emailId": 123,
    "status": "processed",
    "message": "Email received and processed successfully"
  }
}
```

### GET /api/inbound/health
用于监控的健康检查端点。

**响应：**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "cloud-mail-inbound",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## 安全特性

1. **IP 白名单验证**：只允许配置的 IP 地址访问入站 API
2. **API Key 认证**：只有使用有效 API 密钥的请求才会被处理
3. **基于角色的限制**：应用现有的用户角色限制
4. **域名验证**：遵循现有的域名权限设置
5. **禁用邮箱过滤**：应用现有的禁用邮箱规则

## 监控

检查日志中的以下信息：
- `Received inbound email request`
- `Processing inbound email: <subject> to <recipient>`
- `Successfully processed inbound email with ID: <id>`
- `Invalid inbound API key attempted`

## 故障排除

1. **403 Access denied: IP not in whitelist**：检查 IP 白名单配置
2. **401 Unauthorized**：检查 API 密钥配置
3. **400 Bad Request**：验证邮件消息格式
4. **404 Recipient not found**：检查收件人账户是否存在（如果需要）
5. **403 Forbidden**：检查角色限制和禁用邮箱规则

## 与现有功能的集成

入站邮件系统：
- ✅ 复用现有的邮件存储（D1、R2、KV）
- ✅ 应用现有的角色和权限系统
- ✅ 支持附件和嵌入文件
- ✅ 与现有的 Cloudflare Email Routing 保持兼容
- ✅ 使用现有的通知系统（Telegram、转发）
