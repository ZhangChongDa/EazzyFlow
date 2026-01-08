# 🐛 Bug Fix Report - Campaign Canvas Persistence & Simulation

## 📋 问题描述

### 问题 1: Save Error - Not-null constraint
**错误信息**: `Not-null constraint violation`  
**原因**: 创建新 campaign 时，数据库需要显式的 `id` 字段，但代码未提供  
**影响**: 无法保存新的 campaign

### 问题 2: Simulation Error - Foreign key violation
**错误信息**: `Foreign key violation`  
**原因**: 模拟时使用临时 ID `sim-${Date.now()}`，该 ID 在数据库中不存在  
**影响**: 无法模拟未保存的 campaign

---

## ✅ 修复方案

### Fix 1: 客户端 UUID 生成 (`useCampaignPersistence.ts`)

**修改内容**:
1. 添加 `generateUUID()` 函数，使用 `crypto.randomUUID()` 生成 UUID
2. 在 `saveCampaign` 中，如果 `campaignId` 为 null，自动生成 UUID
3. 在 insert payload 中明确包含 `id` 字段

**代码变更**:
```typescript
// ✅ 新增 UUID 生成函数
const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// ✅ 在 saveCampaign 中使用
const finalId = campaignId || generateUUID();
const campaignData: any = {
  id: finalId, // 明确包含 ID
  // ... 其他字段
};
```

---

### Fix 2: 模拟前自动保存 (`CampaignCanvas.tsx`)

**修改内容**:
1. 在 `handleSimulate` 中检查 `campaignId` 是否有效
2. 如果无效（null 或 `sim-` 开头），先调用 `saveCampaign` 获取真实 ID
3. 使用真实 ID 进行模拟

**代码变更**:
```typescript
// ✅ 检查并保存 campaign
let activeId = campaignId;

if (!activeId || activeId.startsWith('sim-')) {
  // 显示保存提示
  setToastMessage({ 
    type: 'success', 
    message: 'Saving campaign before simulation...' 
  });

  // 先保存获取真实 ID
  const saveResult = await saveCampaign(null, nodes, edges, undefined, 'draft');
  
  if (!saveResult.success || !saveResult.campaignId) {
    // 处理错误
    return;
  }

  // 更新状态
  activeId = saveResult.campaignId;
  setCampaignId(activeId);
  updateUrlWithCampaignId(activeId);
}

// 使用真实 ID 模拟
const result = await simulateCampaign(activeId, criteria, offerName);
```

---

### Fix 3: 类型定义冲突修复

**修改内容**:
- 删除 `CampaignCanvas.tsx` 中本地的 `SegmentCriteria` 类型定义
- 使用从 `useAudienceEstimator` hook 导入的类型

**代码变更**:
```typescript
// ❌ 删除本地定义
// type SegmentCriteria = { ... };

// ✅ 使用导入的类型
import { useAudienceEstimator, SegmentCriteria } from '../hooks/useAudienceEstimator';
```

---

## 🧪 测试验证

### 测试场景 1: 保存新 Campaign
1. ✅ 打开 Campaign Canvas
2. ✅ 创建新的 flow（未保存）
3. ✅ 点击 "Save Campaign"
4. ✅ 验证：campaign 成功保存，URL 更新，Toast 显示成功消息

### 测试场景 2: 模拟未保存的 Campaign
1. ✅ 打开 Campaign Canvas
2. ✅ 创建新的 flow（未保存）
3. ✅ 配置 Segment 和 Action Node
4. ✅ 点击 "Simulate"
5. ✅ 验证：
   - 显示 "Saving campaign before simulation..." toast
   - Campaign 自动保存
   - 模拟成功执行
   - Toast 显示模拟结果

### 测试场景 3: 模拟已保存的 Campaign
1. ✅ 打开已保存的 Campaign
2. ✅ 点击 "Simulate"
3. ✅ 验证：直接模拟，无需先保存

---

## 📁 修改的文件

1. ✅ `hooks/useCampaignPersistence.ts`
   - 添加 `generateUUID()` 函数
   - 修改 `saveCampaign()` 逻辑，自动生成 UUID

2. ✅ `components/CampaignCanvas.tsx`
   - 修改 `handleSimulate()` 逻辑，模拟前自动保存
   - 删除重复的 `SegmentCriteria` 类型定义

---

## 🎯 技术亮点

### 1. UUID 生成策略
- **优先使用**: `crypto.randomUUID()` (现代浏览器原生 API)
- **降级方案**: 手动生成符合 UUID v4 标准的字符串
- **兼容性**: 支持所有现代浏览器

### 2. 用户体验优化
- **无缝流程**: 点击 "Simulate" 时自动保存，用户无感知
- **清晰反馈**: Toast 消息提示保存和模拟状态
- **错误处理**: 完善的错误提示和处理

### 3. 代码质量
- **类型安全**: 使用 TypeScript 严格类型
- **错误处理**: 完善的 try-catch 和错误消息
- **状态管理**: 正确更新 campaignId 和 URL

---

## ✅ 修复完成

所有错误已修复，功能正常工作：
- ✅ 可以保存新 campaign（自动生成 UUID）
- ✅ 可以模拟未保存的 campaign（自动保存后模拟）
- ✅ 可以模拟已保存的 campaign（直接模拟）
- ✅ 类型定义冲突已解决

**修复完成！** 🎉

