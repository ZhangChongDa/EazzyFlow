# 🚀 快速启用 Supabase Realtime - 5 分钟搞定

## 📌 目标
让 Dashboard 能够实时接收 Purchase 事件通知

---

## ⚡ 快速步骤（5 步）

### 第 1 步：打开 Supabase SQL Editor

1. 访问：https://app.supabase.com/
2. 登录并选择你的项目
3. 点击左侧菜单的 **"SQL Editor"** 📝

---

### 第 2 步：复制并执行 SQL 代码

**复制下面的全部代码：**

```sql
-- 启用 Supabase Realtime（适用于 Supabase 托管环境）
-- 注意：不要创建 supabase_realtime 扩展，Supabase 平台已管理

-- 1. 确保 publication 存在（如果不存在则创建）
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
END $$;

-- 2. 将 campaign_logs 表添加到 publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'campaign_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE campaign_logs;
    END IF;
END $$;

-- 3. 验证（查看结果）
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**然后：**
1. 在 SQL Editor 中粘贴代码
2. 点击右下角 **"Run"** 按钮
3. 等待执行完成（几秒钟）

**✅ 成功标志：** 看到 `campaign_logs` 出现在结果表格中

---

### 第 3 步：重启 Supabase 项目 ⚠️ 重要！

1. 点击左侧菜单的 **"Settings"** ⚙️
2. 向下滚动找到 **"Restart Project"** 按钮
3. 点击重启
4. **等待 2-5 分钟**，项目会自动重启完成

---

### 第 4 步：测试订阅状态

1. **打开你的应用 Dashboard**
   - 例如：`http://localhost:5173/dashboard`

2. **打开浏览器控制台**
   - 按 `F12` 键
   - 点击 **"Console"** 标签

3. **刷新页面**
   - 按 `F5` 刷新 Dashboard

4. **查看日志**
   - 应该看到：`✅ [Dashboard Auto-Send] Successfully subscribed to campaign ...`
   - 如果看到 `❌ Channel error`，说明配置失败，请重新执行第 2-3 步

---

### 第 5 步：测试实时通知

1. **确保有一个 Active Campaign**
   - Dashboard 中至少有一个 Campaign 状态是 **"On"**

2. **打开 Offer Landing Page**
   - 从测试邮件中点击链接，或手动访问

3. **点击 "Claim Offer Now" 按钮**

4. **返回 Dashboard**
   - 应该立即看到右下角出现绿色通知卡片 🎉

---

## ✅ 完成检查

- [ ] SQL 执行成功（没有错误）
- [ ] Supabase 项目已重启
- [ ] 控制台显示 "Successfully subscribed"
- [ ] 点击 Claim 后，Dashboard 显示通知

---

## 🆘 如果失败

### 问题：控制台显示 `❌ Channel error`

**解决：**
1. 重新执行第 2 步（SQL 代码）
2. 重新执行第 3 步（重启项目）
3. 等待 5 分钟后重试

### 问题：点击 Claim 后没有通知

**检查：**
- Campaign 状态是 Active 吗？
- 控制台有 "Successfully subscribed" 吗？
- 浏览器控制台有错误吗？

---

## 📞 需要详细说明？

如果以上步骤不清楚，请查看：
- **详细版本**：`supabase/STEP-BY-STEP-REALTIME-SETUP.md`
- **配置指南**：`supabase/REALTIME-SETUP-GUIDE.md`

---

## 🎉 完成！

如果看到通知出现，恭喜你！Realtime 已经成功启用了！🎊

