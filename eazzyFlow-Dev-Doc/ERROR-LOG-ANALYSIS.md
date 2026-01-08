# 🔍 错误日志分析报告

## 📋 错误信息

```json
{
  "event_message": "permission denied for table profiles",
  "sql_state_code": "42501",
  "user_name": "authenticator",
  "timestamp": "2025-12-26 11:37:02 UTC"
}
```

## 🔍 根本原因分析

### 1. 错误类型

- **错误码**: `42501` - PostgreSQL 权限拒绝错误
- **错误信息**: `permission denied for table profiles`
- **用户**: `authenticator` (Supabase 认证层用户)

### 2. 关键发现

#### ✅ 请求通过了 Supabase 认证层
- `user_name: "authenticator"` 表示请求已到达数据库层
- 说明 Supabase 的认证机制正常工作

#### ❌ RLS 策略拒绝了访问
- SQL 状态码 `42501` 明确表示权限被拒绝
- 查询本身是正确的 SELECT 语句
- 问题出在 RLS (Row Level Security) 策略检查

### 3. 可能的原因

#### 原因 1: RLS 策略条件不满足（最可能）

**如果策略是**:
```sql
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);
```

**问题**: `auth.uid()` 可能返回 NULL，导致策略返回 false

**为什么**:
- JWT token 没有正确传递
- Token 已过期
- Token 格式不正确

#### 原因 2: 用户角色不匹配

**如果策略是**:
```sql
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);
```

**问题**: 用户角色可能不是 `authenticated`

**为什么**:
- 用户没有正确登录
- Session 已过期
- Token 中的 role 字段不正确

#### 原因 3: RLS 策略不存在或配置错误

**问题**: 
- RLS 已启用，但没有策略
- 策略语法错误
- 策略被意外删除

## 🎯 解决方案

### 方案 1: 验证并修复 RLS 策略（推荐）

#### 步骤 1: 检查当前 RLS 状态

在 Supabase Dashboard → SQL Editor 中运行：

```sql
-- 检查 RLS 状态
SELECT 
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ Enabled'
        ELSE '❌ Disabled'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'profiles';

-- 检查现有策略
SELECT 
    tablename,
    policyname,
    cmd,
    roles,
    permissive,
    qual as using_clause,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'profiles';
```

#### 步骤 2: 应用最可靠的 RLS 策略

执行 `supabase/ULTIMATE-FIX.sql` 或手动运行：

```sql
-- 删除所有旧策略
DROP POLICY IF EXISTS "profiles_all_authenticated" ON profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON profiles;
-- ... 删除所有其他策略

-- 创建最可靠的策略
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

**为什么这个策略最可靠**:
- `FOR ALL` - 覆盖所有操作（SELECT, INSERT, UPDATE, DELETE）
- `TO authenticated` - 明确指定角色
- `USING (true)` - 最简单的条件，只要角色匹配就允许
- `WITH CHECK (true)` - 允许所有插入/更新

### 方案 2: 验证 JWT Token 传递

#### 在前端代码中检查

```typescript
// 在查询前检查 session
const { data: { session }, error: sessionError } = await supabase.auth.getSession();

if (!session) {
  console.error('❌ No session - user not authenticated');
  return;
}

console.log('✅ Session found:');
console.log('   - User ID:', session.user.id);
console.log('   - Role:', session.user.role);
console.log('   - Access Token:', session.access_token ? 'Present' : 'Missing');
```

#### 在浏览器控制台测试

```javascript
// 检查 session
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);

// 如果 session 存在，测试查询
if (session) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, name')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Success:', data);
  }
}
```

### 方案 3: 诊断 Token 问题

#### 检查网络请求

1. 打开浏览器 DevTools (F12)
2. 进入 Network 标签
3. 找到失败的请求（通常是 `/rest/v1/profiles`）
4. 查看 Request Headers：
   - `Authorization: Bearer <token>` 应该存在
   - `apikey: <key>` 应该存在

如果 `Authorization` header 不存在或 token 格式错误，说明 session 没有正确传递。

## 🔧 立即执行的修复步骤

### 步骤 1: 运行诊断脚本

```bash
npx tsx scripts/diagnose-auth-issue.ts
```

这会检查：
- Session 是否存在
- Access Token 是否存在
- 查询是否成功
- RLS 策略状态

### 步骤 2: 修复 RLS 策略

在 Supabase Dashboard → SQL Editor 中执行：

```sql
-- 执行 supabase/ULTIMATE-FIX.sql
-- 或者手动执行以下 SQL：

-- 1. 确保 RLS 已启用
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 2. 删除所有旧策略
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON profiles', r.policyname);
    END LOOP;
END $$;

-- 3. 创建最可靠的策略
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

### 步骤 3: 验证修复

在浏览器控制台运行：

```javascript
const { data, error } = await supabase
  .from('profiles')
  .select('id, name')
  .limit(1);

if (error) {
  console.error('❌ Still failing:', error);
} else {
  console.log('✅ Fixed! Data:', data);
}
```

## 📊 错误日志解读

### 关键字段说明

| 字段 | 值 | 说明 |
|------|-----|------|
| `event_message` | `permission denied for table profiles` | 明确的权限拒绝错误 |
| `sql_state_code` | `42501` | PostgreSQL 标准权限拒绝错误码 |
| `user_name` | `authenticator` | Supabase 认证层用户（正常） |
| `query` | `SELECT ... FROM profiles` | 查询本身是正确的 |
| `timestamp` | `2025-12-26 11:37:02 UTC` | 错误发生时间 |

### 为什么是 `authenticator` 用户？

`authenticator` 是 Supabase 的认证层用户，这是正常的。实际的用户认证信息通过 JWT token 传递，RLS 策略使用 `auth.uid()` 和 `auth.role()` 来获取。

## ✅ 验证清单

修复后，确保：

- [ ] RLS 已启用
- [ ] RLS 策略已创建
- [ ] 策略使用 `TO authenticated USING (true)`
- [ ] 用户已登录（session 存在）
- [ ] Access Token 存在
- [ ] 查询成功返回数据

## 🎯 总结

**根本原因**: RLS 策略检查失败，可能是因为：
1. 策略条件不满足（`auth.uid()` 返回 NULL）
2. 用户角色不匹配
3. 策略配置错误

**最佳解决方案**:
1. 使用最可靠的 RLS 策略语法：`FOR ALL TO authenticated USING (true)`
2. 确保前端在查询前检查 session
3. 添加详细的错误日志

**已提供的工具**:
- `scripts/diagnose-auth-issue.ts` - 自动诊断
- `supabase/ULTIMATE-FIX.sql` - 修复脚本
- 更新的前端代码 - 包含 session 检查

