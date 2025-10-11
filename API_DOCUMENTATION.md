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

# 也支持数组格式
admin = ["admin1@example.com", "admin2@example.com"]
```

**功能说明**:
- 支持配置多个管理员邮箱
- 任何管理员都可以创建Public Token
- 所有管理员拥有相同的超级权限
- 向后兼容现有的单管理员配置

**实现细节**:
- 创建了 `admin-utils.js` 工具类统一管理员权限验证
- 更新了所有涉及管理员权限检查的服务

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

**功能**:
- 为指定用户添加新的邮箱账户
- 自动验证邮箱格式和域名权限
- 检查用户账户数量限制
- 返回创建的账户信息

#### 2.2 删除用户邮箱
```bash
DELETE /api/public/deleteUserAccount?userId=123&accountId=456
Authorization: <public-token>
```

**功能**:
- 删除指定用户的指定邮箱账户
- 验证用户和账户的关联关系
- 防止删除用户的主邮箱账户
- 逻辑删除，可恢复

#### 2.3 查询用户邮箱列表
```bash
GET /api/public/listUserAccount?userId=123&size=20&accountId=0
Authorization: <public-token>
```

**功能**:
- 查询指定用户的所有邮箱账户
- 支持分页查询
- 返回账户详细信息
- 按账户ID排序

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

**功能**:
- 支持通过userId或email查找用户
- 物理删除用户记录和相关数据
- 级联删除账户、邮件记录
- 清理KV缓存认证信息
- 安全防护：禁止删除管理员账户

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

**功能**:
- 支持通过userIds或emails批量删除
- 支持数组或逗号分隔的字符串格式
- 自动去重处理，避免重复删除
- 批量物理删除用户及相关数据
- 安全防护：禁止删除管理员账户

## 🆕 v2.2 更新内容

### 1. 最近联系人功能

**发件后保存最近联系人**:
- 发送邮件后自动保存收件人到最近联系人列表
- 最多保存500个联系人
- 使用Pinia持久化存储

**发件输入自动匹配**:
- 输入收件人时自动从最近联系人中匹配
- 显示下拉选项供快速选择
- 支持模糊匹配（前缀匹配）

**联系人管理**:
- 点击用户图标打开联系人列表
- 可以查看、选择和清除最近联系人
- 支持批量选择添加到收件人

### 2. CSS字体优化

更改了网站字体顺序，优先使用系统字体：
```css
font-family: -apple-system, Inter, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
```

这样可以：
- 在Apple设备上优先使用系统字体
- 提升中文显示效果
- 减少字体加载时间

## 🔧 与原版的主要差异

### 1. 管理员权限检查

**原版**:
```javascript
if (userRow.email !== c.env.admin) {
  // 权限检查
}
```

**本项目**:
```javascript
if (!adminUtils.isAdmin(c, userRow.email)) {
  // 权限检查
}
```

**优势**: 支持多管理员配置，更灵活

### 2. 邮件服务支持

**原版**: 仅支持Resend

**本项目**: 支持Resend和SMTP2GO双邮件服务
- 优先使用Resend
- Resend不可用时自动切换到SMTP2GO
- 配置方式相同，只需添加对应域名的token

### 3. 入站邮件支持

**新增功能**: 支持通过smtp2http接收邮件
- 详见 `INBOUND_SETUP.md`
- 支持API密钥认证
- 支持IP白名单
- 完整的角色权限控制

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

## 🛡️ 安全特性

1. **双重认证支持**: Public Token + JWT认证方式
2. **多管理员支持**: 支持配置多个管理员邮箱
3. **权限控制**: 基于角色的细粒度权限检查
4. **参数验证**: 严格的输入参数验证和类型检查
5. **管理员保护**: 禁止删除管理员账户的安全机制
6. **数据完整性**: 级联删除相关数据，避免数据孤岛

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
# 或
admin = ["admin1@example.com", "admin2@example.com"]
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

