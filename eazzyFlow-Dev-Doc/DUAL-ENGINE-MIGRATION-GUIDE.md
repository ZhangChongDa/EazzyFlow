# 🚀 Dual-Engine AI Migration Guide

## 📋 迁移概览

Eazzy Flow 已成功从 Google Gemini 迁移到双引擎 AI 架构：
- **左脑 (Logic)**: DeepSeek V3/Reasoner via LangChain
- **右脑 (Vision)**: Fal.ai Flux.1

---

## ✅ 已完成的工作

### 1. 依赖安装 ✅
```bash
npm install @langchain/openai @langchain/core @fal-ai/client
```

### 2. 新增服务 ✅

#### `services/contextService.ts` - 数据摄取层
- 实时查询 Supabase 业务数据
- 提供格式化的系统状态上下文
- 作为 AI 的"眼睛"

#### `services/geminiService.ts` - 重构（保持文件名）
- **左脑**: DeepSeek 用于文本分析和推理
- **右脑**: Fal.ai 用于图像生成
- **兼容性**: 保持所有导出函数签名不变

### 3. UI 更新 ✅

#### `components/ChatAssistant.tsx`
- 集成实时数据获取
- 显示 "Analyzing data..." 状态
- 将实时上下文传递给 AI

---

## 🔧 环境变量配置

**必需添加**到 `.env` 文件：

```properties
# DeepSeek API (Left Brain)
VITE_DEEPSEEK_API_KEY=sk-xxxx
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com

# Fal.ai (Right Brain)
VITE_FAL_KEY_ID=xxxx-xxxx
```

**详细说明**: 查看 `ENV-SETUP-AI.md`

---

## 🔄 兼容性说明

### 向后兼容 ✅

所有现有代码**无需修改**即可工作：

1. **`chatWithCopilot`**:
   - 新签名: `chatWithCopilot(message, history, systemContext?)`
   - `systemContext` 是可选参数
   - 现有调用仍然有效

2. **`generateMarketingCopy`**:
   - 签名保持不变
   - 现在使用 DeepSeek 而不是 Gemini

3. **`editImage`**:
   - 签名保持不变
   - 现在使用 Fal.ai 而不是 Gemini

### 使用位置

- ✅ `ChatAssistant.tsx` - 已更新（使用实时数据）
- ✅ `CampaignCanvas.tsx` - 无需修改（自动使用新实现）
- ✅ `ContentStudio.tsx` - 无需修改（自动使用新实现）

---

## 🧪 测试清单

### 基础功能测试
- [ ] Chat Assistant 可以正常打开
- [ ] 发送消息后显示 "Analyzing data..." 状态
- [ ] AI 回答包含实时业务数据
- [ ] 营销文案生成正常工作
- [ ] 图像编辑功能正常工作

### 数据集成测试
- [ ] 实时数据正确获取
- [ ] 上下文格式正确
- [ ] AI 能够理解并利用实时数据

### 错误处理测试
- [ ] API 密钥缺失时显示友好错误
- [ ] 网络错误时显示友好提示
- [ ] 数据库查询失败时优雅降级

---

## 📊 架构对比

### 之前 (Gemini)
```
User → ChatAssistant → geminiService → Google Gemini API
```

### 现在 (Dual-Engine)
```
User → ChatAssistant → contextService (获取实时数据)
                    ↓
              geminiService
                    ├─→ DeepSeek (Left Brain - Logic)
                    └─→ Fal.ai (Right Brain - Vision)
```

---

## 🎯 关键改进

1. **实时业务感知**: AI 现在基于实时数据回答
2. **双引擎架构**: 逻辑和视觉分离，各司其职
3. **滑动窗口**: 优化上下文管理，提高性能
4. **向后兼容**: 现有代码无需修改

---

## ⚠️ 注意事项

1. **API 密钥**: 必须配置 DeepSeek 和 Fal.ai 密钥
2. **数据库连接**: contextService 需要有效的 Supabase 连接
3. **用户认证**: 数据查询需要用户登录
4. **性能**: 首次查询可能需要几秒钟

---

## 🚀 下一步

1. 配置环境变量（参考 `ENV-SETUP-AI.md`）
2. 重启开发服务器
3. 测试所有功能
4. 根据需要进行调优

---

**迁移完成！** 🎉

