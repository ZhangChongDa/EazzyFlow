import React, { useState, useCallback } from 'react';
import { 
  ReactFlow, 
  Controls, 
  Background, 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Handle, 
  Position,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  Panel,
  useReactFlow
} from '@xyflow/react';
import { 
  Plus, Play, Zap, MessageSquare, Clock, ArrowRight, 
  Settings, Sparkles, Save, MousePointer2, Split, Bell, 
  CheckCircle2, RotateCcw, X, Trash2, Hand, Square, 
  Type, PenTool, Users, ShoppingBag, Wifi,
  Image as ImageIcon, Gift, Lock, Maximize2, Facebook, Linkedin, Instagram,
  MapPin, Hash, User, CreditCard, Filter
} from 'lucide-react';
import { Product, Coupon } from '../types';

// --- Types & Interfaces ---

type CampaignNodeData = {
  label: string;
  subLabel?: string; // Mini-label for summary
  icon?: any;
  category?: string; // For triggers: 'money', 'data', etc.
  
  // Segment Config
  baseSegment?: string;
  filters?: { id: string; attribute: string; operator: string; value: string }[];
  audienceSize?: number;
  
  // Trigger Config
  triggerType?: string; // 'balance', 'location', etc.
  operator?: string;
  threshold?: string | number;
  timeWindow?: string;
  
  // Action/Channel Config
  actionType?: string; // 'marketing', 'info'
  productId?: string;
  productName?: string;
  couponId?: string;
  couponName?: string;
  channelType?: string; // 'sms', 'push', 'email', 'whatsapp', 'facebook'
  messageContent?: string;
  aiContentTone?: string;
  
  // Logic Config
  // Refactored to support nested conditions
  branches?: { 
    id: string; 
    label: string; 
    conditions: { id: string; field: string; operator: string; value: string }[] 
  }[];
  
  // Wait Config
  waitType?: 'duration' | 'date'; // 'duration' (relative) or 'date' (absolute)
  durationValue?: number | string;
  durationUnit?: 'minutes' | 'hours' | 'days' | 'weeks';
  fixedDate?: string; // ISO string for absolute date
  enableWindow?: boolean;
  windowStart?: string;
  windowEnd?: string;
  
  isHighlight?: boolean;
  stats?: string | null;
  [key: string]: any;
};

interface CampaignCanvasProps {
  products: Product[];
  coupons: Coupon[];
}

// --- Custom Node Component ---

