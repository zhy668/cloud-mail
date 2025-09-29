# API更新说明

## 🆕 新增功能

### 1. 多管理员支持

**配置方式**:
```toml
# 单个管理员（向后兼容）
admin = "admin@example.com"

# 多个管理员
admin = ["admin1@example.com", "admin2@example.com", "admin3@example.com"]
```

**功能说明**:
- 支持配置多个管理员邮箱
- 任何管理员都可以创建Public Token
- 所有管理员拥有相同的超级权限
- 向后兼容现有的单管理员配置

### 2. 邮箱管理Public API

新增3个API接口，支持通过Public Token管理任意用户的邮箱：

#### 2.1 添加用户邮箱
```bash
POST /public/addUserAccount
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
DELETE /public/deleteUserAccount?userId=123&accountId=456
Authorization: <public-token>
```

**功能**:
- 删除指定用户的指定邮箱账户
- 验证用户和账户的关联关系
- 防止删除用户的主邮箱账户
- 逻辑删除，可恢复

#### 2.3 查询用户邮箱列表
```bash
GET /public/listUserAccount?userId=123&size=20&accountId=0
Authorization: <public-token>
```

**功能**:
- 查询指定用户的所有邮箱账户
- 支持分页查询
- 返回账户详细信息
- 按账户ID排序

## 🔧 技术实现

### 管理员工具类
创建了 `admin-utils.js` 工具类：
- `isAdmin(c, email)` - 检查是否为管理员
- `getAdminEmails(c)` - 获取所有管理员邮箱
- `verifyAdmin(c, email)` - 验证管理员权限

### 更新的服务
- `public-service.js` - Token创建验证逻辑
- `user-service.js` - 用户权限判断逻辑  
- `account-service.js` - 邮箱管理权限检查
- `security.js` - 权限验证中间件

## 🛡️ 安全特性

1. **权限验证**: 所有新API都需要有效的Public Token
2. **参数验证**: 严格的输入参数验证和类型检查
3. **业务逻辑**: 复用现有的业务逻辑，保证数据一致性
4. **错误处理**: 完善的错误信息返回

## 📝 使用示例

### 管理员创建Token
```bash
POST /public/genToken
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

## ✅ 兼容性

- ✅ 向后兼容现有的单管理员配置
- ✅ 不影响现有的用户邮箱管理功能
- ✅ 保持现有API的行为不变
- ✅ 支持渐进式升级

## 🚀 部署说明

1. 更新配置文件中的 `admin` 字段
2. 重新部署应用
3. 现有功能无需任何修改即可继续使用
4. 新功能立即可用

---

**更新时间**: 2025-09-29  
**版本**: v2.1.0  
**兼容性**: 完全向后兼容
