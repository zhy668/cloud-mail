# Cloud Mail API 文档

> 本文档说明本项目与原版的差异和新增功能

## 版本信息

- **当前版本**: v2.3
- **基于**: Cloud Mail 原版 v2.2
- **更新日期**: 2025-10-13

## 🆕 新增功能

### v2.3.0 - 用户API Token权限系统

新增用户级别的API Token功能,允许普通用户通过API管理自己的邮箱和邮件。

#### 核心特性
- ✅ 用户独立的API Token(UUID格式)
- ✅ 用户只能操作自己的数据
- ✅ 角色级别的API权限控制
- ✅ API创建邮箱次数限制(支持每天/总次数/不限制)
- ✅ 域名权限检查
- ✅ 多号模式兼容
- ✅ 不影响管理员Public Token
- ✅ Token撤销机制

#### API端点

##### 1. 生成用户API Token
```bash
POST /api/user/token/generate
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user_password"
}

# 响应
{
  "code": 200,
  "message": "success",
  "data": {
    "token": "e301b7af-90ff-4d1b-8b4f-7330a08f162f",
    "userId": 1
  }
}
```

##### 2. 撤销用户API Token
```bash
POST /api/user/token/revoke
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "user_password"
}

# 响应
{
  "code": 200,
  "message": "success"
}
```

##### 3. 查询API使用情况
```bash
GET /api/user/api/status
Authorization: <user-api-token>

# 响应
{
  "code": 200,
  "message": "success",
  "data": {
    "hasToken": true,              // 是否已生成Token
    "apiEnabled": true,            // 角色是否允许使用API
    "isAdmin": false,              // 是否是管理员
    "addAccountType": "day",       // 限制类型: ban/count/day
    "addAccountLimit": 10,         // 限制次数
    "addAccountUsed": 3,           // 已使用次数
    "addAccountRemaining": 7,      // 剩余次数 (-1表示无限制)
    "addAccountResetTime": "2025-10-14"  // 重置时间(day类型)
  }
}
```

##### 4. 查询用户邮箱列表
```bash
GET /api/user/account/list
Authorization: <user-api-token>

# 响应
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "accountId": 1,
      "email": "user@example.com",
      "userId": 1
    }
  ]
}
```

##### 5. 添加邮箱
```bash
POST /api/user/account/add
Authorization: <user-api-token>
Content-Type: application/json

{
  "email": "newmail@example.com"
}

# 响应
{
  "code": 200,
  "message": "success",
  "data": {
    "accountId": 2
  }
}
```

##### 6. 删除邮箱
```bash
DELETE /api/user/account/delete?accountId=2
Authorization: <user-api-token>

# 响应
{
  "code": 200,
  "message": "success"
}
```

##### 7. 查询邮件列表
```bash
POST /api/user/email/list
Authorization: <user-api-token>
Content-Type: application/json

{
  "toEmail": "user@example.com",
  "sendName": "sender",
  "sendEmail": "sender@example.com",
  "subject": "test",
  "content": "content",
  "timeSort": "desc",
  "type": 0,
  "isDel": 0,
  "num": 1,
  "size": 20
}

# 响应
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "emailId": 1,
      "subject": "Test Email",
      "sendEmail": "sender@example.com",
      "toEmail": "user@example.com",
      "createTime": "2025-10-13 12:00:00"
    }
  ]
}
```

#### 权限约束
1. **用户隔离**: 用户只能查询和操作自己的邮箱和邮件
2. **API权限控制**:
   - 角色级别的API权限开关(`enableApi`),关闭后用户无法生成和使用API Token
   - 管理员不受API权限限制
   - 权限检查在Token生成和验证时都会执行,确保实时生效
3. **域名权限**: 添加邮箱时检查用户角色的`availDomain`权限
4. **多号模式**: 遵守系统的`manyEmail`和`addEmail`设置
5. **账户限制**: 遵守角色的`accountCount`限制
6. **API创建邮箱次数限制**:
   - **不限制(ban)**: 无任何限制
   - **总次数(count)**: 累计创建邮箱次数限制,达到上限后无法继续创建
   - **每天(day)**: 每天重置的创建次数限制,每日0点重置计数
   - 管理员不受次数限制

