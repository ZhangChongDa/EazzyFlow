# 🔧 完整修复指南 - 权限问题

## ❌ 问题：即使禁用 RLS 仍然有权限错误

如果即使禁用了 RLS 仍然有权限错误，可能是：
1. RLS 策略仍然存在并阻止访问
2. 需要先删除所有策略再禁用 RLS
3. 或者 Supabase 项目配置问题

## ✅ 完整解决方案

### 步骤 1: 删除所有策略并强制禁用 RLS

在 Supabase Dashboard → SQL Editor 中执行 `supabase/force-disable-rls.sql`

这个脚本会：
1. 删除所有现有的 RLS 策略
2. 禁用所有表的 RLS
3. 验证 RLS 状态
4. 测试查询

### 步骤 2: 验证修复

执行以下 SQL 验证：

```sql
-- 检查 RLS 状态
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs');

-- 测试查询
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM products;
SELECT COUNT(*) FROM coupons;
```

### 步骤 3: 重新运行测试

```bash
npm run test:connection
```

## 🔍 如果仍然失败

### 检查 1: Supabase 项目状态

1. 进入 Supabase Dashboard
2. 检查项目是否暂停或有限制
3. 检查 Project Settings → API 设置

### 检查 2: Service Role Key

1. 进入 Project Settings → API
2. 确认 Service Role Key 是正确的
3. 确保复制的是完整的 key（应该很长，以 `eyJ` 开头）

### 检查 3: 表是否存在

在 Supabase Dashboard → Table Editor 中确认所有表都存在：
- profiles
- products
- coupons
- telecom_usage
- campaigns
- campaign_logs

### 检查 4: 直接 SQL 测试

在 Supabase Dashboard → SQL Editor 中执行：

```sql
SELECT * FROM profiles LIMIT 1;
```

如果这个查询成功，说明表和数据都存在，问题在于客户端连接。

## 🚀 替代方案：使用 REST API 直接测试

如果 Supabase 客户端有问题，可以尝试直接使用 REST API：

```bash
curl -X GET \
  "${VITE_SUPABASE_URL}/rest/v1/profiles?select=*&limit=1" \
  -H "apikey: ${VITE_SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${VITE_SUPABASE_ANON_KEY}"
```

## 📞 需要帮助？

如果以上所有步骤都无法解决问题，可能需要：
1. 检查 Supabase 项目日志
2. 联系 Supabase 支持
3. 或者创建一个新的 Supabase 项目重新开始


