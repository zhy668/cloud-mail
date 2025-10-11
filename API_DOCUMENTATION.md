# Cloud Mail API 文档

> 本文档说明本项目与原版的差异和新增功能

## 版本信息

- **当前版本**: v2.2
- **基于**: Cloud Mail 原版 v2.2
- **更新日期**: 2025-01-11

## 🆕 新增功能（v2.1.0）

### 1. 多管理员支持

**配置方式**:
```toml
# 单个管理员（推荐格式）
admin = "admin@example.com"

# 多个管理员（逗号分隔）
admin = "admin1@example.com,admin2@example.com,admin3@example.com"

```

### 2. 邮箱管理Public API

新增3个API接口，支持通过Public Token管理任意用户的邮箱：

#### 2.1 添加用户邮箱
```bash
POST /api/public/addUserAccount
Authorization: <public-token>
Content-Type: application/json

{
  "userId": 123,
  "email": "user@example.com"
}
```

#### 2.2 删除用户邮箱
```bash
DELETE /api/public/deleteUserAccount?userId=123&accountId=456
Authorization: <public-token>
```

#### 2.3 查询用户邮箱列表
```bash
GET /api/public/listUserAccount?userId=123&size=20&accountId=0
Authorization: <public-token>
```

### 3. 用户管理增强API

#### 3.1 删除用户（支持email参数）
```bash
# 通过userId删除
DELETE /api/user/delete?userId=123
Authorization: <public-token>

# 通过email删除
DELETE /api/user/delete?email=user@example.com
Authorization: <public-token>
```


#### 3.2 批量删除用户
```bash
DELETE /api/user/admin/batchDelete
Authorization: <public-token>
Content-Type: application/json

{
  "userIds": [1, 2, 3],
  "emails": ["user1@example.com", "user2@example.com"]
}
```

## 🔧 与原版的主要差异

### 1. 管理员权限检查

**优势**: 支持多管理员配置，更灵活

### 2. 邮件服务支持

**原版**: 仅支持Resend

**本项目**: 支持Resend和SMTP2GO双邮件服务
- 优先使用Resend
- Resend不可用时自动切换到SMTP2GO
- 配置方式相同，只需添加对应域名的token

### 3. 入站邮件支持

**新增功能**: 支持通过smtp2http接收邮件
- 支持API密钥认证
- 支持IP白名单

## 📝 使用示例

### 管理员创建Token
```bash
POST /api/public/genToken
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

### 使用Token管理用户邮箱
```bash
# 1. 为用户添加邮箱
curl -X POST "https://your-domain.com/api/public/addUserAccount" \
  -H "Authorization: your-public-token" \
  -H "Content-Type: application/json" \
  -d '{"userId": 123, "email": "newuser@example.com"}'

# 2. 查询用户邮箱
curl -X GET "https://your-domain.com/api/public/listUserAccount?userId=123" \
  -H "Authorization: your-public-token"

# 3. 删除用户邮箱
curl -X DELETE "https://your-domain.com/api/public/deleteUserAccount?userId=123&accountId=456" \
  -H "Authorization: your-public-token"
```
## 🚀 部署差异

### 环境变量配置

**原版**:
```toml
admin = "admin@example.com"
```

**本项目**:
```toml
# 支持单个或多个管理员
admin = "admin1@example.com,admin2@example.com"
```

### 入站邮件配置（新增）

需要在Cloudflare Dashboard中配置：
```
INBOUND_API_KEYS=your-secret-key-1,your-secret-key-2
INBOUND_IP_WHITELIST=192.168.1.100,203.0.113.10  # 可选
```

## ✅ 兼容性

- ✅ 向后兼容原版的单管理员配置
- ✅ 不影响现有的用户邮箱管理功能
- ✅ 保持现有API的行为不变
- ✅ 支持渐进式升级

## 📚 相关文档

- [入站邮件配置指南](INBOUND_SETUP.md)
- [原版项目](https://github.com/Mailtie/cloud-mail)
- [部署文档](https://doc.skymail.ink)

---

**更新时间**: 2025-01-11  
**版本**: v2.2  
**兼容性**: 完全向后兼容原版