#### 配置API权限

管理员可以在Web界面的"权限控制"菜单中配置每个角色的API权限:

1. **允许使用API**: 开关控制该角色的用户是否可以生成和使用API Token
2. **API创建邮箱限制**: 设置该角色用户通过API创建邮箱的次数限制
   - 选择"不限制": 用户可以无限制创建邮箱
   - 选择"总次数": 设置累计创建次数上限(如100次)
   - 选择"每天": 设置每日创建次数上限(如10次/天)

**注意事项**:
- 关闭"允许使用API"后,该角色的用户将无法生成新Token,已有Token也会立即失效
- 管理员用户不受API权限和次数限制
- 次数限制仅针对通过API创建邮箱,不影响Web界面操作

#### 使用示例
```bash
# 1. 生成Token
TOKEN=$(curl -X POST "https://your-domain.com/api/user/token/generate" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.token')

# 2. 查询邮箱列表
curl -X GET "https://your-domain.com/api/user/account/list" \
  -H "Authorization: $TOKEN"

# 3. 添加邮箱
curl -X POST "https://your-domain.com/api/user/account/add" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newmail@example.com"}'

# 4. 查询邮件
curl -X POST "https://your-domain.com/api/user/email/list" \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":0,"isDel":0,"num":1,"size":20}'

# 5. 删除邮箱
curl -X DELETE "https://your-domain.com/api/user/account/delete?accountId=2" \
  -H "Authorization: $TOKEN"

# 6. 撤销Token
curl -X POST "https://your-domain.com/api/user/token/revoke" \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'
```

#### 常见错误

| 错误信息 | 错误码 | 说明 | 解决方法 |
|---------|--------|------|---------|
| 您的角色不允许使用API | 403 | 用户角色的API权限被关闭 | 联系管理员在角色设置中开启"允许使用API" |
| 今日API创建邮箱次数已达上限 | 403 | 达到每日创建邮箱次数限制 | 等待次日0点重置,或联系管理员调整限制 |
| API创建邮箱总次数已达上限 | 403 | 达到累计创建邮箱次数限制 | 联系管理员调整限制或删除不需要的邮箱 |
| token验证失败 | 401 | Token无效、已撤销或权限被关闭 | 重新生成Token或检查角色权限 |
| 没有权限添加该域名的邮箱 | 403 | 用户角色没有该域名的权限 | 联系管理员在角色设置中添加域名权限 |

### v2.1.0

#### 1. 多管理员支持

**配置方式**:
```toml
# 单个管理员（推荐格式）
admin = "admin@example.com"

# 多个管理员（逗号分隔）
admin = "admin1@example.com,admin2@example.com,admin3@example.com"

```

#### 2. 邮箱管理Public API

新增3个API接口，支持通过Public Token管理任意用户的邮箱：

##### 2.1 添加用户邮箱
```bash
POST /api/public/addUserAccount
Authorization: <public-token>
Content-Type: application/json

{
  "userId": 123,
  "email": "user@example.com"
}
```

##### 2.2 删除用户邮箱
```bash
DELETE /api/public/deleteUserAccount?userId=123&accountId=456
Authorization: <public-token>
```

##### 2.3 查询用户邮箱列表
```bash
GET /api/public/listUserAccount?userId=123&size=20&accountId=0
Authorization: <public-token>
```

#### 3. 用户管理增强API

##### 3.1 删除用户（支持email参数）
```bash
# 通过userId删除
DELETE /api/user/delete?userId=123
Authorization: <public-token>

# 通过email删除
DELETE /api/user/delete?email=user@example.com
Authorization: <public-token>
```


##### 3.2 批量删除用户
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

**更新时间**: 2025-10-13
**版本**: v2.3
**兼容性**: 完全向后兼容原版