const CustomNode = ({ data, selected, type }: any) => {
  // Determine color scheme based on node type
  let colorClass = "bg-slate-500";
  let iconColor = "text-slate-600";
  let bgIcon = "bg-slate-100";
  let borderColor = "border-slate-200";

  switch (type) {
    case 'trigger':
      colorClass = "bg-amber-500";
      iconColor = "text-amber-600";
      bgIcon = "bg-amber-100";
      borderColor = selected ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200 hover:border-amber-300";
      break;
    case 'segment':
      colorClass = "bg-indigo-500";
      iconColor = "text-indigo-600";
      bgIcon = "bg-indigo-100";
      borderColor = selected ? "border-indigo-400 ring-2 ring-indigo-100" : "border-slate-200 hover:border-indigo-300";
      break;
    case 'action':
      colorClass = "bg-pink-500";
      iconColor = "text-pink-600";
      bgIcon = "bg-pink-100";
      borderColor = selected ? "border-pink-400 ring-2 ring-pink-100" : "border-slate-200 hover:border-pink-300";
      break;
    case 'channel':
      colorClass = "bg-emerald-500";
      iconColor = "text-emerald-600";
      bgIcon = "bg-emerald-100";
      borderColor = selected ? "border-emerald-400 ring-2 ring-emerald-100" : "border-slate-200 hover:border-emerald-300";
      break;
    case 'logic':
      colorClass = "bg-blue-500";
      iconColor = "text-blue-600";
      bgIcon = "bg-blue-100";
      borderColor = selected ? "border-blue-400 ring-2 ring-blue-100" : "border-slate-200 hover:border-blue-300";
      break;
    case 'wait':
      colorClass = "bg-slate-500";
      iconColor = "text-slate-600";
      bgIcon = "bg-slate-100";
      borderColor = selected ? "border-slate-400 ring-2 ring-slate-100" : "border-slate-200 hover:border-slate-300";
      break;
  }

  const Icon = data.icon || Zap;

  return (
    <div className={`w-64 bg-white rounded-xl shadow-sm border-2 transition-all duration-200 group ${borderColor}`}>
      {/* Input Handle - Not for Triggers (unless reconfigured) */}
      <Handle type="target" position={Position.Left} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !-ml-2 shadow-sm" />
      
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className={`p-2 rounded-lg ${bgIcon} ${iconColor} shadow-sm shrink-0`}>
            <Icon size={18} />
          </div>
          <div className="overflow-hidden">
            <span className={`text-[10px] font-bold uppercase tracking-wider block opacity-60 ${iconColor}`}>{type}</span>
            <p className="text-sm font-bold text-slate-900 leading-tight truncate">{data.label}</p>
          </div>
        </div>
        
        {/* Mini Label / Summary */}
        {(data.subLabel || data.config) && type !== 'wait' && type !== 'logic' && (
           <div className="mt-2 pt-2 border-t border-slate-100">
             <div className="inline-flex items-center px-2 py-1 rounded bg-slate-50 border border-slate-200 max-w-full">
               <span className="text-[10px] font-medium text-slate-600 truncate font-mono">
                 {data.subLabel || data.config}
               </span>
             </div>
           </div>
        )}
        
        {/* Segment Node Specific Summary */}
        {type === 'segment' && data.filters && data.filters.length > 0 && (
           <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              {data.filters.slice(0, 2).map((f: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                   <span className="font-bold text-slate-500">{f.attribute}</span>
                   <span className="text-slate-400 max-w-[60px] truncate">{f.operator === 'is' ? '=' : f.operator} {f.value}</span>
                </div>
              ))}
              {data.filters.length > 2 && (
                <div className="text-[9px] text-center text-slate-400 font-medium">+{data.filters.length - 2} more filters</div>
              )}
           </div>
        )}

        {/* Logic Node Branches Summary */}
        {type === 'logic' && data.branches && (
           <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              {data.branches.slice(0, 2).map((b: any, i: number) => {
                // Determine summary from first condition
                const firstCond = b.conditions?.[0];
                return (
                  <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                     <span className="font-bold text-slate-500">{b.label}</span>
                     <span className="text-slate-400 max-w-[60px] truncate">
                        {firstCond ? `${firstCond.operator} ${firstCond.value}` : 'No cond'}
                     </span>
                  </div>
                );
              })}
              {data.branches.length > 2 && (
                <div className="text-[9px] text-center text-slate-400 font-medium">+{data.branches.length - 2} more cases</div>
              )}
              <div className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100 opacity-70">
                 <span className="font-bold text-slate-400">ELSE</span>
                 <ArrowRight size={10} className="text-slate-300" />
              </div>
           </div>
        )}

        {/* Wait Node Summary */}
        {type === 'wait' && (
           <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
             <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <Clock size={12} className="text-slate-400" />
                {data.waitType === 'date' 
                   ? (data.fixedDate ? new Date(data.fixedDate).toLocaleDateString() : 'Select Date')
                   : `${data.durationValue || 0} ${data.durationUnit || 'hours'}`}
             </div>
             {data.enableWindow && (
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-purple-50 px-1.5 py-0.5 rounded inline-block">
                   <Sparkles size={10} className="text-purple-400" /> 
                   {data.windowStart} - {data.windowEnd}
                </div>
             )}
           </div>
        )}

        {/* Action Node Product Summary */}
        {type === 'action' && (data.productName || data.couponName) && (
           <div className="mt-2 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 p-1.5 bg-pink-50 rounded border border-pink-100">
                 {data.productName ? <ShoppingBag size={12} className="text-pink-500" /> : <Gift size={12} className="text-pink-500" />}
                 <span className="text-[10px] font-bold text-pink-700 truncate">{data.productName || data.couponName}</span>
              </div>
           </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !-mr-2 shadow-sm" />
    </div>
  );
};

const nodeTypes = {
  trigger: CustomNode,
  action: CustomNode,
  condition: CustomNode,
  logic: CustomNode,
  wait: CustomNode,
  segment: CustomNode,
  channel: CustomNode
};

// --- Custom Controls Component ---

const CanvasControls = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <Panel position="bottom-left" className="m-6 mb-20 pointer-events-auto z-10">
       <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden flex flex-col">
          <button type="button" onClick={() => zoomIn()} className="p-2 hover:bg-slate-50 border-b border-slate-100 text-slate-600 transition-colors" title="Zoom In"><Plus size={18} /></button>
          <button type="button" onClick={() => zoomOut()} className="p-2 hover:bg-slate-50 border-b border-slate-100 text-slate-600 transition-colors" title="Zoom Out"><div className="w-4 h-0.5 bg-current"></div></button>
          <button type="button" onClick={() => fitView()} className="p-2 hover:bg-slate-50 border-b border-slate-100 text-slate-600 transition-colors" title="Fit View"><Maximize2 size={18} /></button>
          <button type="button" onClick={() => {}} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors" title="Lock Canvas"><Lock size={18} /></button>
       </div>
    </Panel>
  );
};

