# 🔍 RLS 403 错误诊断指南

## ❌ 问题：由于 RLS 的原因访问数据库被拒绝

## 🔍 可能的原因

### 1. ✅ Session 没有正确传递（最常见）

**症状**：
- 查询返回 403 Forbidden
- 错误信息：`permission denied for table profiles`

**检查方法**：

在浏览器控制台运行：

```javascript
// 检查 session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
console.log('Access Token:', session?.access_token ? 'Present' : 'Missing');
```

**如果 session 为 null**：
- 用户没有登录
- Session 已过期
- Session 没有正确保存

**解决方案**：
1. 确保用户已登录
2. 在查询前检查 session：

```typescript
// ✅ 正确的方式
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  console.error('No session - user not authenticated');
  return;
}

// 然后才执行查询
const { data, error } = await supabase
  .from('profiles')
  .select('*');
```

### 2. ✅ RLS 策略配置错误

**检查方法**：

在 Supabase Dashboard → SQL Editor 中运行：

```sql
-- 检查 RLS 状态
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'profiles';

-- 检查策略
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual as using_clause
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'profiles';
```

**如果 RLS 已启用但没有策略**：
- 需要创建策略

**解决方案**：
执行 `supabase/ULTIMATE-FIX.sql`：

```sql
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

### 3. ✅ 用户角色不正确

**检查方法**：

在浏览器控制台运行：

```javascript
const { data: { user } } = await supabase.auth.getUser();
console.log('User role:', user?.role);  // 应该是 'authenticated'
```

**如果 role 不是 'authenticated'**：
- 用户没有正确登录
- Token 已过期

**解决方案**：
1. 重新登录
2. 检查 token 是否过期

### 4. ✅ 查询时机问题

**症状**：
- 组件加载时立即查询
- 但此时 session 还没有加载完成

**检查方法**：

查看代码中是否有：

```typescript
// ❌ 错误：立即查询，可能 session 还没加载
useEffect(() => {
  const { data, error } = await supabase.from('profiles').select('*');
}, []);
```

**解决方案**：

```typescript
// ✅ 正确：先检查 session
useEffect(() => {
  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session');
      return;
    }
    
    const { data, error } = await supabase.from('profiles').select('*');
  };
  
  fetchData();
}, []);
```

## 🛠️ 诊断步骤

### 步骤 1: 运行诊断脚本

```bash
npx tsx scripts/diagnose-auth-issue.ts
```

这会检查：
- Session 是否存在
- Access Token 是否存在
- 查询是否成功
- RLS 状态

### 步骤 2: 检查浏览器控制台

打开浏览器 DevTools (F12)，查看：

1. **Network 标签**：
   - 找到失败的请求
   - 查看 Request Headers：
     - `Authorization: Bearer <token>` 是否存在？
     - `apikey: <key>` 是否存在？

2. **Console 标签**：
   - 查看是否有认证相关的错误
   - 查看是否有 RLS 相关的错误

### 步骤 3: 验证 RLS 策略

在 Supabase Dashboard → SQL Editor 中运行：

```sql
-- 验证策略
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename IN ('profiles', 'products', 'coupons', 'telecom_usage', 'campaigns', 'campaign_logs')
ORDER BY tablename, cmd;
```

**期望结果**：
- 每个表应该有策略
- `roles` 应该包含 `authenticated`
- `qual` 应该是 `true` 或 `auth.uid() IS NOT NULL`

## 🔧 修复方案

### 方案 1: 确保 Session 正确传递

已更新 `hooks/useDashboardData.ts`，添加了 session 检查：

```typescript
// ✅ 在查询前检查 session
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  console.warn('No active session');
  return;
}
```

### 方案 2: 修复 RLS 策略

如果 RLS 策略有问题，执行：

```sql
-- 执行 supabase/ULTIMATE-FIX.sql
```

这会：
1. 启用 RLS
2. 删除旧策略
3. 创建新策略（允许所有认证用户访问）

### 方案 3: 检查 Supabase 客户端配置

确保 `services/supabaseClient.ts` 正确配置：

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,      // ✅ 必须为 true
    autoRefreshToken: true,    // ✅ 必须为 true
    detectSessionInUrl: true,  // ✅ 必须为 true
  },
});
```

## 📋 检查清单

- [ ] 用户已登录（session 存在）
- [ ] Access Token 存在
- [ ] RLS 已启用
- [ ] RLS 策略已创建
- [ ] 策略允许 `authenticated` 角色
- [ ] 查询前检查了 session
- [ ] Supabase 客户端正确配置

## 🎯 快速测试

在浏览器控制台运行：

```javascript
// 1. 检查 session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// 2. 测试查询
const { data, error } = await supabase
  .from('profiles')
  .select('id, name')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Success:', data);
}
```

如果仍然失败，检查：
1. Session 是否存在
2. RLS 策略是否正确
3. 网络请求的 Headers 是否包含 Authorization

