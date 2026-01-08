# ⚠️ 已知问题报告

## 问题 1: 页面跳转 URL 改变但内容未更新

### 🐛 现象
- 点击 "View Report" → URL 变为 `http://localhost:3001/analytics`
- **但页面内容没有变化**，仍然停留在 Dashboard

### 🔍 根本原因

这是一个 **客户端路由 vs 服务器路由** 的问题。

**当前实现**:
```typescript
const handleNavigateToAnalytics = () => {
  if (onNavigate) {
    onNavigate('analytics');  // ✅ 正确：使用客户端路由
  } else {
    window.location.href = '/analytics';  // ❌ 错误：服务器重新加载
  }
};
```

**问题分析**:
1. `App.tsx` 使用 `ViewState` 枚举来控制显示哪个组件
2. `Dashboard` 组件没有收到 `onNavigate` prop
3. 因此走了 `else` 分支，使用 `window.location.href`
4. `window.location.href` 会触发**完整的页面重新加载**
5. 但是 `App.tsx` 的初始状态是 `ViewState.DASHBOARD`，所以刷新后又回到 Dashboard

**App.tsx 的路由逻辑**:
```typescript
const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);

// 根据 currentView 渲染不同组件
{currentView === ViewState.DASHBOARD && <Dashboard />}
{currentView === ViewState.ANALYTICS && <Analytics />}
{currentView === ViewState.CAMPAIGN_CANVAS && <CampaignCanvas />}
```

### ✅ 解决方案

**方案 1: 传递 `onNavigate` prop（推荐）**

修改 `App.tsx`:
```typescript
{currentView === ViewState.DASHBOARD && (
  <Dashboard 
    onNavigate={(view) => {
      // 将字符串映射到 ViewState
      const viewMap = {
        'analytics': ViewState.ANALYTICS,
        'campaign-canvas': ViewState.CAMPAIGN_CANVAS,
        'audience-studio': ViewState.AUDIENCE_STUDIO,
      };
      setCurrentView(viewMap[view] || ViewState.DASHBOARD);
    }}
  />
)}
```

**方案 2: 使用 React Router（更完善）**

已经引入了 `react-router-dom`，但只用于 `OfferLandingPage`。可以全面升级为真正的客户端路由。

```typescript
// App.tsx
<Routes>
  <Route path="/" element={<Dashboard />} />
  <Route path="/analytics" element={<Analytics />} />
  <Route path="/campaign-canvas" element={<CampaignCanvas />} />
  <Route path="/audience-studio" element={<AudienceStudio />} />
  <Route path="/offer/:campaignId/:userId/:productId" element={<OfferLandingPage />} />
</Routes>
```

然后在 Dashboard 中使用 `useNavigate`:
```typescript
import { useNavigate } from 'react-router-dom';

const navigate = useNavigate();
const handleNavigateToAnalytics = () => navigate('/analytics');
```

---

## 问题 2: Campaign Toggle 无法关闭 Active Campaign

### 🐛 现象
- 可以打开 Paused Campaign（变为 Active）
- **无法关闭 Active Campaign**（点击后没有反应）

### 🔍 根本原因

**当前实现**:
```typescript
const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  // ...
};
```

**问题分析**:

1. **数据库的 `status` 字段**是小写: `'active'`, `'paused'`, `'draft'`
2. **UI 显示的 `status` 字段**是大写: `'Active'`, `'Inactive'`, `'Paused'`

**数据转换发生在 `useCampaignFlightData.ts`**:
```typescript
let statusLabel: CampaignFlightMetric['status'] = 'Draft';
if (c.status === 'active') statusLabel = 'Active';      // ✅ 数据库 'active' → UI 'Active'
if (c.status === 'paused') statusLabel = 'Inactive';    // ✅ 数据库 'paused' → UI 'Inactive'
if (c.status === 'completed') statusLabel = 'Completed';
```

