# 📧 Resend 域名验证和 Vercel 部署指南

## 🎯 核心概念

**重要理解：域名验证不是在代码中完成的，而是在 Resend 控制台完成的。**

代码只是：
1. 读取环境变量 `VITE_RESEND_VERIFIED_DOMAIN`
2. 如果设置了该变量，使用验证过的域名作为发件人
3. 如果没有设置，使用 `onboarding@resend.dev`（只能发送到注册邮箱）

---

## 📋 完整流程（3个独立步骤）

### 步骤 1: 在 Resend 控制台验证域名（一次性操作）

1. **访问 Resend 控制台**
   - 登录：https://resend.com/login
   - 进入：**Domains** 页面（https://resend.com/domains）

2. **添加域名**
   - 点击 **"Add Domain"**
   - 输入你的域名（例如：`teleflow.ai`）
   - 点击 **"Add"**

3. **配置 DNS 记录**
   Resend 会显示需要添加的 DNS 记录：
   - **SPF 记录**：`v=spf1 include:resend.com ~all`
   - **DKIM 记录**：Resend 会提供具体的值
   - **DMARC 记录**（可选但推荐）：`v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com`

4. **在域名注册商添加 DNS 记录**
   - 登录你的域名注册商（如 Cloudflare、GoDaddy、Namecheap 等）
   - 添加上述 DNS 记录
   - 等待 DNS 传播（通常 5-30 分钟）

5. **验证完成**
   - 返回 Resend 控制台
   - 点击 **"Verify"** 按钮
   - 等待验证通过（显示绿色 ✅）

---

### 步骤 2: 在 Vercel 配置环境变量（部署时）

1. **登录 Vercel**
   - 访问：https://vercel.com/dashboard
   - 选择你的项目

2. **添加环境变量**
   - 进入 **Settings** → **Environment Variables**
   - 添加以下变量：

   ```
   VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
   VITE_RESEND_VERIFIED_DOMAIN=teleflow.ai
   VITE_RESEND_REGISTERED_EMAIL=zhangchongda1@gmail.com
   ```

3. **重新部署**
   - 环境变量更改后，需要重新部署才能生效
   - 点击 **Deployments** → **Redeploy**

---

### 步骤 3: 代码自动使用验证过的域名

代码会自动检测环境变量：

```typescript
// services/emailService.ts (已实现)

const RESEND_VERIFIED_DOMAIN = import.meta.env.VITE_RESEND_VERIFIED_DOMAIN;
const isDomainVerified = !!RESEND_VERIFIED_DOMAIN;

// 自动选择发件人地址
const fromAddress = isDomainVerified
  ? `TeleFlow <noreply@${RESEND_VERIFIED_DOMAIN}>`  // ✅ 使用验证过的域名
  : 'TeleFlow <onboarding@resend.dev>';            // ⚠️ 只能发送到注册邮箱
```

---

## ✅ 验证域名后的效果

### 验证前（使用 onboarding@resend.dev）
- ❌ 只能发送到注册邮箱（zhangchongda1@gmail.com）
- ❌ 发送到其他邮箱会返回 403 错误
- ✅ 开发环境会自动降级到 Mock 模式（演示可继续）

### 验证后（使用验证过的域名）
- ✅ 可以发送到**任意邮箱地址**
- ✅ 无论在哪个环境（本地、Vercel、其他平台）都能正常工作
- ✅ 使用专业的发件人地址（noreply@yourdomain.com）

---

## 🔄 部署到 Vercel 的完整检查清单

### 部署前
- [ ] 在 Resend 控制台验证域名
- [ ] 确认 DNS 记录已正确配置
- [ ] 确认域名验证状态为 ✅ Verified

### 部署时
- [ ] 在 Vercel 添加 `VITE_RESEND_API_KEY`
- [ ] 在 Vercel 添加 `VITE_RESEND_VERIFIED_DOMAIN`（你的域名）
- [ ] 在 Vercel 添加 `VITE_RESEND_REGISTERED_EMAIL`（可选，用于开发环境提示）
- [ ] 重新部署项目

### 部署后
- [ ] 测试发送邮件到非注册邮箱
- [ ] 检查邮件是否成功发送
- [ ] 检查发件人地址是否为 `noreply@yourdomain.com`

---

## 🚨 常见问题

### Q1: 部署到 Vercel 后还是只能发送到注册邮箱？
**A:** 检查：
1. 是否在 Resend 控制台验证了域名？
2. 是否在 Vercel 设置了 `VITE_RESEND_VERIFIED_DOMAIN` 环境变量？
3. 是否重新部署了项目？

### Q2: 本地开发环境可以发送到任意邮箱吗？
**A:** 可以！只要：
1. 域名已在 Resend 验证
2. 本地 `.env` 文件设置了 `VITE_RESEND_VERIFIED_DOMAIN`
3. 重启开发服务器

### Q3: 验证域名需要付费吗？
**A:** Resend 的域名验证是**免费的**。但发送邮件有免费额度限制：
- 免费账户：每月 3,000 封邮件
- 超出后需要付费

### Q4: 可以使用子域名吗？
**A:** 可以！例如：
- 主域名：`teleflow.ai`
- 子域名：`mail.teleflow.ai` 或 `noreply.teleflow.ai`
- 在 Resend 中添加子域名并验证即可

---

## 📝 环境变量配置示例

### 本地开发 (.env)
```env
VITE_RESEND_API_KEY=re_xxxxxxxxxxxxx
VITE_RESEND_VERIFIED_DOMAIN=teleflow.ai
VITE_RESEND_REGISTERED_EMAIL=zhangchongda1@gmail.com
```

### Vercel 环境变量
```
VITE_RESEND_API_KEY = re_xxxxxxxxxxxxx
VITE_RESEND_VERIFIED_DOMAIN = teleflow.ai
VITE_RESEND_REGISTERED_EMAIL = zhangchongda1@gmail.com
```

---

## 🎯 总结

**关键点：**
1. ✅ **域名验证** = 在 Resend 控制台完成（不是代码）
2. ✅ **环境变量** = 在 Vercel 设置（告诉代码使用哪个域名）
3. ✅ **代码逻辑** = 自动检测并使用验证过的域名

**部署到 Vercel 后：**
- 如果设置了 `VITE_RESEND_VERIFIED_DOMAIN` → 可以发送到任意邮箱 ✅
- 如果没有设置 → 只能发送到注册邮箱 ⚠️

**无论部署在哪里（Vercel、本地、其他平台），只要：**
- 域名已在 Resend 验证 ✅
- 环境变量正确配置 ✅
- 就能发送到任意邮箱 ✅



