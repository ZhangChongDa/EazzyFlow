# ⚡ 快速修复：Session 检查

## 🎯 问题

由于 RLS 的原因访问数据库被拒绝，可能是因为：
1. **Session 没有正确传递**
2. **查询时用户还没有登录**
3. **Session 已过期**

## ✅ 解决方案

### 已更新的文件

1. **`hooks/useDashboardData.ts`** ✅
   - 添加了 session 检查
   - 在查询前验证用户是否已登录
   - 添加了详细的错误日志

### 需要检查的其他文件

检查以下文件是否也需要添加 session 检查：

- `hooks/useCustomerData.ts`
- `services/dataService.ts`
- 其他使用 `supabase.from()` 的地方

## 🔍 如何验证修复

### 步骤 1: 打开浏览器控制台

按 F12 打开 DevTools

### 步骤 2: 检查 Session

在 Console 中运行：

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User ID:', session?.user?.id);
console.log('Access Token:', session?.access_token ? '✅ Present' : '❌ Missing');
```

**期望结果**：
- Session 不为 null
- User ID 存在
- Access Token 存在

### 步骤 3: 查看日志

在 Console 中应该看到：

```
✅ Session active, user ID: <user-id>
✅ Access token present: true
✅ Successfully fetched profiles: <count>
```

如果看到：

```
⚠️ No active session - user not authenticated
```

说明用户没有登录，需要先登录。

### 步骤 4: 检查网络请求

在 Network 标签中：
1. 找到失败的请求（通常是 `/rest/v1/profiles`）
2. 查看 Request Headers：
   - `Authorization: Bearer <token>` 应该存在
   - `apikey: <key>` 应该存在

如果 `Authorization` header 不存在，说明 session 没有正确传递。

## 🛠️ 如果仍然失败

### 1. 清除浏览器存储

1. 打开 DevTools (F12)
2. Application 标签 → Storage
3. 清除：
   - Local Storage → `supabase.auth.token`
   - Session Storage
   - Cookies
4. 刷新页面
5. 重新登录

### 2. 运行诊断脚本

```bash
npx tsx scripts/diagnose-auth-issue.ts
```

这会检查所有可能的问题。

### 3. 验证 RLS 策略

在 Supabase Dashboard → SQL Editor 中运行：

```sql
-- 检查策略
SELECT 
    tablename,
    policyname,
    cmd,
    roles
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'profiles';
```

确保有策略且 `roles` 包含 `authenticated`。

## 📋 代码模式

所有查询都应该遵循这个模式：

```typescript
// ✅ 正确的方式
useEffect(() => {
  const fetchData = async () => {
    // 1. 先检查 session
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.warn('No session - user not authenticated');
      return;
    }

    // 2. 然后才查询
    const { data, error } = await supabase
      .from('profiles')
      .select('*');

    if (error) {
      console.error('Query error:', error);
      return;
    }

    // 3. 处理数据
    console.log('Data:', data);
  };

  fetchData();
}, []);
```

## 🎯 总结

**根本原因**：查询时 session 可能还没有加载，或者没有正确传递。

**解决方案**：
1. ✅ 在查询前检查 session
2. ✅ 添加详细的错误日志
3. ✅ 确保 Supabase 客户端正确配置

**已修复**：
- `hooks/useDashboardData.ts` ✅

**需要检查**：
- 其他使用 `supabase.from()` 的文件

