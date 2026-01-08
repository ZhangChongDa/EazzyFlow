# 🚀 Supabase Realtime 启用指南 - 一步一步操作

## 📋 准备工作

在开始之前，请确保：
- ✅ 你已经登录了 Supabase Dashboard
- ✅ 你已经选择了正确的项目
- ✅ 你有项目的管理员权限

---

## 步骤 1：打开 Supabase SQL Editor

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com/
   - 使用你的账号登录

2. **选择你的项目**
   - 在左侧项目列表中，点击你要配置的项目

3. **打开 SQL Editor**
   - 在左侧菜单栏中，找到并点击 **"SQL Editor"** 图标（📝 图标）
   - 或者直接访问：`https://app.supabase.com/project/YOUR_PROJECT_ID/sql/new`

---

## 步骤 2：复制 SQL 脚本

1. **打开项目中的 SQL 文件**
   - 在你的项目中，找到文件：`supabase/enable-realtime.sql`
   - 用文本编辑器打开这个文件

2. **复制全部内容**
   - 选中文件中的所有内容（Ctrl+A / Cmd+A）
   - 复制（Ctrl+C / Cmd+C）

**或者直接复制下面的代码：**

```sql
-- ============================================
-- Enable Supabase Realtime for campaign_logs
-- ============================================
-- This script enables Realtime subscriptions for the campaign_logs table
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================

-- 1. Enable Realtime extension (usually already enabled, but safe to run)
CREATE EXTENSION IF NOT EXISTS supabase_realtime;

-- 2. Drop existing publication if exists (to avoid conflicts)
DROP PUBLICATION IF EXISTS supabase_realtime;

-- 3. Create publication for Realtime
CREATE PUBLICATION supabase_realtime;

-- 4. Add campaign_logs table to the publication
ALTER PUBLICATION supabase_realtime ADD TABLE campaign_logs;

-- 5. Verify the publication
SELECT 
    schemaname,
    tablename,
    pubname
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
```

---

## 步骤 3：在 SQL Editor 中执行脚本

1. **粘贴 SQL 代码**
   - 在 Supabase Dashboard 的 SQL Editor 中
   - 点击编辑器区域（空白处）
   - 粘贴刚才复制的 SQL 代码（Ctrl+V / Cmd+V）

2. **检查代码**
   - 确认代码已经完整粘贴
   - 应该看到 5 个 SQL 语句（CREATE EXTENSION, DROP PUBLICATION, CREATE PUBLICATION, ALTER PUBLICATION, SELECT）

3. **执行脚本**
   - 点击 SQL Editor 右下角的 **"Run"** 按钮（或按 Ctrl+Enter / Cmd+Enter）
   - 等待执行完成（通常几秒钟）

4. **查看执行结果**
   - 在 SQL Editor 下方会显示执行结果
   - 如果成功，你会看到：
     - 前 4 个语句显示 "Success. No rows returned"
     - 第 5 个 SELECT 语句显示一个表格，包含 `campaign_logs` 表的信息

**✅ 成功标志：**
```
schemaname | tablename      | pubname
-----------|----------------|------------------
public     | campaign_logs  | supabase_realtime
```

---

## 步骤 4：验证配置（可选但推荐）

1. **执行验证脚本**
   - 在 SQL Editor 中，清空当前内容（或新建一个查询）
   - 复制并执行以下验证代码：

```sql
-- 验证 Realtime 配置
SELECT 
    'Realtime Extension' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'supabase_realtime') 
        THEN '✅ Enabled' 
        ELSE '❌ Not Enabled' 
    END as status
UNION ALL
SELECT 
    'campaign_logs in Publication' as check_type,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND tablename = 'campaign_logs'
        )
        THEN '✅ In Publication' 
        ELSE '❌ Not in Publication' 
    END as status;
```

2. **检查结果**
   - 如果两个状态都显示 ✅，说明配置成功
   - 如果有 ❌，请重新执行步骤 3

---

## 步骤 5：重启 Supabase 项目（重要！）

**⚠️ 重要：** 修改 Realtime 配置后，必须重启项目才能生效！

1. **进入项目设置**
   - 在左侧菜单栏，点击 **"Settings"**（⚙️ 图标）
   - 或者访问：`https://app.supabase.com/project/YOUR_PROJECT_ID/settings/general`

2. **找到重启选项**
   - 在 Settings 页面中，向下滚动
   - 找到 **"Danger Zone"** 或 **"Project Settings"** 部分
   - 找到 **"Restart Project"** 或 **"Restart"** 按钮

3. **重启项目**
   - 点击 **"Restart Project"** 按钮
   - 确认重启（可能会弹出确认对话框）
   - **等待 2-5 分钟**，项目会自动重启

4. **等待重启完成**
   - 页面顶部会显示 "Restarting..." 或类似提示
   - 等待状态变为 "Active" 或恢复正常
   - 不要在这期间执行其他操作

---

## 步骤 6：测试 Realtime 功能

### 6.1 打开你的应用

1. **启动开发服务器**（如果还没启动）
   ```bash
   npm run dev
   ```

2. **打开 Dashboard 页面**
   - 在浏览器中访问 Dashboard
   - 例如：`http://localhost:5173/dashboard`

