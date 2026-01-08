# 🔐 认证系统设置指南

## ✅ 为什么使用认证而不是禁用 RLS？

使用认证用户访问数据是**更安全和更符合生产环境最佳实践**的方案：

- ✅ **安全性**：不需要禁用 RLS，保持数据安全
- ✅ **生产就绪**：符合生产环境标准
- ✅ **权限控制**：可以为不同用户设置不同权限
- ✅ **审计追踪**：可以追踪谁访问了什么数据

## 🚀 快速设置步骤

### 步骤 1: 更新 RLS 策略

在 Supabase Dashboard → SQL Editor 中执行：

```sql
-- 执行 supabase/update-rls-for-auth.sql
```

或者手动执行：

```sql
-- 启用 RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;

-- 删除旧策略
DROP POLICY IF EXISTS "Allow public read on profiles" ON profiles;
DROP POLICY IF EXISTS "Allow public insert on profiles" ON profiles;
-- ... (删除所有旧策略)

-- 创建新策略：允许认证用户访问
CREATE POLICY "Allow authenticated users full access to profiles" ON profiles
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to products" ON products
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to coupons" ON coupons
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to telecom_usage" ON telecom_usage
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to campaigns" ON campaigns
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users full access to campaign_logs" ON campaign_logs
    FOR ALL USING (auth.role() = 'authenticated');
```

### 步骤 2: 创建测试用户

在 Supabase Dashboard → Authentication → Users 中：

1. 点击 **Add user**
2. 选择 **Create user**
3. 输入：
   - Email: `admin@eazzyflow.com`
   - Password: `admin123456`
4. 点击 **Create user**

详细步骤见：`supabase/CREATE-TEST-USER.md`

### 步骤 3: 禁用邮箱确认（可选，仅开发环境）

在 Supabase Dashboard → Authentication → Settings：

1. 找到 **Email Auth** 部分
2. 取消勾选 **Enable email confirmations**
3. 保存

### 步骤 4: 测试登录

1. **启动应用**：
   ```bash
   npm run dev
   ```

2. **打开浏览器**：http://localhost:5173

3. **登录**：
   - 使用创建的测试用户邮箱和密码
   - 或使用注册功能创建新用户

4. **验证数据访问**：
   - 登录后应该能够访问所有数据
   - 检查用户列表、产品、优惠券等是否正常显示

## 🔍 验证设置

### 检查 RLS 策略

在 Supabase Dashboard → SQL Editor 执行：

```sql
SELECT 
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;
```

**预期结果：**
- 每个表应该有策略允许 `authenticated` 角色访问
- `cmd` 应该是 `ALL` 或包含 `SELECT, INSERT, UPDATE, DELETE`

### 测试连接

```bash
npm run test:connection
```

**注意：** 测试脚本使用 Service Role Key，应该能够访问。但前端应用需要使用认证用户。

## 📝 功能说明

### 登录功能

- ✅ 用户注册（创建新账户）
- ✅ 用户登录
- ✅ 自动保存登录状态（刷新页面后保持登录）
- ✅ 登出功能
- ✅ 登录状态检查

### 数据访问

- ✅ 只有认证用户才能访问数据
- ✅ RLS 策略保护数据安全
- ✅ 无需禁用 RLS

## 🎯 使用流程

1. **首次使用**：
   - 打开应用 → 显示登录页面
   - 注册新用户或使用已有账户登录

2. **日常使用**：
   - 打开应用 → 自动检查登录状态
   - 如果已登录 → 直接进入应用
   - 如果未登录 → 显示登录页面

3. **登出**：
   - 点击侧边栏底部的"登出"按钮
   - 清除登录状态，返回登录页面

## 🔐 安全建议

### 开发环境
- 可以禁用邮箱确认以便快速测试
- 使用简单密码（仅用于开发）

### 生产环境
- ✅ 启用邮箱确认
- ✅ 使用强密码策略
- ✅ 启用双因素认证（2FA）
- ✅ 定期审查用户权限
- ✅ 监控异常登录活动

## 🐛 故障排除

### 问题：登录后仍然无法访问数据

**检查：**
1. RLS 策略是否正确配置
2. 用户是否已认证（检查浏览器控制台）
3. 策略中的角色是否正确（应该是 `authenticated`）

**解决方案：**
```sql
-- 检查当前用户角色
SELECT auth.role();

-- 验证策略
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### 问题：注册后无法登录

**检查：**
1. 是否启用了邮箱确认
2. 是否点击了确认链接
3. 或者禁用邮箱确认（开发环境）

### 问题：登录状态不持久

**检查：**
1. `supabaseClient.ts` 中的 `persistSession` 是否设置为 `true`
2. 浏览器是否允许 localStorage
3. 检查浏览器控制台是否有错误

## 📚 相关文件

- `components/Login.tsx` - 登录组件
- `services/supabaseClient.ts` - Supabase 客户端配置
- `supabase/update-rls-for-auth.sql` - RLS 策略更新脚本
- `supabase/CREATE-TEST-USER.md` - 测试用户创建指南