// --- Initial Data ---

const INITIAL_NODES: Node[] = [
  { 
    id: '1', 
    type: 'segment', 
    position: { x: 50, y: 100 }, 
    data: { label: 'Target: Students', subLabel: 'Age < 25 AND Data > 500MB', icon: Users, filters: [] },
  },
  { 
    id: '2', 
    type: 'trigger', 
    position: { x: 350, y: 100 }, 
    data: { label: 'Low Data Balance', subLabel: 'Data < 50MB', icon: Wifi, category: 'data' },
  },
  { 
    id: '3', 
    type: 'logic', 
    position: { x: 650, y: 100 }, 
    data: { 
      label: 'Condition', 
      icon: Split,
      branches: [
        { 
          id: 'b1', 
          label: 'Case 1', 
          conditions: [
             { id: 'c1', field: 'Main Balance', operator: '>', value: '1000' }
          ]
        }
      ]
    },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 950, y: 0 },
    data: { label: 'Assign Benefit', subLabel: 'Bonus: 500MB', icon: Gift, actionType: 'marketing' }
  },
  {
    id: '5',
    type: 'action',
    position: { x: 950, y: 200 },
    data: { label: 'Offer: 1GB Night Pack', subLabel: 'Price: 500 Ks', icon: ShoppingBag, actionType: 'marketing' }
  }
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, label: 'True', style: { stroke: '#cbd5e1' } },
  { id: 'e3-5', source: '3', target: '5', animated: true, label: 'Else', style: { stroke: '#cbd5e1', strokeDasharray: '5,5' } },
];

// --- Main Component ---