### 6.2 打开浏览器控制台

1. **打开开发者工具**
   - 按 `F12` 键（Windows/Linux）
   - 或按 `Cmd+Option+I`（Mac）
   - 或右键点击页面 → "检查" / "Inspect"

2. **切换到 Console 标签**
   - 在开发者工具中，点击 **"Console"** 标签

### 6.3 检查订阅状态

1. **刷新 Dashboard 页面**
   - 按 `F5` 或点击刷新按钮

2. **查看控制台日志**
   - 在 Console 中，你应该看到类似以下的消息：

   **✅ 成功示例：**
   ```
   [Dashboard] Setting up subscriptions for 2 campaigns
   [Dashboard] Subscribing to campaign abc-123 (My Campaign)
   [Dashboard Auto-Send] Subscribing to realtime updates for campaign abc-123
   ✅ [Dashboard Auto-Send] Successfully subscribed to campaign abc-123 (My Campaign)
   ```

   **❌ 失败示例（如果看到这个，说明配置有问题）：**
   ```
   ❌ [Dashboard Auto-Send] Channel error for campaign abc-123
   ⚠️ [Dashboard Auto-Send] Realtime may not be enabled. Please run supabase/enable-realtime.sql in Supabase Dashboard
   ```

### 6.4 测试实时通知

1. **确保有一个 Active Campaign**
   - 在 Dashboard 中，确保至少有一个 Campaign 状态是 **"Active"**（On）
   - 如果没有，点击切换开关激活一个 Campaign

2. **打开 Offer Landing Page**
   - 在另一个浏览器标签页中，打开 Offer Landing Page
   - URL 格式：`http://localhost:5173/offer/:offerId?campaignId=xxx&userId=xxx&productId=xxx`
   - 或者从之前发送的测试邮件中点击链接

3. **点击 Claim 按钮**
   - 在 Offer Landing Page 中，点击 **"Claim Offer Now"** 按钮

4. **返回 Dashboard**
   - 切换回 Dashboard 标签页
   - **应该立即看到**一个绿色的通知卡片出现在右下角
   - 通知显示：🎉 Conversion Alert、Campaign 名称、时间戳、用户邮箱

5. **验证控制台日志**
   - 在 Console 中，你应该看到：
   ```
   [Dashboard Auto-Send] Realtime event received for campaign abc-123: {...}
   [Dashboard Auto-Send] New conversion detected: campaign=abc-123, user=user-456
   [Dashboard Auto-Send] Notification added: {...}
   ```

---

## ✅ 完成检查清单

完成所有步骤后，请确认：

- [ ] ✅ SQL 脚本已成功执行（没有错误）
- [ ] ✅ 验证查询显示两个 ✅ 状态
- [ ] ✅ Supabase 项目已重启
- [ ] ✅ 浏览器控制台显示 "Successfully subscribed" 消息
- [ ] ✅ 点击 Claim 后，Dashboard 立即显示通知
- [ ] ✅ 通知在 10 秒后自动消失

---

## 🆘 如果遇到问题

### 问题 1：SQL 执行失败

**错误信息：** `permission denied` 或 `relation does not exist`

**解决方案：**
- 确认你使用的是项目的管理员账号
- 确认 `campaign_logs` 表已经存在
- 检查表名是否正确（区分大小写）

### 问题 2：验证查询显示 ❌

**解决方案：**
- 重新执行步骤 3（执行 enable-realtime.sql）
- 确认没有拼写错误
- 尝试手动执行每个 SQL 语句，看哪个失败了

### 问题 3：控制台显示 Channel Error

**解决方案：**
- 确认项目已重启（步骤 5）
- 等待 5 分钟后重试
- 检查网络连接是否正常
- 重新执行步骤 3 和步骤 5

### 问题 4：点击 Claim 后没有通知

**检查清单：**
- [ ] Campaign 状态是 Active 吗？
- [ ] 控制台显示 "Successfully subscribed" 吗？
- [ ] 浏览器控制台有错误信息吗？
- [ ] `campaignId`、`userId` 参数是否正确？
- [ ] Purchase 事件是否成功写入数据库？

**调试方法：**
1. 在控制台执行：
   ```javascript
   // 检查是否有 purchase 记录
   const { data } = await supabase
     .from('campaign_logs')
     .select('*')
     .eq('action_type', 'purchase')
     .order('created_at', { ascending: false })
     .limit(5);
   console.log('Recent purchases:', data);
   ```

2. 如果数据库中有 purchase 记录，但 Dashboard 没收到通知，说明 Realtime 订阅有问题，请重新执行步骤 3 和步骤 5。

---

## 📞 需要帮助？

如果按照以上步骤操作后仍然无法解决问题，请提供：

1. **SQL 执行结果截图**
2. **浏览器控制台的完整日志**（包括错误信息）
3. **验证查询的结果**
4. **你执行的具体步骤**

这样我可以更准确地帮你诊断问题。

---

## 🎉 完成！

如果所有步骤都成功完成，恭喜你！🎊

现在你的 Dashboard 应该能够实时接收 Purchase 事件的通知了。每当用户在 Offer Landing Page 点击 Claim 按钮时，Dashboard 会立即显示一个漂亮的航班滚动提示通知。

