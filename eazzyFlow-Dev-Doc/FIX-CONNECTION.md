# 🔧 修复连接问题 - 权限错误解决方案

## ❌ 问题：permission denied for table

如果看到所有表都返回权限错误，说明 RLS (Row Level Security) 已启用并阻止了访问。

## ✅ 快速解决方案

### 方法 1: 在 Supabase Dashboard 中禁用 RLS（推荐用于开发）

1. **打开 Supabase Dashboard**
   - 访问 https://app.supabase.com/
   - 选择您的项目

2. **进入 SQL Editor**
   - 点击左侧菜单的 **SQL Editor**

3. **执行以下 SQL：**

```sql
-- 禁用所有表的 RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;
```

4. **验证 RLS 已禁用：**

```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;
```

**预期结果：** 所有表的 `rls_enabled` 应该显示 `false`

5. **重新运行测试：**

```bash
npm run test:connection
```

### 方法 2: 使用提供的 SQL 脚本

直接执行 `supabase/fix-rls-permissions.sql` 文件中的所有 SQL。

## 🔍 验证修复

运行测试脚本：

```bash
npm run test:connection
```

**成功输出示例：**
```
📦 Test 1: Fetching Products...
  ✅ Success: Found 4 products

🎫 Test 2: Fetching Coupons...
  ✅ Success: Found 7 coupons

👥 Test 3: Fetching Profiles...
  ✅ Success: Found 50 profiles

📊 Test 4: Fetching Usage History...
  ✅ Success: Found usage records

🎯 Test 5: Fetching Campaigns...
  ✅ Success: Found 3 campaigns
```

## 🚀 测试前端应用

修复权限后，启动应用：

```bash
npm run dev
```

然后在浏览器中：
1. 打开应用（通常是 http://localhost:5173）
2. 打开浏览器控制台（F12）
3. 检查是否有错误
4. 导航到不同页面测试数据

## 📝 注意事项

- **开发环境：** 可以禁用 RLS 以便于开发和测试
- **生产环境：** 应该启用 RLS 并配置适当的策略
- **数据安全：** RLS 禁用后，所有数据都可以通过 Anon Key 访问

## 🔐 生产环境建议

如果要在生产环境中使用，应该：
1. 启用 RLS
2. 配置适当的策略（仅允许认证用户访问）
3. 使用 Service Role Key 进行服务器端操作
4. 限制 Anon Key 的权限

