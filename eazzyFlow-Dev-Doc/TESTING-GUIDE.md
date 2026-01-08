# 🧪 数据连接测试指南

## 📋 测试前准备

### 1. 确认环境变量

确保 `.env` 文件包含正确的 Supabase 配置：

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### 2. 检查 RLS 状态（重要！）

如果遇到权限错误，需要确保 RLS 已禁用或策略正确配置。

**检查 RLS 状态：**
在 Supabase Dashboard → SQL Editor 执行：
```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns');
```

**如果 RLS 已启用，需要禁用（开发环境）：**
执行 `supabase/disable-rls-temporarily.sql`

### 3. 运行连接测试脚本

```bash
npm run test:connection
```

这个脚本会测试所有表的连接和数据访问。

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 打开浏览器控制台

按 `F12` 或 `Cmd+Option+I` (Mac) 打开开发者工具，切换到 **Console** 标签页。

## 🔍 测试步骤

### 测试 1: 查看用户列表

**步骤：**
1. 打开应用首页
2. 导航到 **Customer 360** 或 **Audience Studio**
3. 查看用户列表是否显示 50 个用户

**预期结果：**
- 应该看到 50 个用户记录
- 每个用户显示：姓名、电话号码、层级、ARPU 等信息

**验证方法：**
在浏览器控制台执行：
```javascript
// 测试获取用户数据
fetch('/api/test-profiles').catch(() => {
  // 如果 API 不存在，直接在控制台测试
  console.log('Testing Supabase connection...');
});
```

或者直接在控制台查看网络请求：
- 打开 **Network** 标签
- 筛选 `supabase` 请求
- 查看是否有成功的 API 调用

### 测试 2: 查看使用历史图表

**步骤：**
1. 导航到 **Analytics** 或 **Customer Profile Overview**
2. 查看使用历史图表

**预期结果：**
- 图表显示过去 30 天的数据使用趋势
- 可以看到 Data、Voice、SMS 三种类型的使用量
- 周末（周五、周六）应该有数据使用高峰

**验证方法：**
在浏览器控制台执行：
```javascript
// 检查是否有使用历史数据
// 这需要在实际组件中查看
```

### 测试 3: 查看产品和优惠券

**步骤：**
1. 导航到 **Product Catalog**
2. 查看产品列表和优惠券列表

**预期结果：**
- 产品列表显示 4 个产品
- 优惠券列表显示 7 个优惠券
- 所有数据来自 Supabase 数据库

**验证方法：**
在浏览器控制台查看：
```javascript
// 检查数据服务
import { dataService } from './services/dataService';
dataService.getProducts().then(products => console.log('Products:', products));
dataService.getCoupons().then(coupons => console.log('Coupons:', coupons));
```

### 测试 4: 查看营销活动

**步骤：**
1. 导航到 **Campaign Canvas** 或 **Dashboard**
2. 查看活动列表

**预期结果：**
- 显示 3 个营销活动
- 每个活动显示状态、渠道、触达人数、转化率等信息

**验证方法：**
在 Supabase Dashboard → Table Editor 中直接查看 `campaigns` 表。

## 🛠️ 手动测试 SQL 查询

在 Supabase Dashboard → SQL Editor 中执行以下查询来验证数据：

### 查询 1: 检查用户数据
```sql
SELECT 
    COUNT(*) as total_users,
    tier,
    COUNT(*) as count_by_tier
FROM profiles
GROUP BY tier
ORDER BY 
    CASE tier
        WHEN 'Crown' THEN 1
        WHEN 'Diamond' THEN 2
        WHEN 'Platinum' THEN 3
        WHEN 'Gold' THEN 4
        WHEN 'Silver' THEN 5
    END;
```

**预期结果：**
- total_users: 50
- 按层级分布：Crown: 5, Diamond: 10, Platinum: 15, Gold: 15, Silver: 5

### 查询 2: 检查使用历史数据
```sql
SELECT 
    type,
    COUNT(*) as record_count,
    SUM(amount) as total_amount,
    AVG(amount) as avg_amount
FROM telecom_usage
GROUP BY type;
```

**预期结果：**
- 三种类型：Data, Voice, SMS
- 每种类型应该有大量记录（约 1,500-1,800 条）

### 查询 3: 检查产品和优惠券
```sql
SELECT 'Products' as type, COUNT(*) as count FROM products
UNION ALL
SELECT 'Coupons', COUNT(*) FROM coupons
UNION ALL
SELECT 'Campaigns', COUNT(*) FROM campaigns;
```

**预期结果：**
- Products: 4
- Coupons: 7
- Campaigns: 3

## 🐛 故障排除

### 问题 1: 数据不显示

**检查：**
1. 浏览器控制台是否有错误信息
2. 网络请求是否成功（查看 Network 标签）
3. Supabase 连接是否正常

**解决方案：**
```javascript
// 在浏览器控制台测试连接
import { supabase } from './services/supabaseClient';
supabase.from('profiles').select('*').limit(5).then(({ data, error }) => {
  console.log('Data:', data);
  console.log('Error:', error);
});
```

### 问题 2: RLS 权限错误

如果看到权限错误，检查：
1. RLS 是否已启用
2. RLS 策略是否正确配置
3. 是否使用了正确的 Anon Key

**解决方案：**
- 如果 RLS 已禁用，可以保持禁用状态用于开发
- 或者检查 `supabase/schema.sql` 中的 RLS 策略

### 问题 3: 查询 accounts 表失败

**注意：** 代码中可能引用了 `accounts` 表，但我们的架构中没有这个表。所有数据都在 `profiles` 表中。

**解决方案：**
- 检查 `hooks/useCustomerData.ts` 和 `hooks/useDashboardData.ts`
- 将 `accounts` 查询改为 `profiles` 查询
- 使用 `profiles` 表中的 `arpu_30d` 字段

## ✅ 成功标志

如果以下所有项都正常，说明数据连接成功：

- ✅ 用户列表显示 50 个用户
- ✅ 产品列表显示 4 个产品
- ✅ 优惠券列表显示 7 个优惠券
- ✅ 活动列表显示 3 个活动
- ✅ 使用历史图表有数据
- ✅ 浏览器控制台没有错误
- ✅ 网络请求返回 200 状态码

## 📊 数据验证清单

- [ ] 用户数据：50 条记录
- [ ] 产品数据：4 条记录
- [ ] 优惠券数据：7 条记录
- [ ] 活动数据：3 条记录
- [ ] 使用历史：至少 1,500 条记录
- [ ] 前端页面正常显示数据
- [ ] 没有控制台错误
- [ ] 网络请求成功

