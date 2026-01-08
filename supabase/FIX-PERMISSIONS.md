# 🔧 修复权限问题 - 完整指南

## 📋 问题诊断

如果遇到 `permission denied for table` 错误（错误代码 42501），请按照以下步骤操作：

## ✅ 步骤 1：检查 RLS 状态

在 Supabase Dashboard → SQL Editor 中执行：

```sql
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename;
```

**检查结果：**
- 如果 `rls_enabled = true` → RLS 已启用，需要禁用
- 如果 `rls_enabled = false` → RLS 已禁用，应该可以插入

或者直接执行：`supabase/check-rls-status.sql`

## ✅ 步骤 2：禁用 RLS（如果已启用）

在 Supabase Dashboard → SQL Editor 中执行以下 SQL：

```sql
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;
```

或者直接复制 `supabase/disable-rls-temporarily.sql` 的内容执行。

## ✅ 步骤 3：验证 RLS 已禁用

再次执行步骤 1 的检查 SQL，确认所有表的 `rls_enabled = false`。

## ✅ 步骤 4：运行种子脚本

```bash
npm run seed
```

## ✅ 步骤 5：重新启用 RLS（数据填充完成后）

在 Supabase Dashboard → SQL Editor 中执行：

```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs ENABLE ROW LEVEL SECURITY;
```

或者执行：`supabase/enable-rls.sql`

## 🔍 如果仍然失败

### 检查 Service Role Key

运行验证脚本：
```bash
npx tsx scripts/verify-key.ts
```

确保 Service Role Key：
- 格式正确（以 `eyJ` 开头）
- 长度约 219 字符
- 在 `.env` 文件中正确设置

### 检查表是否存在

在 Supabase Dashboard → Table Editor 中确认所有表都存在：
- ✅ profiles
- ✅ products
- ✅ coupons
- ✅ telecom_usage
- ✅ campaigns
- ✅ campaign_logs

### 手动测试插入

在 Supabase Dashboard → SQL Editor 中执行：

```sql
INSERT INTO products (technical_id, marketing_name, type, price)
VALUES ('TEST_123', 'Test Product', 'Data', 100);
```

如果这个插入成功，说明权限正常，问题可能在脚本配置。

## 📞 需要帮助？

如果以上步骤都无法解决问题，请检查：
1. Supabase 项目设置是否正确
2. Service Role Key 是否有效
3. 网络连接是否正常


