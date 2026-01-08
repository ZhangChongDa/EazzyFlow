# 👤 用户注册流程说明

## 📋 当前实现

### 1. Supabase 客户端初始化 ✅

**位置**: `services/supabaseClient.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
    },
  },
});
```

**说明**:
- ✅ 使用环境变量 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`
- ✅ 已正确配置认证选项
- ✅ 已添加调试日志

### 2. 用户注册流程

**位置**: `components/Login.tsx`

当用户注册时：

1. **前端调用** `supabase.auth.signUp()`
2. **Supabase Auth** 创建 `auth.users` 记录
3. **数据库触发器** 自动创建 `profiles` 记录（见下方）

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: email.split('@')[0], // 默认名称
    }
  }
});
```

### 3. 自动创建 Profile 记录

**位置**: `supabase/create-profile-trigger.sql`

当新用户在 `auth.users` 表中创建时，数据库触发器会自动：

1. 创建对应的 `profiles` 记录
2. 使用 `auth.users.id` 作为 `profiles.id`
3. 设置默认值：
   - `msisdn`: 使用电话号码（如果有）或 'N/A'
   - `name`: 使用 metadata 中的 name，或 email，或 'User'
   - `tier`: 'Silver'（默认）
   - `status`: 'Active'（默认）
   - `arpu_30d`: 0（默认）

## 🚀 设置步骤

### 步骤 1: 创建数据库触发器

在 Supabase Dashboard → SQL Editor 中执行：

```sql
-- 执行 supabase/create-profile-trigger.sql
```

或者手动执行：

```sql
-- 创建函数
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    msisdn,
    name,
    tier,
    status,
    arpu_30d
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, 'N/A'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, 'User'),
    'Silver',
    'Active',
    0
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

### 步骤 2: 验证触发器

1. **注册新用户**（通过前端或 Dashboard）
2. **检查 `profiles` 表**：
   ```sql
   SELECT * FROM profiles ORDER BY created_at DESC LIMIT 1;
   ```
3. **应该看到**：
   - 新创建的 profile 记录
   - `id` 与 `auth.users.id` 相同
   - 默认值已设置

## 📊 数据流程

```
用户注册
    ↓
supabase.auth.signUp()
    ↓
auth.users 表插入新记录
    ↓
触发器 on_auth_user_created 触发
    ↓
自动创建 profiles 记录
    ↓
用户可以使用系统
```

## 🔧 自定义 Profile 数据

如果需要从注册表单收集更多信息（如姓名、电话等），可以：

### 方法 1: 通过 metadata

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      name: 'John Doe',
      phone: '+959123456789',
      // 其他自定义字段
    }
  }
});
```

触发器会自动从 `raw_user_meta_data` 读取这些值。

### 方法 2: 注册后手动更新

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});

if (data.user) {
  // 更新 profile
  await supabase
    .from('profiles')
    .update({
      name: 'John Doe',
      msisdn: '+959123456789',
    })
    .eq('id', data.user.id);
}
```

## ✅ 验证清单

- [ ] 触发器已创建
- [ ] 测试注册新用户
- [ ] 检查 `profiles` 表是否有新记录
- [ ] 验证默认值是否正确
- [ ] 测试登录功能

## 🔐 安全说明

- 触发器使用 `SECURITY DEFINER`，确保有权限插入数据
- RLS 策略仍然生效，用户只能访问自己的数据（如果需要）
- 默认值确保所有必需字段都有值

## 📝 注意事项

1. **邮箱确认**: 如果启用了邮箱确认，用户需要点击确认链接才能登录
2. **MSISDN**: 如果用户没有提供电话号码，会使用 'N/A'，后续可以更新
3. **名称**: 优先使用 metadata 中的 name，否则使用 email 前缀，最后使用 'User'

