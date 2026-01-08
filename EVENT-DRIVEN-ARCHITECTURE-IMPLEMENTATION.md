# 🎯 Event-Driven Architecture Implementation Guide

## ✅ 完成状态

### Task 1: Database Auto-Aggregation ✅
**文件**: `supabase/auto-update-campaign-stats.sql`

已创建 PostgreSQL 函数和触发器，自动更新 Campaign 统计信息：
- ✅ 当 `campaign_logs` 插入新记录时自动触发
- ✅ 自动计算 `reach` (send 事件数量)
- ✅ 自动计算 `conversion_rate` (purchase / send)
- ✅ 自动更新 `stats` JSONB 字段

**执行步骤**:
1. 在 Supabase Dashboard → SQL Editor 中执行 `supabase/auto-update-campaign-stats.sql`
2. 验证触发器已创建：`SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_campaign_stats';`

---

### Task 2: Dashboard Realtime Feedback ✅
**文件**: `hooks/useDashboardCampaignAutoSend.ts`

已修复并增强 Realtime 订阅：
- ✅ 正确监听 `campaign_logs` 表的 `INSERT` 事件
- ✅ 过滤 `purchase` 事件
- ✅ 显示 Toast 通知
- ✅ 自动更新 Campaign 统计（通过 Task 1 的触发器）

**关键改进**:
- 增强的错误处理和日志记录
- 改进的 metadata 解析（支持字符串和对象）
- 详细的调试日志

---

### Task 3: Interactive Simulation Loop ✅
**文件**: `hooks/useCampaignSimulator.ts`

已实现 Post-Purchase Workflow：
- ✅ 监听 `purchase` 事件
- ✅ 自动查找下一个 Wait Node
- ✅ Demo 模式：将等待时间转换为秒（3天 → 3秒）
- ✅ 自动查找下一个 Channel Node
- ✅ 自动发送 Upsell Email

**工作流程**:
1. 用户点击 Purchase → 触发 `purchase` 事件
2. Simulator 检测到 Purchase → 开始 Post-Purchase Workflow
3. 查找 Wait Node → 执行等待（Demo 模式加速）
4. 查找下一个 Channel Node → 发送 Upsell Email
5. 记录 `send` 事件到 `campaign_logs`

---

## 🚀 执行顺序

### 步骤 1: 执行数据库触发器（必需）

```sql
-- 在 Supabase Dashboard → SQL Editor 中执行
-- 文件: supabase/auto-update-campaign-stats.sql
```

**验证**:
```sql
-- 检查触发器是否创建成功
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_campaign_stats';

-- 测试触发器（插入一条测试记录）
INSERT INTO campaign_logs (campaign_id, user_id, action_type, status)
VALUES ('test-campaign-id', 'test-user-id', 'send', 'Success');

-- 检查 Campaign 是否自动更新
SELECT id, reach, conversion_rate, stats FROM campaigns WHERE id = 'test-campaign-id';
```

---

### 步骤 2: 验证 Dashboard Realtime（已实现）

Dashboard 会自动：
- ✅ 订阅所有 Active Campaign 的 Realtime 更新
- ✅ 显示 Purchase 通知
- ✅ 自动刷新 Campaign 列表（显示更新的 Reach 和 Conversion）

**测试**:
1. 打开 Dashboard
2. 打开浏览器控制台（F12）
3. 应该看到：`✅ [Dashboard Auto-Send] Successfully subscribed to campaign ...`
4. 在 Landing Page 点击 Purchase
5. Dashboard 应该立即显示通知

---

### 步骤 3: 测试 Post-Purchase Workflow（已实现）

**测试流程**:
1. 在 Campaign Canvas 中创建一个包含以下节点的 Campaign：
   - Segment Node
   - Action Node (初始 Offer)
   - Channel Node (发送初始邮件)
   - **Wait Node** (3 days)
   - Channel Node (Upsell Email)

2. 保存 Campaign 并启动 Live Demo

3. 发送测试邮件

4. 在 Landing Page 点击 "Claim Offer Now"

5. **预期行为**:
   - ✅ Simulator 检测到 Purchase
   - ✅ 显示 "⏳ Waiting 3s (Demo: 3 days → 3s)..."
   - ✅ 等待 3 秒
   - ✅ 显示 "📧 Sending upsell email..."
   - ✅ 发送 Upsell Email
   - ✅ 显示 "✅ Upsell email sent successfully!"

---

## 🔍 调试指南

### 检查数据库触发器

```sql
-- 查看触发器函数
SELECT proname, prosrc FROM pg_proc WHERE proname = 'update_campaign_stats_on_log_insert';

-- 查看触发器
SELECT tgname, tgrelid::regclass, tgenabled FROM pg_trigger WHERE tgname = 'trigger_update_campaign_stats';
```

### 检查 Realtime 订阅

在浏览器控制台查看日志：
- `✅ [Dashboard Auto-Send] Successfully subscribed` - 订阅成功
- `🔔 Realtime event received` - 收到事件
- `🎉 New conversion detected` - 检测到转换
- `✅ Notification added` - 通知已添加

### 检查 Post-Purchase Workflow

在浏览器控制台查看日志：
- `[Campaign Simulator] 🎉 Purchase verified` - Purchase 检测成功
- `[Campaign Simulator] Found Wait node` - 找到 Wait Node
- `[Campaign Simulator] Found next Channel node` - 找到下一个 Channel Node
- `[Campaign Simulator] ✅ Upsell email sent` - Upsell Email 发送成功

---

## ⚠️ 注意事项

1. **Wait Node 映射**:
   - Demo 模式下，`days` 直接转换为 `seconds`（3 days = 3 seconds）
   - `hours` 转换为秒（24 hours = 1 second，最小 1 秒）
   - `minutes` 转换为秒（1440 minutes = 1 second，最小 1 秒）

2. **RLS 策略**:
   - 确保 `campaign_logs` 表允许 `anon` 角色 INSERT
   - 确保 `campaigns` 表允许 SELECT（Realtime 需要读取）

3. **Flow Definition 结构**:
   - 确保 Campaign 的 `flow_definition` 包含 `nodes` 和 `edges`
   - Wait Node 必须有 `durationValue` 和 `durationUnit`
   - Channel Node 必须有 `channelContent.email.text` 或 Action Node 连接

---

## 📝 文件清单

### 新增文件
- ✅ `supabase/auto-update-campaign-stats.sql` - 数据库触发器

### 修改文件
- ✅ `hooks/useDashboardCampaignAutoSend.ts` - Dashboard Realtime 订阅
- ✅ `hooks/useCampaignSimulator.ts` - Post-Purchase Workflow

---

## 🎉 完成！

所有三个任务已完成。系统现在具有完整的事件驱动架构：

1. ✅ **数据库自动聚合** - Campaign 统计自动更新
2. ✅ **Dashboard 实时反馈** - Purchase 事件实时通知
3. ✅ **交互式模拟循环** - Post-Purchase Workflow 自动执行

测试时，请按照上述步骤操作，如有问题请查看浏览器控制台日志。