const CampaignCanvas: React.FC<CampaignCanvasProps> = ({ products, coupons }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#cbd5e1' } }, eds)),
    [setEdges],
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  const updateNodeData = (id: string, newData: Partial<CampaignNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          // Special handlers to update labels based on config changes
          let extraUpdates = {};
          
          if (newData.productId) {
            const p = products.find(prod => prod.id === newData.productId);
            if (p) extraUpdates = { ...extraUpdates, productName: p.marketingName, subLabel: `Price: ${p.price} Ks` };
          }
          if (newData.couponId) {
            const c = coupons.find(coup => coup.id === newData.couponId);
            if (c) extraUpdates = { ...extraUpdates, couponName: c.name, subLabel: `Val: ${c.value}` };
          }
          
          return { ...node, data: { ...node.data, ...newData, ...extraUpdates } };
        }
        return node;
      })
    );
  };

  const deleteNode = (id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNodeId(null);
  };

  // Helper to add nodes from palette
  const addNode = (type: string, label: string, icon: any, data: any = {}) => {
    const id = (nodes.length + 1).toString();
    const newNode: Node = {
      id,
      type,
      position: { x: 100, y: 100 + (nodes.length * 50) },
      data: { label, icon, ...data },
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // --- Configuration Panels ---

  const renderConfigurationPanel = () => {
    if (!selectedNode) return null;
    const data = selectedNode.data as unknown as CampaignNodeData;

    return (
      <div className="absolute right-6 top-6 w-96 bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-48px)] animate-in slide-in-from-right duration-300 overflow-hidden z-20">
        {/* Header */}
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <div className="flex items-center gap-2 text-slate-700">
             <Settings size={18} />
             <h3 className="font-bold text-sm uppercase tracking-wide">
               Config: {selectedNode.type}
             </h3>
          </div>
          <button onClick={() => setSelectedNodeId(null)} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          
          {/* Common: Label */}
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Label / Name</label>
            <input 
              type="text" 
              className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-indigo-100 outline-none"
              value={data.label}
              onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
            />
          </div>

          {/* 1. Segment Config (Enhanced) */}
          {selectedNode.type === 'segment' && (
            <div className="space-y-6">
               {/* Base Segment */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Base Audience Source</label>
                  <select 
                     className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                     value={data.baseSegment || 'all'}
                     onChange={(e) => updateNodeData(selectedNode.id, { baseSegment: e.target.value })}
                  >
                     <option value="all">All Subscribers (Entire Base)</option>
                     <option value="segment_churn">High Churn Risk (AI)</option>
                     <option value="segment_high_value">High Value / VVIP</option>
                     <option value="segment_students">Students & Youth</option>
                     <option value="segment_inactive">Inactive (30 Days)</option>
                  </select>
               </div>

               {/* Advanced Filters */}
               <div>
                  <div className="flex justify-between items-center mb-2">
                     <label className="block text-xs font-bold text-slate-500 uppercase">Ad-hoc Filtering</label>
                     <button 
                       onClick={() => {
                          const newFilters = [...(data.filters || []), { id: Date.now().toString(), attribute: 'Tier', operator: 'is', value: 'Gold' }];
                          updateNodeData(selectedNode.id, { filters: newFilters });
                       }}
                       className="text-[10px] flex items-center gap-1 font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded hover:bg-indigo-100 transition-colors"
                     >
                       <Plus size={10} /> Add Filter
                     </button>
                  </div>
                  
                  <div className="space-y-2">
                     {(data.filters || []).map((filter: any, idx: number) => (
                       <div key={filter.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 group relative shadow-sm">
                          <div className="absolute -left-0.5 top-0 bottom-0 w-1 bg-indigo-400 rounded-l-lg"></div>
                          <button 
                            onClick={() => {
                               const newFilters = data.filters!.filter((f: any) => f.id !== filter.id);
                               updateNodeData(selectedNode.id, { filters: newFilters });
                            }}
                            className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>

                          <div className="grid grid-cols-1 gap-2 pl-2">
                             {/* Attribute Select */}
                             <div className="flex gap-2">
                               <select 
                                 className="w-2/3 p-1.5 bg-white border border-slate-200 rounded text-xs font-medium text-slate-700 outline-none focus:ring-1 focus:ring-indigo-200"
                                 value={filter.attribute}
                                 onChange={(e) => {
                                    const newFilters = [...data.filters!];
                                    newFilters[idx].attribute = e.target.value;
                                    // Reset value based on type
                                    if(e.target.value === 'Tier') newFilters[idx].value = 'Gold';
                                    if(e.target.value === 'UserType') newFilters[idx].value = 'Prepaid';
                                    if(e.target.value === 'Location') newFilters[idx].value = 'Yangon';
                                    updateNodeData(selectedNode.id, { filters: newFilters });
                                 }}
                               >
                                 <option value="Tier">Loyalty Tier</option>
                                 <option value="UserType">User Type</option>
                                 <option value="Location">Region / City</option>
                                 <option value="Gender">Gender</option>
                                 <option value="Age">Age Range</option>
                               </select>
                               <select 
                                 className="w-1/3 p-1.5 bg-white border border-slate-200 rounded text-xs text-slate-500 outline-none"
                                 value={filter.operator}
                                 onChange={(e) => {
                                    const newFilters = [...data.filters!];
                                    newFilters[idx].operator = e.target.value;
                                    updateNodeData(selectedNode.id, { filters: newFilters });
                                 }}
                               >
                                 <option value="is">Is</option>
                                 <option value="is_not">Is Not</option>
                               </select>
                             </div>

                             {/* Value Select/Input */}
                             <div>
                                {filter.attribute === 'Tier' && (
                                   <div className="flex flex-wrap gap-1">
                                      {['Crown', 'Diamond', 'Platinum', 'Gold', 'Silver'].map(t => (
                                         <button 
                                           key={t}
                                           onClick={() => {
                                              const newFilters = [...data.filters!];
                                              newFilters[idx].value = t;
                                              updateNodeData(selectedNode.id, { filters: newFilters });
                                           }}
                                           className={`px-2 py-1 text-[10px] rounded border transition-colors ${filter.value === t ? 'bg-indigo-100 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                         >
                                           {t}
                                         </button>
                                      ))}
                                   </div>
                                )}
                                {filter.attribute === 'UserType' && (
                                   <div className="flex gap-2">
                                      {['Prepaid', 'Postpaid'].map(t => (
                                         <button 
                                           key={t}
                                           onClick={() => {
                                              const newFilters = [...data.filters!];
                                              newFilters[idx].value = t;
                                              updateNodeData(selectedNode.id, { filters: newFilters });
                                           }}
                                           className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filter.value === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                         >
                                           {t}
                                         </button>
                                      ))}
                                   </div>
                                )}
                                {filter.attribute === 'Location' && (
                                   <select 
                                     className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs outline-none"
                                     value={filter.value}
                                     onChange={(e) => {
                                        const newFilters = [...data.filters!];
                                        newFilters[idx].value = e.target.value;
                                        updateNodeData(selectedNode.id, { filters: newFilters });
                                     }}
                                   >
                                      <option value="Yangon">Yangon</option>
                                      <option value="Mandalay">Mandalay</option>
                                      <option value="Nay Pyi Taw">Nay Pyi Taw</option>
                                      <option value="Bago">Bago</option>
                                      <option value="Shan">Shan State</option>
                                   </select>
                                )}
                                {filter.attribute === 'Gender' && (
                                   <div className="flex gap-2">
                                      {['Male', 'Female'].map(t => (
                                         <button 
                                           key={t}
                                           onClick={() => {
                                              const newFilters = [...data.filters!];
                                              newFilters[idx].value = t;
                                              updateNodeData(selectedNode.id, { filters: newFilters });
                                           }}
                                           className={`flex-1 py-1.5 text-xs rounded border transition-colors ${filter.value === t ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                         >
                                           {t}
                                         </button>
                                      ))}
                                   </div>
                                )}
                                {filter.attribute === 'Age' && (
                                   <input 
                                     type="text" 
                                     className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs outline-none focus:border-indigo-300"
                                     placeholder="e.g. 18-24"
                                     value={filter.value}
                                     onChange={(e) => {
                                        const newFilters = [...data.filters!];
                                        newFilters[idx].value = e.target.value;
                                        updateNodeData(selectedNode.id, { filters: newFilters });
                                     }}
                                   />
                                )}
                             </div>
                          </div>
                       </div>
                     ))}
                     
                     {(data.filters?.length === 0 || !data.filters) && (
                        <div className="p-4 border-2 border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs">
                           No additional filters applied.
                        </div>
                     )}
                  </div>
               </div>
               
               {/* Real-time Audience Estimation */}
               <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Reach</span>
                     <span className="p-1 bg-emerald-100 rounded text-emerald-600">
                        <Users size={14} />
                     </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                     <span className="text-2xl font-bold text-emerald-900">
                        {(15400 - ((data.filters?.length || 0) * 1250)).toLocaleString()}
                     </span>
                     <span className="text-xs font-medium text-emerald-700">Users</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
                     <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(10, 100 - ((data.filters?.length || 0) * 15))}%` }}></div>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1.5 text-right">Updated just now</p>
               </div>
            </div>
          )}

          {/* 2. Trigger Config */}
          {selectedNode.type === 'trigger' && (
            <div className="space-y-4">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Trigger Category</label>
                 <div className="grid grid-cols-3 gap-2">
                    {['Money', 'Data', 'Voice', 'Location', 'App'].map(cat => (
                      <button 
                        key={cat}
                        onClick={() => updateNodeData(selectedNode.id, { category: cat.toLowerCase() })}
                        className={`text-xs py-2 rounded-lg border font-medium transition-all ${
                          data.category === cat.toLowerCase() 
                          ? 'bg-amber-50 border-amber-200 text-amber-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Operator</label>
                   <select 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                      value={data.operator || '<'}
                      onChange={(e) => updateNodeData(selectedNode.id, { operator: e.target.value })}
                   >
                     <option value="<">Less than (&lt;)</option>
                     <option value=">">Greater than (&gt;)</option>
                     <option value="=">Equals (=)</option>
                     <option value="change">Changes By %</option>
                   </select>
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Threshold</label>
                   <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">$</span>
                      <input 
                        type="number"
                        className="w-full pl-7 p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                        value={data.threshold || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { threshold: e.target.value, subLabel: `Bal ${data.operator || '<'} $${e.target.value}` })}
                      />
                   </div>
                 </div>
              </div>
            </div>
          )}

          {/* 3. Action Config (Updated with Products/Coupons) */}
          {selectedNode.type === 'action' && (
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Action Type</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                     <button 
                       onClick={() => updateNodeData(selectedNode.id, { actionType: 'marketing' })}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.actionType === 'marketing' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
                     >
                       Marketing / Sales
                     </button>
                     <button 
                       onClick={() => updateNodeData(selectedNode.id, { actionType: 'info' })}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.actionType === 'info' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-500'}`}
                     >
                       Informational
                     </button>
                  </div>
               </div>

               {/* Product / Coupon Selector */}
               {data.actionType === 'marketing' && (
                 <>
                   <div className="space-y-3 p-3 bg-pink-50/50 rounded-lg border border-pink-100">
                      <label className="block text-xs font-bold text-pink-700 uppercase">Select Offer Item</label>
                      
                      {/* Product Select */}
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">From Product Catalog</span>
                        <select 
                          className="w-full p-2 bg-white border border-pink-200 rounded text-sm text-slate-700 outline-none focus:ring-2 focus:ring-pink-200"
                          value={data.productId || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { productId: e.target.value, couponId: '' })}
                        >
                          <option value="">-- Select Product --</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id}>{p.marketingName} ({p.price} Ks)</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="h-px bg-pink-200 flex-1"></div>
                        <span className="text-[10px] text-pink-400 font-bold">OR</span>
                        <div className="h-px bg-pink-200 flex-1"></div>
                      </div>

                      {/* Coupon Select */}
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">From Coupon Center</span>
                        <select 
                          className="w-full p-2 bg-white border border-pink-200 rounded text-sm text-slate-700 outline-none focus:ring-2 focus:ring-pink-200"
                          value={data.couponId || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { couponId: e.target.value, productId: '' })}
                        >
                          <option value="">-- Select Coupon --</option>
                          {coupons.map(c => (
                            <option key={c.id} value={c.id}>{c.name} ({c.value})</option>
                          ))}
                        </select>
                      </div>
                   </div>
                 </>
               )}

               {data.actionType === 'info' && (
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notification Message</label>
                    <textarea 
                      rows={3}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                      placeholder="Enter message text..."
                      value={data.messageContent || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { messageContent: e.target.value })}
                    />
                 </div>
               )}
            </div>
          )}

          {/* 4. Logic Node Config (Refactored for Nested Conditions) */}
          {selectedNode.type === 'logic' && (
             <div className="space-y-4">
               <div className="flex justify-between items-center">
                 <label className="block text-xs font-bold text-slate-500 uppercase">Branch Conditions</label>
                 <button 
                    onClick={() => {
                        const newBranches = [...(data.branches || []), { 
                          id: `b${Date.now()}`, 
                          label: `Case ${(data.branches?.length || 0) + 1}`, 
                          conditions: [{ id: `c${Date.now()}`, field: 'Main Balance', operator: '>', value: '0' }]
                        }];
                        updateNodeData(selectedNode.id, { branches: newBranches });
                    }}
                    className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                 >
                   + Add Case
                 </button>
               </div>
               
               <div className="space-y-3">
                 {(data.branches || []).map((branch: any, bIdx: number) => (
                   <div key={branch.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group transition-colors hover:border-blue-200">
                      <div className="flex justify-between items-center mb-2">
                        <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 rounded border border-blue-200">
                          {branch.label}
                        </span>
                        <button 
                          onClick={() => {
                              const newBranches = data.branches!.filter((b: any) => b.id !== branch.id);
                              updateNodeData(selectedNode.id, { branches: newBranches });
                          }}
                          className="text-slate-300 hover:text-red-500"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="space-y-2">
                         {(branch.conditions || []).map((cond: any, cIdx: number) => (
                            <div key={cond.id} className="relative group/cond">
                               {cIdx > 0 && <div className="text-[10px] text-center text-slate-400 font-bold my-1">- AND -</div>}
                               <div className="flex gap-2">
                                 <input 
                                   type="text" 
                                   className="w-1/2 p-2 text-xs bg-white border border-slate-200 rounded font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 placeholder:text-slate-400" 
                                   placeholder="Field" 
                                   value={cond.field} 
                                   onChange={(e) => {
                                      const newBranches = [...data.branches!];
                                      newBranches[bIdx].conditions[cIdx].field = e.target.value;
                                      updateNodeData(selectedNode.id, { branches: newBranches });
                                   }}
                                 />
                                 <select 
                                   className="w-1/2 p-2 text-xs bg-white border border-slate-200 rounded font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-700" 
                                   value={cond.operator}
                                   onChange={(e) => {
                                      const newBranches = [...data.branches!];
                                      newBranches[bIdx].conditions[cIdx].operator = e.target.value;
                                      updateNodeData(selectedNode.id, { branches: newBranches });
                                   }}
                                 >
                                   <option value=">">Greater than</option>
                                   <option value="<">Less than</option>
                                   <option value="=">Equals</option>
                                   <option value="contains">Contains</option>
                                 </select>
                               </div>
                               <div className="flex gap-2 mt-2">
                                 <input 
                                   type="text" 
                                   className="w-full p-2 text-xs bg-white border border-slate-200 rounded font-mono font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 placeholder:text-slate-400" 
                                   value={cond.value} 
                                   onChange={(e) => {
                                      const newBranches = [...data.branches!];
                                      newBranches[bIdx].conditions[cIdx].value = e.target.value;
                                      updateNodeData(selectedNode.id, { branches: newBranches });
                                   }}
                                 />
                                  {branch.conditions.length > 1 && (
                                    <button 
                                      onClick={() => {
                                          const newBranches = [...data.branches!];
                                          newBranches[bIdx].conditions = newBranches[bIdx].conditions.filter((c: any) => c.id !== cond.id);
                                          updateNodeData(selectedNode.id, { branches: newBranches });
                                      }}
                                      className="p-2 text-slate-300 hover:text-red-500"
                                    >
                                       <Trash2 size={14} />
                                    </button>
                                  )}
                               </div>
                            </div>
                         ))}
                         
                         <button 
                           onClick={() => {
                             const newBranches = [...data.branches!];
                             newBranches[bIdx].conditions.push({ id: `c${Date.now()}`, field: 'Amount', operator: '>', value: '0' });
                             updateNodeData(selectedNode.id, { branches: newBranches });
                           }}
                           className="w-full py-1.5 mt-2 text-[10px] text-blue-600 bg-blue-50/50 border border-dashed border-blue-200 rounded hover:bg-blue-50 transition-colors font-medium"
                         >
                           + Add Condition (AND)
                         </button>
                      </div>
                   </div>
                 ))}
                 
                 {/* ELSE Block */}
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 opacity-80">
                    <span className="text-xs font-bold text-slate-500">ELSE</span>
                    <p className="text-[10px] text-slate-400 mt-1">Default path if no conditions met.</p>
                 </div>
               </div>
             </div>
          )}

          {/* 5. Wait Node Config */}
          {selectedNode.type === 'wait' && (
             <div className="space-y-5">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                   <button 
                     onClick={() => updateNodeData(selectedNode.id, { waitType: 'duration' })}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.waitType !== 'date' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                   >
                     Relative Duration
                   </button>
                   <button 
                     onClick={() => updateNodeData(selectedNode.id, { waitType: 'date' })}
                     className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.waitType === 'date' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
                   >
                     Specific Date
                   </button>
                </div>

                {data.waitType === 'date' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Resume On</label>
                    <input 
                      type="datetime-local" 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                      value={data.fixedDate || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { fixedDate: e.target.value })}
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                     <div className="flex gap-2">
                        <input 
                          type="number" 
                          className="w-24 p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                          placeholder="0"
                          value={data.durationValue || ''}
                          onChange={(e) => updateNodeData(selectedNode.id, { durationValue: e.target.value })}
                        />
                        <select 
                          className="flex-1 p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                          value={data.durationUnit || 'hours'}
                          onChange={(e) => updateNodeData(selectedNode.id, { durationUnit: e.target.value as any })}
                        >
                          <option value="minutes">Minutes</option>
                          <option value="hours">Hours</option>
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                        </select>
                     </div>

                     {/* Quiet Hours / Window */}
                     <div className="pt-2 border-t border-slate-100">
                        <label className="flex items-center gap-2 cursor-pointer mb-2">
                          <input 
                            type="checkbox" 
                            checked={!!data.enableWindow}
                            onChange={(e) => updateNodeData(selectedNode.id, { enableWindow: e.target.checked })}
                            className="rounded text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-sm font-medium text-slate-700">Delivery Window (Quiet Hours)</span>
                        </label>
                        
                        {data.enableWindow && (
                          <div className="grid grid-cols-2 gap-2 pl-6 animate-in slide-in-from-top-2">
                             <input 
                               type="time" 
                               className="p-2 border border-slate-200 rounded text-sm" 
                               value={data.windowStart || '09:00'}
                               onChange={(e) => updateNodeData(selectedNode.id, { windowStart: e.target.value })}
                             />
                             <input 
                               type="time" 
                               className="p-2 border border-slate-200 rounded text-sm"
                               value={data.windowEnd || '21:00'}
                               onChange={(e) => updateNodeData(selectedNode.id, { windowEnd: e.target.value })}
                             />
                          </div>
                        )}
                     </div>
                  </div>
                )}
             </div>
          )}

          {/* 6. Channel Config */}
          {selectedNode.type === 'channel' && (
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Channel Selection</label>
                  <div className="grid grid-cols-3 gap-2">
                     {['SMS', 'Push', 'Email', 'WhatsApp', 'Facebook', 'LinkedIn'].map(ch => (
                       <button 
                         key={ch}
                         onClick={() => updateNodeData(selectedNode.id, { channelType: ch })}
                         className={`py-2 text-xs font-bold rounded border transition-all ${
                           data.channelType === ch 
                           ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                           : 'bg-white border-slate-200 text-slate-600'
                         }`}
                       >
                         {ch}
                       </button>
                     ))}
                  </div>
               </div>
               
               {/* AI Content Engine */}
               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                     <Sparkles size={14} className="text-indigo-600" />
                     <h4 className="text-xs font-bold text-indigo-800 uppercase">AI Content Engine</h4>
                  </div>
                  <textarea 
                    className="w-full p-2 bg-white/80 border border-indigo-100 rounded text-sm resize-none focus:bg-white transition-colors"
                    rows={4}
                    placeholder="AI generated copy will appear here based on selected Product..."
                  ></textarea>
                  <div className="flex justify-between items-center mt-2">
                     <span className="text-[10px] text-slate-400">0/160 chars</span>
                     <div className="flex gap-2">
                       <button className="p-1.5 bg-white rounded border border-indigo-100 text-indigo-600 hover:text-indigo-800" title="Generate Image">
                         <ImageIcon size={14} />
                       </button>
                       <button className="px-3 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded shadow-sm hover:bg-indigo-700">
                         Auto-Generate
                       </button>
                     </div>
                  </div>
               </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          <button className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
             <CheckCircle2 size={18} /> Done
          </button>
          <button 
             onClick={() => deleteNode(selectedNode.id)}
             className="w-full flex justify-center items-center gap-2 bg-red-50 text-red-600 font-bold py-2.5 rounded-lg hover:bg-red-100 transition-colors border border-red-100"
          >
             <Trash2 size={18} /> Delete Node
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full relative flex bg-slate-50">
      <ReactFlowProvider>
        <div className="flex-1 h-full relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
            snapToGrid
            defaultEdgeOptions={{ type: 'smoothstep', animated: true, style: { strokeWidth: 2, stroke: '#cbd5e1' } }}
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#e2e8f0" gap={20} size={1} />
            
            {/* Left Floating Toolbar */}
            <Panel position="top-left" className="m-6 ml-6">
              <div 
                className="bg-white rounded-2xl shadow-xl border border-slate-200 p-2 flex flex-col gap-2 relative group"
                onMouseEnter={() => setIsPaletteOpen(true)}
                onMouseLeave={() => setIsPaletteOpen(false)}
              >
                 <button className="p-2 rounded-xl bg-slate-100 text-indigo-600 hover:bg-indigo-50"><MousePointer2 size={20} /></button>
                 <button className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50"><Hand size={20} /></button>
                 <div className="h-px bg-slate-100 w-full my-1"></div>
                 <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Plus size={20} /></button>
                 <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Square size={20} /></button>
                 <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><Type size={20} /></button>
                 <button className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"><PenTool size={20} /></button>

                 {/* Collapsible Node Palette */}
                 {isPaletteOpen && (
                   <div className="absolute left-full top-0 ml-4 w-64 bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-slate-200 p-4 animate-in slide-in-from-left-2 duration-200 z-50">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Node Palette</h4>
                      
                      <div className="space-y-4">
                         <div>
                            <p className="text-[10px] font-bold text-slate-500 mb-2">TRIGGERS</p>
                            <div className="space-y-2">
                               <button onClick={() => addNode('trigger', 'Event Trigger', Zap)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100 group transition-all">
                                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded"><Zap size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">Event Trigger</span>
                               </button>
                               <button onClick={() => addNode('trigger', 'Schedule', Clock)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 group transition-all">
                                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded"><Clock size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">Schedule</span>
                               </button>
                            </div>
                         </div>
                         
                         <div>
                            <p className="text-[10px] font-bold text-slate-500 mb-2">LOGIC</p>
                            <div className="space-y-2">
                               <button onClick={() => addNode('logic', 'Condition Split', Split)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 group transition-all">
                                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Split size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">Condition Split</span>
                               </button>
                               <button onClick={() => addNode('wait', 'Wait Duration', Clock)} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 group transition-all">
                                  <div className="p-1.5 bg-slate-100 text-slate-600 rounded"><RotateCcw size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">Wait Duration</span>
                               </button>
                            </div>
                         </div>

                         <div>
                            <p className="text-[10px] font-bold text-slate-500 mb-2">ACTIONS</p>
                            <div className="space-y-2">
                               <button onClick={() => addNode('action', 'SMS / Message', MessageSquare, { actionType: 'info' })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 group transition-all">
                                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded"><MessageSquare size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">SMS / Message</span>
                               </button>
                               <button onClick={() => addNode('action', 'Offer Push', Bell, { actionType: 'marketing' })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 group transition-all">
                                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded"><Bell size={14} /></div>
                                  <span className="text-sm font-medium text-slate-700">App Push</span>
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>
                 )}
              </div>
            </Panel>

            <CanvasControls />

            <Controls showInteractive={false} className="!hidden" />
          </ReactFlow>

          {/* Right Floating Configuration Panel */}
          {renderConfigurationPanel()}

          {/* Top Header Overlay */}
          <div className="absolute top-6 left-24 right-6 flex justify-between items-center pointer-events-none">
             <div className="pointer-events-auto flex items-center gap-4">
                <h1 className="text-2xl font-bold text-slate-900">Campaign Canvas</h1>
                <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded">Draft Mode</span>
             </div>
             <div className="pointer-events-auto flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 font-bold rounded-lg hover:bg-indigo-100 border border-indigo-200 transition-colors">
                  <Sparkles size={16} /> AI Copilot
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors">
                  <Play size={16} /> Simulate
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
                  <Save size={16} /> Activate
                </button>
             </div>
          </div>
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default CampaignCanvas;