# 入站邮件配置指南

## 概述
本指南说明如何配置入站邮件功能，该功能接收来自 smtp2http 的邮件并通过 cloud-mail 系统进行处理。

## 配置

### 1. API Key 设置
配置用于验证 smtp2http 请求的 API 密钥：

**环境变量配置**
```bash
# 在 wrangler.toml [vars] 部分添加
INBOUND_API_KEYS = "your-secret-key-1,your-secret-key-2"
```

### 2. smtp2http 配置
配置你的 smtp2http 实例发送邮件到：
```
POST https://your-domain.com/api/inbound
Headers:
  Content-Type: application/json
  X-Inbound-Key: your-secret-key-1
```

### 3. smtp2http 命令示例
```bash
smtp2http --listen=:25 --webhook=https://your-domain.com/api/inbound --webhook-header="X-Inbound-Key: your-secret-key-1"
```

注意：你可能需要修改 smtp2http 源码来添加自定义头部，因为原版本不支持自定义头部。

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

1. **API Key 认证**：只有使用有效 API 密钥的请求才会被处理
2. **基于角色的限制**：应用现有的用户角色限制
3. **域名验证**：遵循现有的域名权限设置
4. **禁用邮箱过滤**：应用现有的禁用邮箱规则

## 监控

检查日志中的以下信息：
- `Received inbound email request`
- `Processing inbound email: <subject> to <recipient>`
- `Successfully processed inbound email with ID: <id>`
- `Invalid inbound API key attempted`

## 故障排除

1. **401 Unauthorized**：检查 API 密钥配置
2. **400 Bad Request**：验证邮件消息格式
3. **404 Recipient not found**：检查收件人账户是否存在（如果需要）
4. **403 Forbidden**：检查角色限制和禁用邮箱规则

## 与现有功能的集成

入站邮件系统：
- ✅ 复用现有的邮件存储（D1、R2、KV）
- ✅ 应用现有的角色和权限系统
- ✅ 支持附件和嵌入文件
- ✅ 与现有的 Cloudflare Email Routing 保持兼容
- ✅ 使用现有的通知系统（Telegram、转发）
