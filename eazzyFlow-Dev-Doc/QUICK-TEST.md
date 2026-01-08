# ⚡ 快速测试指南

## 🚀 3 步快速测试

### 步骤 1: 检查 RLS 状态

在 Supabase Dashboard → SQL Editor 执行：

```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns');
```

**如果 `rls_enabled = true`，执行：**

```sql
-- 临时禁用 RLS
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecom_usage DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_logs DISABLE ROW LEVEL SECURITY;
```

### 步骤 2: 运行连接测试

```bash
npm run test:connection
```

**预期输出：**
```
✅ Success: Found 4 products
✅ Success: Found 7 coupons
✅ Success: Found 50 profiles
✅ Success: Found usage records
✅ Success: Found 3 campaigns
```

### 步骤 3: 启动应用并测试

```bash
npm run dev
```

然后在浏览器中：

1. **打开应用** (通常是 http://localhost:5173)
2. **打开浏览器控制台** (F12)
3. **检查是否有错误**
4. **导航到不同页面测试：**
   - Dashboard - 查看 KPI 和活动
   - Customer 360 - 查看用户列表
   - Product Catalog - 查看产品和优惠券
   - Analytics - 查看使用历史图表

## ✅ 验证清单

- [ ] 连接测试脚本通过
- [ ] 浏览器控制台没有错误
- [ ] 用户列表显示 50 个用户
- [ ] 产品列表显示 4 个产品
- [ ] 优惠券列表显示 7 个优惠券
- [ ] 活动列表显示 3 个活动
- [ ] 图表有数据展示

## 🐛 常见问题

### 问题：权限错误 (permission denied)

**解决：** 禁用 RLS（见步骤 1）

### 问题：数据不显示

**检查：**
1. 浏览器控制台错误
2. 网络请求是否成功（Network 标签）
3. RLS 是否已禁用

### 问题：连接失败

**检查：**
1. `.env` 文件中的 URL 和 Key 是否正确
2. Supabase 项目是否正常运行
3. 网络连接是否正常

