# 🔴 Supabase Realtime 配置指南

## 📋 问题描述

如果 Dashboard 中的 Real Time Subscription 测试失败（点击 Claim 后没有出现航班滚动提示），通常是因为 Supabase Realtime 没有在数据库层面启用。

## ✅ 解决方案

### 步骤 1：启用 Supabase Realtime

1. 登录 [Supabase Dashboard](https://app.supabase.com/)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 打开 `supabase/enable-realtime.sql` 文件
5. 复制全部内容并粘贴到 SQL Editor
6. 点击 **Run** 执行脚本

### 步骤 2：验证 Realtime 已启用

在 SQL Editor 中执行以下查询来验证：

```sql
-- 检查 Realtime 扩展是否启用
SELECT * FROM pg_extension WHERE extname = 'supabase_realtime';

-- 检查 campaign_logs 表是否在 publication 中
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'campaign_logs';
```

**预期结果：**
- 第一条查询应该返回一行数据（扩展已启用）
- 第二条查询应该返回 `campaign_logs` 表在 `supabase_realtime` publication 中

### 步骤 3：检查 RLS 策略

Realtime 需要能够读取数据来发送事件，确保 RLS 策略允许 SELECT：

```sql
-- 检查 campaign_logs 表的 RLS 策略
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'campaign_logs';
```

如果 RLS 策略不允许 `anon` 角色 SELECT，Realtime 将无法工作。

### 步骤 4：重启 Supabase 项目（可选）

如果 Realtime 仍然不工作，尝试：
1. 在 Supabase Dashboard 中，进入 **Settings** → **General**
2. 点击 **Restart Project**（等待几分钟）

### 步骤 5：验证订阅状态

1. 打开浏览器开发者工具（F12）
2. 切换到 **Console** 标签
3. 在 Dashboard 页面，查看控制台日志
4. 应该看到类似以下的消息：

```
✅ [Dashboard Auto-Send] Successfully subscribed to campaign <campaign-id> (<campaign-name>)
```

如果看到错误消息：
```
❌ [Dashboard Auto-Send] Channel error for campaign <campaign-id>
⚠️ [Dashboard Auto-Send] Realtime may not be enabled. Please run supabase/enable-realtime.sql in Supabase Dashboard
```

说明 Realtime 没有正确配置，请重复步骤 1-4。

## 🔍 故障排除

### 问题 1：订阅状态显示 `CHANNEL_ERROR`

**原因：** Realtime publication 没有正确配置

**解决方案：**
1. 重新运行 `supabase/enable-realtime.sql`
2. 检查 `campaign_logs` 表是否在 publication 中（使用步骤 2 的查询）
3. 确保 RLS 策略允许 SELECT

### 问题 2：订阅状态显示 `TIMED_OUT`

**原因：** Supabase 项目可能需要重启，或者网络连接问题

**解决方案：**
1. 重启 Supabase 项目
2. 检查网络连接
3. 等待几分钟后重试

### 问题 3：Purchase 事件已写入数据库，但没有收到通知

**原因：** 
- Realtime 订阅没有正确建立
- 订阅的 filter 条件不匹配
- RLS 策略阻止了事件传播

**解决方案：**
1. 检查浏览器控制台中的订阅状态日志
2. 验证 purchase 事件的 `campaign_id` 和 `action_type` 是否正确
3. 检查 RLS 策略是否允许读取

### 问题 4：在 Supabase Dashboard 中看不到 Realtime 选项

**原因：** 某些 Supabase 项目可能需要手动启用 Realtime

**解决方案：**
1. 在 Supabase Dashboard 中，进入 **Settings** → **API**
2. 查找 **Realtime** 部分
3. 确保 Realtime 已启用（通常默认启用）

## 📝 测试步骤

1. **启用 Realtime**（步骤 1）
2. **打开 Dashboard** 页面
3. **打开浏览器控制台**（F12）
4. **激活一个 Campaign**（切换为 Active）
5. **查看控制台日志**，应该看到：
   ```
   ✅ [Dashboard Auto-Send] Successfully subscribed to campaign <id> (<name>)
   ```
6. **在另一个标签页**打开 Offer Landing Page
7. **点击 Claim 按钮**
8. **返回 Dashboard**，应该看到航班滚动提示

## 🎯 预期行为

当 Realtime 正确配置后：

1. ✅ Dashboard 加载时，会自动订阅所有 Active Campaign
2. ✅ 控制台显示成功订阅的消息
3. ✅ 当用户点击 Claim（Purchase）时，Dashboard 立即显示通知
4. ✅ 通知显示用户邮箱、时间戳和 Campaign 名称
5. ✅ 通知在 10 秒后自动消失

## 📚 相关文档

- [Supabase Realtime 官方文档](https://supabase.com/docs/guides/realtime)
- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/current/logical-replication.html)

## ⚠️ 注意事项

1. **RLS 策略**：Realtime 需要能够读取数据，确保 RLS 策略允许 `anon` 角色 SELECT
2. **性能影响**：Realtime 订阅会消耗资源，避免创建过多的订阅
3. **网络连接**：Realtime 使用 WebSocket 连接，确保网络连接稳定
4. **项目重启**：修改 Realtime 配置后，可能需要重启 Supabase 项目才能生效

