# 🔐 Supabase 用户识别机制详解

## 📋 问题：Supabase 如何知道是哪个用户在查询？

## ✅ 答案：通过 JWT Token 自动传递

### 1. 认证流程

```
用户登录
    ↓
supabase.auth.signInWithPassword()
    ↓
Supabase 返回 JWT Token
    ↓
客户端自动保存到 localStorage
    ↓
每次 API 请求自动在 Headers 中包含 Token
    ↓
Supabase 服务器验证 Token
    ↓
RLS 策略使用 auth.uid() 获取用户 ID
```

### 2. JWT Token 内容

JWT Token 包含以下信息：
```json
{
  "sub": "2d22c3b5-e6e7-42d8-b660-1886ffee76d3",  // 用户 ID
  "email": "user@example.com",
  "role": "authenticated",
  "aud": "authenticated",
  "exp": 1766746541,
  ...
}
```

### 3. 自动传递机制

**位置**: `services/supabaseClient.ts`

```typescript
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,        // ✅ 自动保存 session
    autoRefreshToken: true,      // ✅ 自动刷新 token
    detectSessionInUrl: true,    // ✅ 从 URL 检测 session
  },
});
```

**工作原理**：
- ✅ 登录后，session 自动保存到 `localStorage`
- ✅ 每次 API 请求，客户端自动在 HTTP Headers 中添加：
  ```
  Authorization: Bearer <JWT_TOKEN>
  apikey: <ANON_KEY>
  ```
- ✅ Supabase 服务器自动解析 token 并提取用户信息

### 4. RLS 策略中的用户识别

#### 当前实现（允许所有认证用户访问所有数据）

```sql
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)  -- 只要认证了就可以访问
    WITH CHECK (true);
```

**说明**：
- `TO authenticated` - 只允许认证用户
- `USING (true)` - 允许访问所有行
- 所有认证用户都可以看到所有数据

#### 如果需要限制用户只能看到自己的数据

```sql
CREATE POLICY "profiles_user_own_data" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());  -- 只能看到自己的 profile
```

**说明**：
- `auth.uid()` - 从 JWT token 中获取当前用户 ID
- `id = auth.uid()` - 只返回当前用户自己的记录
- 每个用户只能看到自己的数据

## 🔍 如何验证当前用户

### 方法 1: 在前端代码中

```typescript
// 获取当前用户
const { data: { user } } = await supabase.auth.getUser();
console.log('Current user ID:', user?.id);
console.log('Current user email:', user?.email);
```

### 方法 2: 在 SQL 中（Supabase Dashboard）

```sql
-- 查看当前认证用户信息
SELECT 
    auth.uid() as current_user_id,
    auth.role() as current_role,
    auth.email() as current_email;
```

**注意**：在 SQL Editor 中，如果没有通过应用登录，`auth.uid()` 会返回 NULL。

### 方法 3: 在 RLS 策略中

```sql
-- 在策略中使用 auth.uid()
CREATE POLICY "user_own_profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());  -- auth.uid() 自动获取当前用户 ID
```

## 📊 数据访问控制选项

### 选项 1: 所有认证用户共享数据（当前实现）

**适用场景**：内部管理系统，所有管理员共享数据

```sql
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true);
```

**效果**：
- ✅ 所有登录用户都可以看到所有 profiles
- ✅ 适合团队协作场景

### 选项 2: 用户只能看到自己的数据

**适用场景**：用户个人数据，如个人资料、订单等

```sql
CREATE POLICY "profiles_user_own" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());
```

**效果**：
- ✅ 用户只能看到自己的 profile（id = auth.uid()）
- ✅ 其他用户的数据不可见

### 选项 3: 混合策略

**适用场景**：用户可以查看自己的数据，也可以查看公共数据

```sql
-- 用户可以查看自己的数据
CREATE POLICY "profiles_user_own" ON profiles
    FOR SELECT
    TO authenticated
    USING (id = auth.uid());

-- 用户可以查看公共数据（如产品、优惠券）
CREATE POLICY "products_public" ON products
    FOR SELECT
    TO authenticated
    USING (true);
```

## 🔧 实际应用示例

### 示例 1: 查询当前用户自己的 Profile

```typescript
// 前端代码
const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)  // 显式过滤（可选，如果 RLS 已限制）
    .single();
```

**说明**：
- 如果 RLS 策略已经限制 `id = auth.uid()`，则不需要 `.eq('id', user.id)`
- RLS 会自动过滤，只返回当前用户的数据

### 示例 2: 查询所有 Profiles（管理员视图）

```typescript
// 前端代码
const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*');
```

**说明**：
- 如果 RLS 策略是 `USING (true)`，会返回所有数据
- 如果 RLS 策略是 `USING (id = auth.uid())`，只会返回当前用户的数据

## 🎯 推荐配置（根据您的系统）

### 对于 EazzyFlow 系统

**建议**：使用**选项 1**（所有认证用户共享数据）

**原因**：
- 这是内部管理系统
- 所有管理员需要查看所有客户数据
- 不需要数据隔离

**当前 RLS 策略已正确配置**：
```sql
CREATE POLICY "profiles_all_authenticated" ON profiles
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
```

## 📝 总结

1. **Supabase 自动识别用户**：
   - JWT Token 自动在 HTTP Headers 中传递
   - 无需手动传递用户 ID

2. **RLS 策略使用 `auth.uid()`**：
   - 自动从 JWT token 中提取用户 ID
   - 无需在前端代码中指定用户 ID

3. **当前实现**：
   - ✅ 所有认证用户共享数据
   - ✅ 适合内部管理系统
   - ✅ 无需修改

4. **如果需要数据隔离**：
   - 修改 RLS 策略为 `USING (id = auth.uid())`
   - 每个用户只能看到自己的数据

