# Supabase Database Setup Guide

## 📋 概述

本文档说明如何设置 Eazzy Flow 电信营销活动系统的 Supabase 数据库。

## 🚀 快速开始

### 1. 创建 Supabase 项目

1. 访问 [Supabase Dashboard](https://app.supabase.com/)
2. 创建新项目或使用现有项目
3. 获取项目 URL 和 Anon Key：
   - 进入 Project Settings → API
   - 复制 `Project URL` 和 `anon public` key

### 2. 配置环境变量

在项目根目录创建 `.env` 文件（如果还没有）：

```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
# 推荐：使用 Service Role Key 进行数据填充（可绕过 RLS 限制）
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**获取 Service Role Key：**
1. 在 Supabase Dashboard 中，进入 **Project Settings** → **API**
2. 找到 **service_role** key（⚠️ 注意：这是敏感密钥，不要在前端代码中使用）
3. 复制并添加到 `.env` 文件中

**为什么需要 Service Role Key？**
- 种子脚本需要插入大量数据
- Service Role Key 可以绕过 Row Level Security (RLS) 限制
- 如果只使用 Anon Key，可能会遇到权限错误

### 3. 执行数据库架构

1. 在 Supabase Dashboard 中，进入 **SQL Editor**
2. 打开 `supabase/schema.sql` 文件
3. 复制全部内容并粘贴到 SQL Editor
4. 点击 **Run** 执行脚本

这将创建：
- ✅ 6 个核心表（profiles, products, coupons, telecom_usage, campaigns, campaign_logs）
- ✅ 所有枚举类型
- ✅ 索引和性能优化
- ✅ Row Level Security (RLS) 策略
- ✅ 自动更新触发器

### 4. 安装依赖

```bash
npm install
```

### 5. 填充初始数据

```bash
npm run seed
```

或者：

```bash
npx tsx scripts/seed-data.ts
```

## 📊 数据填充内容

种子脚本将填充：

- **4 个产品**：来自 `constants.ts` 的 `INITIAL_PRODUCTS`
- **7 个优惠券**：来自 `constants.ts` 的 `INITIAL_COUPONS`
- **50 个用户档案**：
  - 5 Crown（最高价值用户）
  - 10 Diamond（高价值用户）
  - 15 Platinum（中高价值）
  - 15 Gold（中等价值）
  - 5 Silver（低价值）
- **~4,500 条使用记录**：每个用户 30 天的 Data/Voice/SMS 使用历史
- **3 个营销活动**：来自 `constants.ts` 的 `MOCK_CAMPAIGNS`

## 🔄 重新运行种子脚本

种子脚本设计为可重复运行：
- **Products & Coupons**：使用 `upsert`，会更新现有记录
- **Profiles & Usage**：会先清空再重新生成（确保数据一致性）
- **Campaigns**：使用 `upsert`，会更新现有记录

## 📁 文件结构

```
supabase/
  ├── schema.sql          # 数据库架构定义
  └── README.md           # 本文档

scripts/
  └── seed-data.ts        # 数据填充脚本
```

## 🔍 验证数据

在 Supabase Dashboard 的 **Table Editor** 中检查：

1. `profiles` - 应该有 50 条记录
2. `products` - 应该有 4 条记录
3. `coupons` - 应该有 7 条记录
4. `telecom_usage` - 应该有 ~4,500 条记录
5. `campaigns` - 应该有 3 条记录

## 🛠️ 故障排除

### 错误：环境变量未设置

确保 `.env` 文件包含：
```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_key
```

### 错误：表已存在

如果表已存在，可以：
1. 在 Supabase Dashboard 中手动删除表
2. 或修改 `schema.sql` 使用 `DROP TABLE IF EXISTS` 语句

### 错误：外键约束失败

确保按顺序执行：
1. 先执行 `schema.sql` 创建表结构
2. 再运行 `seed-data.ts` 填充数据

### 错误：permission denied for table (权限错误 42501)

如果遇到权限错误，即使使用了 Service Role Key：

**解决方案 1：验证 Service Role Key**
1. 确保 `SUPABASE_SERVICE_ROLE_KEY` 是正确的
2. Service Role Key 应该是 JWT token，以 `eyJ` 开头
3. 在 Supabase Dashboard → Project Settings → API 中找到 `service_role` key
4. 确保复制的是 `service_role` key，不是 `anon` 或 `publishable` key

**解决方案 2：临时禁用 RLS（仅用于开发/测试）**
1. 在 Supabase Dashboard 的 SQL Editor 中执行 `supabase/disable-rls-temporarily.sql`
2. 运行 `npm run seed`
3. 完成后，重新启用 RLS（脚本中有说明）

**解决方案 3：检查 RLS 策略**
1. 在 Supabase Dashboard → Authentication → Policies 中检查
2. 确保 INSERT 策略已正确配置
3. 或者使用解决方案 2 临时禁用 RLS

## 📝 注意事项

- RLS 策略已配置为允许公开读取（演示用途）
- 生产环境应调整 RLS 策略以增强安全性
- 使用历史数据包含周末高峰模式（周五、周六数据使用量增加 30-50%）
- 用户 ARPU 和流失风险分数根据层级智能生成

## 🔐 安全建议

在生产环境中：
1. 限制 RLS 策略，仅允许认证用户访问
2. 使用服务角色密钥（Service Role Key）进行服务器端操作
3. 定期备份数据库
4. 监控异常查询和访问模式