**问题在这里**:
```typescript
// Dashboard.tsx Line 279
onClick={() => handleToggleCampaignStatus(camp.id, camp.status)}
                                                      ^^^^^^^^
// camp.status 是 'Active' (UI 格式)

// Dashboard.tsx Line 83
const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
                    ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // 比较的是 'Active' === 'active' → false
  // 所以永远走 else 分支，newStatus 永远是 'active'
};
```

### ✅ 解决方案

**方案 1: 修改比较逻辑（推荐）**

```typescript
const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
  // ✅ 使用 toLowerCase() 或直接比较 UI 格式
  const newStatus = currentStatus.toLowerCase() === 'active' || currentStatus === 'Active' 
    ? 'paused' 
    : 'active';
  
  const { error } = await supabase
    .from('campaigns')
    .update({ status: newStatus })
    .eq('id', id);
  
  if (error) throw error;
  refreshCampaigns();
};
```

**方案 2: 在 Hook 中同时返回数据库状态**

修改 `useCampaignFlightData.ts`:
```typescript
return {
  id: c.id,
  name: c.name,
  status: statusLabel,      // UI 状态
  dbStatus: c.status,       // ✅ 数据库状态 (小写)
  reach: reachVal,
  conversion: convVal,
  spend: `$${estimatedSpend.toLocaleString()}`,
  roas: roasVal
};
```

然后在 Dashboard 中使用:
```typescript
onClick={() => handleToggleCampaignStatus(camp.id, camp.dbStatus)}
```

---

## 📋 问题优先级和处理建议

### 问题 1: 页面跳转
- **优先级**: 🔴 高
- **影响范围**: 所有导航功能
- **依赖**: 需要修改 `App.tsx` 的路由逻辑
- **建议**: 
  - 短期：传递 `onNavigate` prop 到所有页面组件
  - 长期：全面升级为 React Router

### 问题 2: Toggle 开关
- **优先级**: 🟡 中
- **影响范围**: Campaign Flight Board
- **依赖**: 只需修改 Dashboard.tsx
- **建议**: 立即修复（仅需一行代码）

---

## 🔧 立即可修复的问题

**问题 2 可以立即修复**（不影响其他页面）：

```typescript
// components/Dashboard.tsx Line 84
const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
  // ✅ 修复：支持 UI 格式的状态
  const isActive = currentStatus.toLowerCase() === 'active' || currentStatus === 'Active';
  const newStatus = isActive ? 'paused' : 'active';
  
  try {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: newStatus })
      .eq('id', id);
    
    if (error) throw error;
    refreshCampaigns();
  } catch (error) {
    console.error('Error updating campaign status:', error);
  }
};
```

---

## 📊 整体开发计划建议

### Phase 1: 路由系统重构（优先）
1. 全面启用 React Router
2. 移除 `ViewState` 枚举
3. 统一所有导航逻辑

### Phase 2: 状态管理规范化
1. 统一数据库状态和 UI 状态的转换
2. 创建 `StatusMapper` 工具类
3. 确保类型安全

### Phase 3: Dashboard 功能完善
1. 修复 Toggle 开关
2. 添加 Toast 通知
3. 添加加载状态

---

## ✅ 当前已完成的功能

尽管有上述问题，以下功能**已经工作**：

✅ Deep Dive Analysis → Chat 自动启动  
✅ New Campaign 按钮 → URL 改变（需要路由修复）  
✅ Toggle 开关 → 可以激活 Paused Campaign  
✅ Dropdown Menu → 显示和交互正常  
✅ ChatAssistant → 自动提示功能完美  

---

## 📝 需要记录的技术债务

1. **路由系统不一致**: 
   - `OfferLandingPage` 使用 React Router
   - 其他页面使用 `ViewState` 枚举
   - 需要统一

2. **状态命名不一致**: 
   - 数据库: `'active'` (小写)
   - UI: `'Active'` (大写)
   - 需要标准化

3. **缺少状态反馈**: 
   - Toggle 后没有 Toast 通知
   - 没有 Loading 状态
   - 需要 UX 改进

---

是否需要我立即修复 **问题 2 (Toggle 开关)**？这个修复只需改一行代码，不会影响其他页面。



