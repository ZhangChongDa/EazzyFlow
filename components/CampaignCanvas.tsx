import React, { useState, useCallback, useRef, useEffect } from 'react';
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
  MapPin, Hash, User, CreditCard, Filter, XCircle, Mail, MessageCircle, Smartphone, Globe, Send, Package, Award, Activity, Search,
  Calendar, Phone, DollarSign, AppWindow
} from 'lucide-react';
import { Product, Coupon } from '../types';
import { generateMarketingCopy } from '../services/geminiService';

// --- Types & Interfaces ---

type ChannelContentData = {
  subject?: string;     // Email
  text?: string;        // All
  image?: string;       // Social / Chat
  actionLabel?: string; // ChatBox
  actionUrl?: string;   // ChatBox
  ussdMenu?: string;    // USSD
};

type SegmentCriteria = {
  // Static
  ageMin?: string;
  ageMax?: string;
  gender?: string;
  city?: string;
  simType?: string;
  tier?: string;
  // Dynamic
  activityType?: string;      // 'Register' | 'Active' | 'Inactive' | 'Dormant'
  activityOperator?: string;  // '>' | '=' | '<='
  activityValue?: string;     // number of days
  arpu?: { min?: string; max?: string };
  balance?: { min?: string; max?: string };
  tags?: string[];
};

type TriggerConfig = {
  category?: 'topup' | 'data' | 'voice' | 'location' | 'app' | 'schedule';
  // Numeric Triggers (Topup, Data, Voice)
  operator?: string;
  threshold?: string | number;
  unit?: string;
  // Location
  locationName?: string;
  radius?: string; // km
  // Schedule (Combined with Location or standalone)
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  // App
  appName?: string;
  appUrl?: string;
  // Logic
  logicOperator?: 'AND' | 'OR';
};

type CampaignNodeData = {
  label: string;
  subLabel?: string; // Mini-label for summary
  icon?: any;
  
  // Trigger Config
  triggerConfig?: TriggerConfig;
  
  // Segment Config
  baseSegment?: string;
  segmentCriteria?: SegmentCriteria; // New structured criteria
  audienceSize?: number;
  
  // Action (Offer) Config
  actionType?: string; // 'marketing', 'info'
  offerCategory?: string; // 'telecom', 'device', 'points', 'coupon'
  productId?: string;
  productName?: string;
  couponId?: string;
  couponName?: string;
  messageContent?: string; // For informational actions
  
  // Multi-Channel Config
  selectedChannels?: string[]; // ['sms', 'email', 'facebook', etc.]
  channelContent?: Record<string, ChannelContentData>;
  aiContentTone?: string;
  
  // Logic Config
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

// --- Constants ---

const CHANNEL_DEFS: Record<string, { label: string, icon: any, color: string, bgColor: string }> = {
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-emerald-600', bgColor: 'bg-emerald-100' },
  email: { label: 'Email', icon: Mail, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  chatbox: { label: 'ChatBox', icon: MessageCircle, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  ussd: { label: 'USSD', icon: Hash, color: 'text-slate-600', bgColor: 'bg-slate-100' },
  push: { label: 'App Push', icon: Bell, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'text-blue-700', bgColor: 'bg-blue-100' },
  instagram: { label: 'Instagram', icon: Instagram, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  linkedin: { label: 'LinkedIn', icon: Linkedin, color: 'text-blue-800', bgColor: 'bg-blue-100' },
};

const MOCK_TAGS = [
  'Gamer', 'Student', 'Night Owl', 'High Data User', 'Roamer', 
  'Social Media', 'Music Lover', 'Sports Fan', 'Netflix User', 
  'Price Sensitive', 'Dual SIM', 'iPhone User', 'Android User'
];

const MOCK_APPS = [
  { name: 'Facebook', url: 'facebook.com', icon: Facebook },
  { name: 'Instagram', url: 'instagram.com', icon: Instagram },
  { name: 'YouTube', url: 'youtube.com', icon: Play },
  { name: 'TikTok', url: 'tiktok.com', icon: Smartphone },
  { name: 'Telegram', url: 'telegram.org', icon: MessageCircle },
  { name: 'Viber', url: 'viber.com', icon: Phone },
  { name: 'Mobile Legends', url: 'mobilelegends.com', icon: Zap },
];

const MOCK_LOCATIONS = [
  'Golden City', 'Myanmar Plaza', 'Shwedagon Pagoda', 'Sule Square', 
  'Junction City', 'Inya Lake', 'Yangon International Airport', 
  'Times City', 'Hledan Centre', 'St. John City Mall'
];

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
      // Action is now the "Offer/Strategy" node - Pink/Red theme for conversion focus
      colorClass = "bg-pink-500";
      iconColor = "text-pink-600";
      bgIcon = "bg-pink-100";
      borderColor = selected ? "border-pink-400 ring-2 ring-pink-100" : "border-slate-200 hover:border-pink-300";
      break;
    case 'channel':
      // Channel is execution - Emerald/Green theme
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
  const activeChannels = data.selectedChannels || (data.channelType ? [data.channelType.toLowerCase()] : []);

  // Helper to process segment criteria for display
  const getDisplayCriteria = (criteria: SegmentCriteria) => {
    const items = [];
    if (criteria.tier) items.push({ label: 'Tier', value: criteria.tier });
    if (criteria.city) items.push({ label: 'City', value: criteria.city });
    if (criteria.gender && criteria.gender !== 'All') items.push({ label: 'Gender', value: criteria.gender });
    if (criteria.simType && criteria.simType !== 'All') items.push({ label: 'SIM', value: criteria.simType });
    if (criteria.ageMin || criteria.ageMax) items.push({ label: 'Age', value: `${criteria.ageMin || '0'} - ${criteria.ageMax || '∞'}` });
    
    // Updated Activity Display
    if (criteria.activityType) {
        const opMap: Record<string, string> = { '>': '>', '=': '=', '<=': '≤', '>=': '≥', '<': '<' };
        const op = opMap[criteria.activityOperator || ''] || criteria.activityOperator || '';
        const val = criteria.activityValue || '?';
        items.push({ label: criteria.activityType, value: `${op} ${val}d` });
    }

    if (criteria.arpu?.min || criteria.arpu?.max) items.push({ label: 'ARPU', value: `>${criteria.arpu?.min || 0}` });
    if (criteria.balance?.min || criteria.balance?.max) items.push({ label: 'Bal', value: `>${criteria.balance?.min || 0}` });
    if (criteria.tags && criteria.tags.length > 0) items.push({ label: 'Tags', value: `${criteria.tags.length} selected` });
    return items;
  };

  // Helper to process Trigger config for display
  const getTriggerDisplay = (config: TriggerConfig) => {
    if (!config) return null;
    const cat = config.category || 'topup';
    
    if (cat === 'location') {
      return (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
             <span className="font-bold text-slate-500">Loc</span>
             <span className="text-slate-700 font-medium max-w-[120px] truncate">{config.locationName || 'Any'} ({config.radius || 0}km)</span>
          </div>
          {config.startDate && (
             <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
                <span className="font-bold text-slate-500">Time</span>
                <span className="text-slate-700 font-medium truncate">{config.startDate} - {config.endDate}</span>
             </div>
          )}
        </div>
      );
    }
    
    if (cat === 'app') {
      return (
        <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
           <span className="font-bold text-slate-500">App</span>
           <span className="text-slate-700 font-medium truncate">{config.appName || 'Any'}</span>
        </div>
      );
    }

    if (cat === 'schedule') {
        return (
          <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
             <span className="font-bold text-slate-500">Date</span>
             <span className="text-slate-700 font-medium truncate">{config.startDate} - {config.endDate}</span>
          </div>
        );
    }

    // Default Numeric (Topup, Data, Voice)
    const labelMap: any = { topup: 'Bal', data: 'Data', voice: 'Voice' };
    return (
      <div className="flex items-center justify-between text-[10px] bg-slate-50 px-2 py-1 rounded border border-slate-100">
         <span className="font-bold text-slate-500">{labelMap[cat] || cat}</span>
         <span className="text-slate-700 font-medium">
           {config.operator} {config.threshold} {config.unit}
         </span>
      </div>
    );
  };

  return (
    <div className={`w-64 bg-white rounded-xl shadow-sm border-2 transition-all duration-200 group ${borderColor}`}>
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
        
        {/* Segment Node Specific Summary - Updated Logic */}
        {type === 'segment' && data.segmentCriteria && (
           <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              {getDisplayCriteria(data.segmentCriteria).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                   <span className="font-bold text-slate-500 capitalize">{item.label}</span>
                   <span className="text-slate-400 max-w-[90px] truncate ml-1 font-medium">{item.value}</span>
                </div>
              ))}
              {getDisplayCriteria(data.segmentCriteria).length === 0 && (
                 <p className="text-[10px] text-slate-400 italic text-center py-1">No filters configured</p>
              )}
           </div>
        )}

        {/* Channel Node: Multi-Channel Icons */}
        {type === 'channel' && activeChannels.length > 0 && (
           <div className="mt-2 pt-2 border-t border-slate-100">
             <div className="flex flex-wrap gap-1.5">
               {activeChannels.map((ch: string) => {
                 const def = CHANNEL_DEFS[ch] || CHANNEL_DEFS['sms'];
                 const ChIcon = def.icon;
                 return (
                   <div key={ch} className={`p-1 rounded ${def.bgColor} ${def.color}`} title={def.label}>
                     <ChIcon size={12} />
                   </div>
                 );
               })}
               {activeChannels.length > 5 && (
                 <div className="p-1 rounded bg-slate-100 text-slate-500 text-[10px] font-bold flex items-center">...</div>
               )}
             </div>
             <p className="text-[10px] text-slate-400 mt-1.5">{activeChannels.length} Channel{activeChannels.length > 1 ? 's' : ''} Active</p>
           </div>
        )}

        {/* Action Node: Offer Summary */}
        {type === 'action' && (
           <div className="mt-2 pt-2 border-t border-slate-100">
              {data.actionType === 'info' ? (
                 <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded border border-slate-100">
                    <span className="text-[10px] font-medium text-slate-600 truncate">{data.subLabel || 'Notification'}</span>
                 </div>
              ) : (
                 <div className="flex items-center gap-2 p-1.5 bg-pink-50 rounded border border-pink-100">
                    {data.offerCategory === 'device' ? <Smartphone size={12} className="text-pink-600" /> : 
                     data.offerCategory === 'points' ? <Award size={12} className="text-pink-600" /> : 
                     <ShoppingBag size={12} className="text-pink-600" />}
                    <div className="overflow-hidden">
                       <span className="text-[10px] font-bold text-pink-700 block truncate">{data.productName || data.couponName || 'Select Offer'}</span>
                       {data.subLabel && <span className="text-[9px] text-pink-500 block truncate">{data.subLabel}</span>}
                    </div>
                 </div>
              )}
           </div>
        )}
        
        {/* Trigger SubLabel / Config */}
        {(type === 'trigger') && data.triggerConfig && (
           <div className="mt-2 pt-2 border-t border-slate-100">
             {getTriggerDisplay(data.triggerConfig)}
           </div>
        )}

        {/* Logic Node Branches Summary */}
        {type === 'logic' && data.branches && (
           <div className="mt-2 pt-2 border-t border-slate-100 space-y-1">
              {data.branches.slice(0, 3).map((b: any, i: number) => {
                const firstCond = b.conditions?.[0];
                let display = 'No cond';
                if (firstCond) {
                    const fieldMap: Record<string, string> = {
                        'Main Balance': 'Bal',
                        'Data Balance': 'Data',
                        'Action: Purchased': 'Bought',
                        'Action: Clicked': 'Click',
                        'Action: Redeemed': 'Redeem',
                        'Action: Replied': 'Reply',
                        'Action: Viewed': 'Viewed'
                    };
                    const shortField = fieldMap[firstCond.field] || firstCond.field || 'Field';
                    const isAction = firstCond.field?.startsWith('Action:');

                    if (isAction) {
                         const opText = firstCond.operator === 'is_false' ? 'NO' : 'YES';
                         display = `${shortField}? ${opText}`;
                    } else {
                         display = `${shortField} ${firstCond.operator === '=' ? ':' : firstCond.operator} ${firstCond.value}`;
                    }
                }

                return (
                  <div key={i} className="flex justify-between items-center text-[10px] bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                     <span className="font-bold text-slate-500 max-w-[50px] truncate">{b.label}</span>
                     <span className="text-slate-400 max-w-[120px] truncate ml-2" title={display}>
                        {display}
                     </span>
                  </div>
                );
              })}
              {data.branches.length > 3 && (
                <div className="text-[9px] text-center text-slate-400 font-medium">+{data.branches.length - 3} more cases</div>
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
           </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !-mr-2 shadow-sm" />
    </div>
  );
};

const nodeTypes = {
  trigger: CustomNode,
  action: CustomNode,
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

// --- Initial Data (Restructured Flow) ---

const INITIAL_NODES: Node[] = [
  { 
    id: '1', 
    type: 'segment', 
    position: { x: 50, y: 100 }, 
    data: { 
      label: 'Target: VVIP Users', 
      icon: Users,
      segmentCriteria: {
        tier: 'Diamond',
        city: 'Yangon',
        activityType: 'Active',
        activityOperator: '<=',
        activityValue: '30',
        arpu: { min: '25000' }
      }
    },
  },
  { 
    id: '2', 
    type: 'trigger', 
    position: { x: 350, y: 100 }, 
    data: { 
      label: 'Data Usage Alert', 
      icon: Wifi, 
      triggerConfig: {
        category: 'data',
        operator: '>',
        threshold: '900',
        unit: 'MB'
      }
    },
  },
  { 
    id: '3', 
    type: 'action', 
    position: { x: 650, y: 100 }, 
    data: { 
      label: 'Offer: iPhone Bundle', 
      icon: Gift, 
      actionType: 'marketing',
      offerCategory: 'device',
      productName: 'iPhone 15 Pro Max',
      subLabel: 'Cross-sell Bundle'
    },
  },
  {
    id: '4',
    type: 'channel',
    position: { x: 950, y: 100 },
    data: { 
      label: 'Omni-Channel Blast', 
      icon: MessageSquare, 
      selectedChannels: ['sms', 'facebook', 'email'], 
      channelContent: {
        sms: { text: "Exclusive VVIP Offer: Get the new iPhone 15 Pro Max with your plan!" },
        facebook: { text: "Upgrade your lifestyle with the iPhone 15 Pro Max. Exclusive to VVIP members." }
      }
    }
  },
  {
    id: '5',
    type: 'wait',
    position: { x: 950, y: 250 },
    data: { label: 'Wait 3 Days', waitType: 'duration', durationValue: 3, durationUnit: 'days' }
  },
  { 
    id: '6', 
    type: 'logic', 
    position: { x: 950, y: 350 }, 
    data: { 
      label: 'Check Purchase', 
      icon: Split,
      branches: [
        { 
          id: 'b1', 
          label: 'Success', 
          conditions: [{ id: 'c1', field: 'Action: Purchased', operator: 'is_true', value: 'true' }]
        }
      ]
    },
  },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e2-3', source: '2', target: '3', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e4-5', source: '4', target: '5', animated: true, style: { stroke: '#cbd5e1' } },
  { id: 'e5-6', source: '5', target: '6', animated: true, style: { stroke: '#cbd5e1' } },
];

// --- Main Component ---

const CampaignCanvas: React.FC<CampaignCanvasProps> = ({ products, coupons }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  // State for Channel Panel Tabs
  const [activeChannelTab, setActiveChannelTab] = useState<string>('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiIntent, setAiIntent] = useState('');

  // State for Tag/App/Location Autocomplete
  const [tagInput, setTagInput] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagInputRef = useRef<HTMLDivElement>(null);
  
  const [appInput, setAppInput] = useState('');
  const [isAppDropdownOpen, setIsAppDropdownOpen] = useState(false);
  const appInputRef = useRef<HTMLDivElement>(null);

  const [locationInput, setLocationInput] = useState('');
  const [isLocationDropdownOpen, setIsLocationDropdownOpen] = useState(false);
  const locationInputRef = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#cbd5e1' } }, eds)),
    [setEdges],
  );

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
    if (node.type === 'channel') {
      const data = node.data as unknown as CampaignNodeData;
      const channels = data.selectedChannels || ['sms'];
      setActiveChannelTab(channels[0]);
    }
  };

  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as Node)) {
        setIsTagDropdownOpen(false);
      }
      if (appInputRef.current && !appInputRef.current.contains(event.target as Node)) {
        setIsAppDropdownOpen(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as Node)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateNodeData = (id: string, newData: Partial<CampaignNodeData>) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          let extraUpdates = {};
          
          if (newData.productId) {
            const p = products.find(prod => prod.id === newData.productId);
            // Clear coupon data when setting product
            if (p) extraUpdates = { ...extraUpdates, productName: p.marketingName, subLabel: `${p.type} • ${p.price} Ks`, couponId: undefined, couponName: undefined };
          }
          if (newData.couponId) {
            const c = coupons.find(coup => coup.id === newData.couponId);
            // Clear product data when setting coupon
            if (c) extraUpdates = { ...extraUpdates, couponName: c.name, subLabel: `Val: ${c.value}`, productId: undefined, productName: undefined };
          }
          if (newData.productName && !newData.productId) {
             // For mock manual inputs
             extraUpdates = { ...extraUpdates, subLabel: 'Physical Item', couponId: undefined, couponName: undefined, productId: undefined };
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

  // --- Helper to update segment criteria ---
  const updateCriteria = (key: keyof SegmentCriteria, value: any) => {
    if (!selectedNode) return;
    const currentCriteria = (selectedNode.data as unknown as CampaignNodeData).segmentCriteria || {};
    updateNodeData(selectedNode.id, { 
        segmentCriteria: { ...currentCriteria, [key]: value } 
    });
  };

  const updateTriggerConfig = (key: keyof TriggerConfig, value: any) => {
    if (!selectedNode) return;
    const currentConfig = (selectedNode.data as unknown as CampaignNodeData).triggerConfig || { category: 'topup' };
    
    // Auto-set defaults when category changes
    let updates: Partial<TriggerConfig> = { [key]: value };
    if (key === 'category') {
       if (value === 'topup') updates = { ...updates, unit: 'Ks', threshold: '1000' };
       if (value === 'data') updates = { ...updates, unit: 'MB', threshold: '500' };
       if (value === 'voice') updates = { ...updates, unit: 'Minutes', threshold: '10' };
       if (value === 'location') updates = { ...updates, radius: '5', unit: 'km' };
    }

    updateNodeData(selectedNode.id, { 
        triggerConfig: { ...currentConfig, ...updates } 
    });
  };

  const updateDeepCriteria = (parent: 'arpu' | 'balance', key: 'min' | 'max', value: string) => {
    if (!selectedNode) return;
    const currentCriteria = (selectedNode.data as unknown as CampaignNodeData).segmentCriteria || {};
    const currentParent = currentCriteria[parent] || {};
    updateNodeData(selectedNode.id, {
        segmentCriteria: {
            ...currentCriteria,
            [parent]: { ...currentParent, [key]: value }
        }
    });
  };

  const addTag = (tag: string) => {
    if (!selectedNode) return;
    const currentCriteria = (selectedNode.data as unknown as CampaignNodeData).segmentCriteria || {};
    const currentTags = currentCriteria.tags || [];
    if (!currentTags.includes(tag)) {
        updateCriteria('tags', [...currentTags, tag]);
    }
    setTagInput('');
    setIsTagDropdownOpen(false);
  };

  const removeTag = (tag: string) => {
    if (!selectedNode) return;
    const currentCriteria = (selectedNode.data as unknown as CampaignNodeData).segmentCriteria || {};
    const currentTags = currentCriteria.tags || [];
    updateCriteria('tags', currentTags.filter(t => t !== tag));
  };

  const selectApp = (app: typeof MOCK_APPS[0]) => {
    updateTriggerConfig('appName', app.name);
    updateTriggerConfig('appUrl', app.url);
    setAppInput('');
    setIsAppDropdownOpen(false);
  };

  const selectLocation = (loc: string) => {
    updateTriggerConfig('locationName', loc);
    setLocationInput('');
    setIsLocationDropdownOpen(false);
  };

  // --- AI Content Generation Helper ---
  const handleAiGenerate = async (nodeId: string, currentData: CampaignNodeData) => {
    setIsAiGenerating(true);

    const channels = currentData.selectedChannels || ['sms'];
    const newContent = { ...(currentData.channelContent || {}) };
    
    // Find upstream action for context
    const actionNode = nodes.find(n => n.type === 'action'); // Simplified: finds first action
    const actionData = actionNode?.data as unknown as CampaignNodeData;
    const offerContext = actionData ? `Offer: ${actionData.productName || actionData.couponName || 'Special Benefit'}.` : '';

    // Simulate concurrent generation for demo speed
    for (const ch of channels) {
      let context = `Write marketing content for ${CHANNEL_DEFS[ch].label}. ${offerContext} Goal: ${aiIntent || 'Drive Sales'}. Tone: ${currentData.aiContentTone || 'Professional'}. `;
      
      if (ch === 'sms') context += 'Max 160 chars. ';
      if (ch === 'ussd') context += 'Max 120 chars. Very brief menu style. ';
      if (ch === 'chatbox') context += 'Short card description. ';
      if (ch === 'email') context += 'Subject line and Body. ';
      if (['facebook', 'instagram', 'linkedin'].includes(ch)) context += 'Engaging social post with hashtags. ';

      const generatedText = await generateMarketingCopy(context, 'Professional');
      
      if (!newContent[ch]) newContent[ch] = {};
      
      if (ch === 'email') {
        const lines = generatedText.split('\n');
        newContent[ch].subject = lines[0].replace('Subject:', '').trim();
        newContent[ch].text = lines.slice(1).join('\n').trim();
      } else {
        newContent[ch].text = generatedText;
      }
    }

    updateNodeData(nodeId, { channelContent: newContent });
    setIsAiGenerating(false);
  };

  // --- Configuration Panels ---

  const renderConfigurationPanel = () => {
    if (!selectedNode) return null;
    const data = selectedNode.data as unknown as CampaignNodeData;

    return (
      <div className="absolute right-6 top-6 w-[450px] bg-white rounded-xl shadow-2xl border border-slate-200 flex flex-col max-h-[calc(100vh-48px)] animate-in slide-in-from-right duration-300 overflow-hidden z-20">
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

          {/* 1. Segment Config */}
          {selectedNode.type === 'segment' && (
            <div className="space-y-6">
               {/* Static Configuration */}
               <div>
                  <h4 className="text-xs font-bold text-indigo-800 uppercase mb-3 flex items-center gap-2">
                    <User size={14} /> Static Profile
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                     <div className="col-span-1">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Age Range</label>
                        <div className="flex gap-2">
                           <input 
                              type="number" 
                              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="Min" 
                              value={data.segmentCriteria?.ageMin || ''}
                              onChange={(e) => updateCriteria('ageMin', e.target.value)} 
                           />
                           <input 
                              type="number" 
                              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none" 
                              placeholder="Max" 
                              value={data.segmentCriteria?.ageMax || ''}
                              onChange={(e) => updateCriteria('ageMax', e.target.value)} 
                           />
                        </div>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gender</label>
                        <select 
                           className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                           value={data.segmentCriteria?.gender || ''} 
                           onChange={(e) => updateCriteria('gender', e.target.value)}
                        >
                           <option value="">All</option>
                           <option value="Male">Male</option>
                           <option value="Female">Female</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">City / Region</label>
                        <select 
                           className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                           value={data.segmentCriteria?.city || ''} 
                           onChange={(e) => updateCriteria('city', e.target.value)}
                        >
                           <option value="">All Regions</option>
                           <option value="Yangon">Yangon</option>
                           <option value="Mandalay">Mandalay</option>
                           <option value="Nay Pyi Taw">Nay Pyi Taw</option>
                           <option value="Bago">Bago</option>
                           <option value="Shan">Shan State</option>
                        </select>
                     </div>
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">SIM Type</label>
                        <select 
                           className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                           value={data.segmentCriteria?.simType || ''} 
                           onChange={(e) => updateCriteria('simType', e.target.value)}
                        >
                           <option value="">All</option>
                           <option value="Prepaid">Prepaid</option>
                           <option value="Postpaid">Postpaid</option>
                        </select>
                     </div>
                  </div>
                  <div className="mt-3">
                     <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Loyalty Tier</label>
                     <div className="flex flex-wrap gap-1">
                        {['Crown', 'Diamond', 'Platinum', 'Gold', 'Silver'].map(tier => (
                           <button 
                             key={tier}
                             onClick={() => updateCriteria('tier', tier === data.segmentCriteria?.tier ? '' : tier)} 
                             className={`px-3 py-1.5 text-[10px] font-bold rounded border transition-colors ${
                               data.segmentCriteria?.tier === tier 
                               ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
                               : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                             }`}
                           >
                             {tier}
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Dynamic Configuration */}
               <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-emerald-800 uppercase mb-3 flex items-center gap-2">
                    <Activity size={14} /> Dynamic Behavior
                  </h4>
                  
                  <div className="space-y-3">
                     <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Activity Status / Tenure</label>
                        <div className="space-y-2">
                           <select 
                              className="w-full p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                              value={data.segmentCriteria?.activityType || ''} 
                              onChange={(e) => updateCriteria('activityType', e.target.value)}
                           >
                              <option value="">Any</option>
                              <option value="Register">Register (Tenure)</option>
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                              <option value="Dormant">Dormant</option>
                           </select>

                           {data.segmentCriteria?.activityType && (
                              <div className="flex gap-2 animate-in slide-in-from-top-1">
                                 <select 
                                    className="w-1/3 p-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-indigo-100 outline-none"
                                    value={data.segmentCriteria?.activityOperator || '<='} 
                                    onChange={(e) => updateCriteria('activityOperator', e.target.value)}
                                 >
                                    <option value=">">More than (&gt;)</option>
                                    <option value="=">Exactly (=)</option>
                                    <option value="<=">Within / Less (&le;)</option>
                                 </select>
                                 <div className="flex-1 relative">
                                    <input 
                                       type="number" 
                                       className="w-full p-2 pr-8 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                                       placeholder="Days" 
                                       value={data.segmentCriteria?.activityValue || ''}
                                       onChange={(e) => updateCriteria('activityValue', e.target.value)}
                                    />
                                    <span className="absolute right-3 top-2 text-xs text-slate-400 font-medium">Days</span>
                                 </div>
                              </div>
                           )}
                        </div>
                     </div>

                     <div className="grid grid-cols-2 gap-3">
                        <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ARPU (Min)</label>
                           <div className="relative">
                              <span className="absolute left-2 top-2 text-slate-400 text-xs">Ks</span>
                              <input 
                                 type="number" placeholder="0" 
                                 className="w-full pl-6 p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                                 value={data.segmentCriteria?.arpu?.min || ''}
                                 onChange={(e) => updateDeepCriteria('arpu', 'min', e.target.value)}
                              />
                           </div>
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Balance (Min)</label>
                           <div className="relative">
                              <span className="absolute left-2 top-2 text-slate-400 text-xs">Ks</span>
                              <input 
                                 type="number" placeholder="0" 
                                 className="w-full pl-6 p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                                 value={data.segmentCriteria?.balance?.min || ''}
                                 onChange={(e) => updateDeepCriteria('balance', 'min', e.target.value)}
                              />
                           </div>
                        </div>
                     </div>

                     <div ref={tagInputRef} className="relative">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">User Tags / Groups</label>
                        
                        <div className="flex flex-wrap gap-1.5 mb-2">
                           {(data.segmentCriteria?.tags || []).map(tag => (
                              <span key={tag} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                                 {tag}
                                 <button onClick={() => removeTag(tag)} className="hover:text-indigo-900"><X size={12} /></button>
                              </span>
                           ))}
                        </div>

                        <div className="relative">
                           <input 
                              type="text" 
                              placeholder="Type to search tags..." 
                              className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                              value={tagInput}
                              onChange={(e) => {
                                 setTagInput(e.target.value);
                                 setIsTagDropdownOpen(true);
                              }}
                              onFocus={() => setIsTagDropdownOpen(true)}
                           />
                           <Search className="absolute right-2 top-2.5 text-slate-400" size={14} />
                        </div>

                        {/* Autocomplete Dropdown */}
                        {isTagDropdownOpen && (
                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                              {MOCK_TAGS.filter(t => t.toLowerCase().includes(tagInput.toLowerCase()) && !(data.segmentCriteria?.tags || []).includes(t)).map(tag => (
                                 <div 
                                    key={tag}
                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
                                    onClick={() => addTag(tag)}
                                 >
                                    {tag}
                                 </div>
                              ))}
                              {MOCK_TAGS.filter(t => t.toLowerCase().includes(tagInput.toLowerCase())).length === 0 && (
                                 <div className="px-3 py-2 text-xs text-slate-400 italic">No tags found</div>
                              )}
                           </div>
                        )}
                     </div>
                  </div>
               </div>
               
               {/* Real-time Audience Estimation (Mock logic adjusted) */}
               <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 shadow-sm mt-4">
                  <div className="flex justify-between items-start mb-1">
                     <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Estimated Reach</span>
                     <span className="p-1 bg-emerald-100 rounded text-emerald-600">
                        <Users size={14} />
                     </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                     <span className="text-2xl font-bold text-emerald-900">
                        {/* Mock calculation based on number of set fields */}
                        {(15400 - (Object.values(data.segmentCriteria || {}).filter(Boolean).length * 1250)).toLocaleString()}
                     </span>
                     <span className="text-xs font-medium text-emerald-700">Users</span>
                  </div>
                  <div className="w-full bg-emerald-200/50 h-1.5 rounded-full mt-2 overflow-hidden">
                     <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(10, 100 - (Object.values(data.segmentCriteria || {}).filter(Boolean).length * 15))}%` }}></div>
                  </div>
                  <p className="text-[10px] text-emerald-600 mt-1.5 text-right">Updated just now</p>
               </div>
            </div>
          )}

          {/* 2. Trigger Config */}
          {selectedNode.type === 'trigger' && (
            <div className="space-y-6">
              <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Trigger Category</label>
                 <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'topup', label: 'Topup Balance', icon: DollarSign },
                      { id: 'data', label: 'Data', icon: Wifi },
                      { id: 'voice', label: 'Voice', icon: Phone },
                      { id: 'location', label: 'Location', icon: MapPin },
                      { id: 'app', label: 'App', icon: AppWindow },
                      { id: 'schedule', label: 'Schedule', icon: Calendar }
                    ].map(cat => (
                      <button 
                        key={cat.id}
                        onClick={() => updateTriggerConfig('category', cat.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                          data.triggerConfig?.category === cat.id
                          ? 'bg-amber-50 border-amber-200 text-amber-700 ring-1 ring-amber-200' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <cat.icon size={16} className="mb-1" />
                        <span className="text-[10px] font-bold text-center">{cat.label}</span>
                      </button>
                    ))}
                 </div>
              </div>
              
              {/* Dynamic Inputs based on Category */}
              {['topup', 'data', 'voice'].includes(data.triggerConfig?.category || 'topup') && (
                <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2">
                   <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Operator</label>
                     <select 
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                        value={data.triggerConfig?.operator || '<'}
                        onChange={(e) => updateTriggerConfig('operator', e.target.value)}
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
                        <span className="absolute right-3 top-2.5 text-slate-400 text-xs font-bold pointer-events-none">
                          {data.triggerConfig?.category === 'topup' ? 'Ks' : 
                           data.triggerConfig?.category === 'data' ? 'MB' : 'Mins'}
                        </span>
                        <input 
                          type="number"
                          className="w-full pr-10 p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-100"
                          value={data.triggerConfig?.threshold || ''}
                          onChange={(e) => updateTriggerConfig('threshold', e.target.value)}
                        />
                     </div>
                   </div>
                </div>
              )}

              {data.triggerConfig?.category === 'location' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2" ref={locationInputRef}>
                   <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target Location</label>
                      <div className="relative">
                        <input 
                          type="text" 
                          placeholder="Search Places (Google Maps)..."
                          className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-100"
                          value={locationInput || data.triggerConfig?.locationName || ''}
                          onChange={(e) => {
                             setLocationInput(e.target.value);
                             setIsLocationDropdownOpen(true);
                          }}
                          onFocus={() => setIsLocationDropdownOpen(true)}
                        />
                        <Search className="absolute left-3 top-3 text-slate-400" size={14} />
                        
                        {/* Mock Google Places Autocomplete Dropdown */}
                        {isLocationDropdownOpen && (
                           <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                              {MOCK_LOCATIONS.filter(loc => loc.toLowerCase().includes(locationInput.toLowerCase())).map(loc => (
                                 <div 
                                    key={loc}
                                    className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 flex items-center gap-2"
                                    onClick={() => selectLocation(loc)}
                                 >
                                    <MapPin size={14} className="text-slate-400" />
                                    <span>{loc}</span>
                                 </div>
                              ))}
                              {MOCK_LOCATIONS.filter(loc => loc.toLowerCase().includes(locationInput.toLowerCase())).length === 0 && (
                                <div className="p-3 text-xs text-slate-400 italic">No locations found</div>
                              )}
                              <div className="px-2 py-1 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <span className="text-[9px] text-slate-400">Powered by Google</span>
                              </div>
                           </div>
                        )}
                      </div>
                   </div>
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Radius (Km)</label>
                      <input 
                        type="number" 
                        placeholder="e.g. 5"
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-100"
                        value={data.triggerConfig?.radius || ''}
                        onChange={(e) => updateTriggerConfig('radius', e.target.value)}
                      />
                   </div>
                   
                   {/* Combined Schedule for Location */}
                   <div className="pt-4 border-t border-slate-100">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-2">
                         <Calendar size={14} /> Active Time Window
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                         {/* Dark Date Inputs with English Locale */}
                         <input 
                           type="date" 
                           lang="en-US"
                           className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                           value={data.triggerConfig?.startDate || ''} 
                           onChange={e => updateTriggerConfig('startDate', e.target.value)} 
                         />
                         <input 
                           type="date" 
                           lang="en-US"
                           className="w-full p-2 bg-slate-700 border border-slate-600 rounded text-sm text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors" 
                           value={data.triggerConfig?.endDate || ''} 
                           onChange={e => updateTriggerConfig('endDate', e.target.value)} 
                         />
                      </div>
                   </div>
                </div>
              )}

              {data.triggerConfig?.category === 'app' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-2" ref={appInputRef}>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Target App</label>
                   <div className="relative">
                      <input 
                        type="text" 
                        placeholder="Search App (e.g. Facebook)..."
                        className="w-full p-2.5 pl-9 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-100"
                        value={appInput || data.triggerConfig?.appName || ''}
                        onChange={(e) => {
                           setAppInput(e.target.value);
                           setIsAppDropdownOpen(true);
                        }}
                        onFocus={() => setIsAppDropdownOpen(true)}
                      />
                      <Search className="absolute left-3 top-3 text-slate-400" size={14} />
                      
                      {isAppDropdownOpen && (
                         <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-48 overflow-y-auto">
                            {MOCK_APPS.filter(app => app.name.toLowerCase().includes(appInput.toLowerCase())).map(app => (
                               <div 
                                  key={app.name}
                                  className="px-3 py-2 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 flex items-center gap-2"
                                  onClick={() => selectApp(app)}
                               >
                                  <app.icon size={14} className="text-slate-400" />
                                  <span>{app.name}</span>
                                  <span className="text-xs text-slate-400 ml-auto font-mono">{app.url}</span>
                               </div>
                            ))}
                         </div>
                      )}
                   </div>
                   
                   <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Specific URL (Optional)</label>
                      <input 
                        type="text" 
                        placeholder="https://..."
                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-100 text-slate-600"
                        value={data.triggerConfig?.appUrl || ''}
                        onChange={(e) => updateTriggerConfig('appUrl', e.target.value)}
                      />
                   </div>
                </div>
              )}

              {data.triggerConfig?.category === 'schedule' && (
                 <div className="space-y-3 animate-in fade-in slide-in-from-top-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Range</label>
                    <div className="grid grid-cols-2 gap-3">
                       <div>
                          <span className="text-[10px] text-slate-400 block mb-1">Start Date</span>
                          <input type="date" className="w-full p-2 border border-slate-200 rounded text-sm" 
                             value={data.triggerConfig?.startDate || ''} onChange={e => updateTriggerConfig('startDate', e.target.value)} />
                       </div>
                       <div>
                          <span className="text-[10px] text-slate-400 block mb-1">End Date</span>
                          <input type="date" className="w-full p-2 border border-slate-200 rounded text-sm" 
                             value={data.triggerConfig?.endDate || ''} onChange={e => updateTriggerConfig('endDate', e.target.value)} />
                       </div>
                    </div>
                 </div>
              )}

              {/* Logic Operator (Visible if complexities exist, simplified here as per prompt for 'AND/OR') */}
              <div className="pt-4 border-t border-slate-100">
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-slate-500 uppercase">Condition Logic</label>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg">
                       <button 
                         onClick={() => updateTriggerConfig('logicOperator', 'AND')}
                         className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${(!data.triggerConfig?.logicOperator || data.triggerConfig?.logicOperator === 'AND') ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                       >
                         AND
                       </button>
                       <button 
                         onClick={() => updateTriggerConfig('logicOperator', 'OR')}
                         className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${data.triggerConfig?.logicOperator === 'OR' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400'}`}
                       >
                         OR
                       </button>
                    </div>
                 </div>
                 <p className="text-[9px] text-slate-400 mt-1">Defines how this trigger interacts if combined with others.</p>
              </div>
            </div>
          )}

          {/* 3. Action Node Config */}
          {selectedNode.type === 'action' && (
            <div className="space-y-6">
               {/* Type Selector */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Action Type</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                     <button 
                       onClick={() => updateNodeData(selectedNode.id, { actionType: 'marketing' })}
                       className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${data.actionType !== 'info' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500'}`}
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

               {data.actionType !== 'info' ? (
                 <div className="space-y-4">
                    {/* Category Selector */}
                    <div>
                       <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Offer Category</label>
                       <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'telecom', label: 'Telecom', icon: Wifi },
                            { id: 'device', label: 'Device', icon: Smartphone },
                            { id: 'points', label: 'Points', icon: Award },
                            { id: 'coupon', label: 'Coupon', icon: Gift }
                          ].map(cat => (
                            <button
                              key={cat.id}
                              onClick={() => updateNodeData(selectedNode.id, { offerCategory: cat.id })}
                              className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                                data.offerCategory === cat.id
                                  ? 'bg-pink-50 border-pink-200 text-pink-700 ring-1 ring-pink-200' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                              }`}
                            >
                               <cat.icon size={18} className="mb-1" />
                               <span className="text-[9px] font-bold">{cat.label}</span>
                            </button>
                          ))}
                       </div>
                    </div>

                    {/* Item Selector */}
                    <div className="p-4 bg-pink-50/50 rounded-lg border border-pink-100">
                       <label className="block text-xs font-bold text-pink-800 uppercase mb-2">Select Offer Item</label>
                       
                       {data.offerCategory === 'telecom' && (
                          <select 
                            className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none"
                            value={data.productId || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { productId: e.target.value })}
                          >
                            <option value="">-- Select Product --</option>
                            {products.filter(p => p.type !== 'Device').map(p => (
                              <option key={p.id} value={p.id}>{p.marketingName} ({p.price} Ks)</option>
                            ))}
                          </select>
                       )}

                       {data.offerCategory === 'device' && (
                          <div className="space-y-2">
                             <select className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none"
                                onChange={(e) => updateNodeData(selectedNode.id, { productName: e.target.value })}
                             >
                                <option>iPhone 15 Pro Max</option>
                                <option>Samsung Galaxy S24</option>
                                <option>Home WiFi Router 5G</option>
                                <option>Smart CCTV Camera</option>
                             </select>
                             <div className="flex items-center gap-2">
                                <input type="checkbox" id="cross" className="text-pink-600 focus:ring-pink-500 rounded" />
                                <label htmlFor="cross" className="text-xs text-slate-600">Bundle with 12-Month Plan (Cross-sell)</label>
                             </div>
                          </div>
                       )}

                       {data.offerCategory === 'points' && (
                          <select 
                            className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none"
                            value={data.couponId || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { couponId: e.target.value })}
                          >
                            <option value="">-- Select Reward --</option>
                            {coupons.filter(c => c.type === 'Points').map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.value})</option>
                            ))}
                          </select>
                       )}

                       {data.offerCategory === 'coupon' && (
                          <select 
                            className="w-full p-2.5 bg-white border border-pink-200 rounded-lg text-sm outline-none"
                            value={data.couponId || ''}
                            onChange={(e) => updateNodeData(selectedNode.id, { couponId: e.target.value })}
                          >
                            <option value="">-- Select Coupon --</option>
                            {coupons.filter(c => c.type !== 'Points').map(c => (
                              <option key={c.id} value={c.id}>{c.name} ({c.value})</option>
                            ))}
                          </select>
                       )}
                    </div>
                 </div>
               ) : (
                 // Informational Config
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Notification Topic</label>
                    <select 
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm mb-3"
                      value={data.subLabel || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { subLabel: e.target.value })}
                    >
                       <option value="General Notice">General Notice</option>
                       <option value="Holiday Greeting">Holiday Greeting</option>
                       <option value="Maintenance Alert">Maintenance Alert</option>
                       <option value="Bill Shock Warning">Bill Shock Warning</option>
                       <option value="Anniversary">Anniversary</option>
                    </select>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Context / Internal Note</label>
                    <textarea 
                      rows={3}
                      className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm"
                      placeholder="e.g. Warn users about maintenance in Yangon area..."
                      value={data.messageContent || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { messageContent: e.target.value })}
                    />
                 </div>
               )}
            </div>
          )}

          {/* ... [Rest of config panels - Logic, Wait, Channel - unchanged] ... */}
          {/* 6. Channel Node Config (New Multi-Channel) */}
          {selectedNode.type === 'channel' && (
            <div className="space-y-6">
               
               {/* A. Channel Selector */}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Select Distribution Channels</label>
                  <div className="grid grid-cols-4 gap-2">
                     {Object.entries(CHANNEL_DEFS).map(([key, def]) => {
                       const isSelected = (data.selectedChannels || ['sms']).includes(key);
                       return (
                         <button
                           key={key}
                           onClick={() => {
                             const current = data.selectedChannels || ['sms'];
                             let next = [];
                             if (isSelected) {
                               next = current.filter(c => c !== key);
                               if (next.length === 0) next = ['sms']; // Prevent empty
                             } else {
                               next = [...current, key];
                             }
                             updateNodeData(selectedNode.id, { selectedChannels: next });
                             if (!next.includes(activeChannelTab)) setActiveChannelTab(next[0]);
                           }}
                           className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                             isSelected 
                               ? `${def.bgColor} ${def.color} border-${def.color.split('-')[1]}-200 ring-1 ring-${def.color.split('-')[1]}-200` 
                               : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'
                           }`}
                         >
                            <def.icon size={20} className="mb-1" />
                            <span className="text-[9px] font-bold">{def.label}</span>
                         </button>
                       );
                     })}
                  </div>
               </div>

               {/* B. AI Copilot (Global) */}
               <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100">
                  <div className="flex items-center gap-2 mb-2">
                     <Sparkles size={14} className="text-indigo-600" />
                     <h4 className="text-xs font-bold text-indigo-800 uppercase">AI Content Copilot</h4>
                  </div>
                  <div className="space-y-2">
                    <input 
                      type="text" 
                      className="w-full p-2 bg-white/80 border border-indigo-100 rounded text-sm focus:bg-white transition-colors"
                      placeholder="e.g. Make it sound urgent..."
                      value={aiIntent}
                      onChange={(e) => setAiIntent(e.target.value)}
                    />
                    <div className="flex gap-2">
                       <select 
                         className="p-1.5 text-xs bg-white/50 border border-indigo-100 rounded text-indigo-800 outline-none"
                         value={data.aiContentTone || 'Professional'}
                         onChange={(e) => updateNodeData(selectedNode.id, { aiContentTone: e.target.value })}
                       >
                         <option>Professional</option>
                         <option>Urgent</option>
                         <option>Playful</option>
                         <option>Empathetic</option>
                       </select>
                       <button 
                         onClick={() => handleAiGenerate(selectedNode.id, data)}
                         disabled={isAiGenerating}
                         className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 flex justify-center items-center gap-2 disabled:opacity-50"
                       >
                         {isAiGenerating ? <span className="animate-spin">⏳</span> : <Sparkles size={12} />} 
                         Generate All Content
                       </button>
                    </div>
                  </div>
               </div>

               {/* C. Content Editor Tabs */}
               <div>
                  <div className="flex border-b border-slate-200 mb-4 overflow-x-auto scrollbar-hide">
                     {(data.selectedChannels || ['sms']).map(ch => (
                       <button
                         key={ch}
                         onClick={() => setActiveChannelTab(ch)}
                         className={`px-3 py-2 text-xs font-bold whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${
                           activeChannelTab === ch 
                             ? `border-indigo-600 text-indigo-700` 
                             : 'border-transparent text-slate-500 hover:text-slate-700'
                         }`}
                       >
                         {React.createElement(CHANNEL_DEFS[ch].icon, { size: 12 })}
                         {CHANNEL_DEFS[ch].label}
                       </button>
                     ))}
                  </div>

                  {/* Channel Specific Inputs */}
                  <div className="space-y-4 animate-in fade-in duration-200" key={activeChannelTab}>
                     {/* Text Content */}
                     <div>
                        <div className="flex justify-between mb-1.5">
                           <label className="text-xs font-bold text-slate-500 uppercase">
                             {activeChannelTab === 'email' ? 'Body Text' : 'Message Text'}
                           </label>
                           <span className="text-[10px] text-slate-400">
                             {(data.channelContent?.[activeChannelTab]?.text || '').length} chars
                           </span>
                        </div>
                        {activeChannelTab === 'email' && (
                          <input 
                            type="text" 
                            className="w-full p-2 mb-2 bg-white border border-slate-200 rounded text-sm placeholder:text-slate-400"
                            placeholder="Subject Line..."
                            value={data.channelContent?.email?.subject || ''}
                            onChange={(e) => {
                               const content = { ...(data.channelContent || {}) };
                               if (!content.email) content.email = {};
                               content.email.subject = e.target.value;
                               updateNodeData(selectedNode.id, { channelContent: content });
                            }}
                          />
                        )}
                        <textarea 
                          rows={activeChannelTab === 'email' ? 6 : 3}
                          className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                          placeholder={activeChannelTab === 'ussd' ? "Short menu text..." : "Enter content..."}
                          value={data.channelContent?.[activeChannelTab]?.text || ''}
                          onChange={(e) => {
                             const content = { ...(data.channelContent || {}) };
                             if (!content[activeChannelTab]) content[activeChannelTab] = {};
                             content[activeChannelTab].text = e.target.value;
                             updateNodeData(selectedNode.id, { channelContent: content });
                          }}
                        />
                     </div>

                     {/* Rich Media / Actions (Social, Chatbox, Email) */}
                     {['facebook', 'instagram', 'linkedin', 'chatbox', 'email'].includes(activeChannelTab) && (
                        <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Media Attachment</label>
                           <div className="flex items-center gap-3">
                              <div className="w-16 h-16 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-center text-slate-300 overflow-hidden">
                                 {data.channelContent?.[activeChannelTab]?.image ? (
                                   <img src={data.channelContent[activeChannelTab].image} alt="Preview" className="w-full h-full object-cover" />
                                 ) : (
                                   <ImageIcon size={20} />
                                 )}
                              </div>
                              <div className="flex-1 space-y-2">
                                 <button className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-medium">
                                   Upload Image
                                 </button>
                                 <button className="text-xs px-3 py-1.5 bg-pink-50 border border-pink-100 rounded hover:bg-pink-100 text-pink-600 font-medium flex items-center gap-1">
                                   <Sparkles size={10} /> Generate AI Image
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
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
                         {(branch.conditions || []).map((cond: any, cIdx: number) => {
                            const isAction = cond.field?.startsWith('Action:');
                            return (
                              <div key={cond.id} className="relative group/cond">
                                 {cIdx > 0 && <div className="text-[10px] text-center text-slate-400 font-bold my-1">- AND -</div>}
                                 <div className="flex gap-2">
                                   {/* Field Selection - Enhanced for Action Triggers */}
                                   <select 
                                     className="w-1/2 p-2 text-xs bg-white border border-slate-200 rounded font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-700" 
                                     value={cond.field} 
                                     onChange={(e) => {
                                        const newBranches = [...data.branches!];
                                        const val = e.target.value;
                                        newBranches[bIdx].conditions[cIdx].field = val;
                                        
                                        // Auto-switch operator based on type
                                        if (val.startsWith('Action:')) {
                                            newBranches[bIdx].conditions[cIdx].operator = 'is_true';
                                            newBranches[bIdx].conditions[cIdx].value = 'true';
                                        } else if (newBranches[bIdx].conditions[cIdx].operator === 'is_true' || newBranches[bIdx].conditions[cIdx].operator === 'is_false') {
                                            // Reset to default comparison if switching back from action
                                            newBranches[bIdx].conditions[cIdx].operator = '>';
                                            newBranches[bIdx].conditions[cIdx].value = '';
                                        }
                                        updateNodeData(selectedNode.id, { branches: newBranches });
                                     }}
                                   >
                                     <option value="" disabled>Select Field...</option>
                                     <optgroup label="User Profile">
                                        <option value="Main Balance">Main Balance</option>
                                        <option value="Data Balance">Data Balance</option>
                                        <option value="ARPU">ARPU</option>
                                        <option value="Segment">Segment</option>
                                        <option value="Loyalty Tier">Loyalty Tier</option>
                                        <option value="Device Type">Device Type</option>
                                        <option value="Region">Region</option>
                                     </optgroup>
                                     <optgroup label="Campaign Actions">
                                        <option value="Action: Purchased">Purchased Offer</option>
                                        <option value="Action: Clicked">Clicked Link</option>
                                        <option value="Action: Redeemed">Redeemed Coupon</option>
                                        <option value="Action: Replied">Replied to SMS</option>
                                        <option value="Action: Viewed">Viewed Notification</option>
                                     </optgroup>
                                   </select>

                                   <select 
                                     className="w-1/2 p-2 text-xs bg-white border border-slate-200 rounded font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-700" 
                                     value={cond.operator}
                                     onChange={(e) => {
                                        const newBranches = [...data.branches!];
                                        newBranches[bIdx].conditions[cIdx].operator = e.target.value;
                                        updateNodeData(selectedNode.id, { branches: newBranches });
                                     }}
                                   >
                                     {isAction ? (
                                        <>
                                           <option value="is_true">Has Occurred (True)</option>
                                           <option value="is_false">Did Not Occur (False)</option>
                                        </>
                                     ) : (
                                        <>
                                           <option value=">">Greater than</option>
                                           <option value="<">Less than</option>
                                           <option value="=">Equals (=)</option>
                                           <option value="!=">Not Equals (!=)</option>
                                           <option value="contains">Contains</option>
                                        </>
                                     )}
                                   </select>
                                 </div>
                                 <div className="flex gap-2 mt-2">
                                   {isAction ? (
                                      <div className={`w-full p-2 text-xs border rounded font-bold flex items-center justify-center gap-2 ${cond.operator === 'is_true' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                          {cond.operator === 'is_true' ? <CheckCircle2 size={14}/> : <XCircle size={14}/>}
                                          {cond.operator === 'is_true' ? 'User Completed Action' : 'User Did Not Complete'}
                                      </div>
                                   ) : (
                                     <input 
                                       type="text" 
                                       className="w-full p-2 text-xs bg-white border border-slate-200 rounded font-mono font-medium focus:ring-2 focus:ring-blue-100 outline-none text-slate-900 placeholder:text-slate-400" 
                                       placeholder="Value"
                                       value={cond.value} 
                                       onChange={(e) => {
                                          const newBranches = [...data.branches!];
                                          newBranches[bIdx].conditions[cIdx].value = e.target.value;
                                          updateNodeData(selectedNode.id, { branches: newBranches });
                                       }}
                                     />
                                   )}
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
                            );
                         })}
                         
                         <button 
                           onClick={() => {
                             const newBranches = [...data.branches!];
                             newBranches[bIdx].conditions.push({ id: `c${Date.now()}`, field: 'Main Balance', operator: '>', value: '0' });
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

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 space-y-3">
          {selectedNode.type === 'channel' && (
             <button className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                <Send size={18} /> Publish to {(data.selectedChannels || []).length} Channels
             </button>
          )}
          {selectedNode.type !== 'channel' && (
             <button className="w-full flex justify-center items-center gap-2 bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
                <CheckCircle2 size={18} /> Done
             </button>
          )}
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
                            <p className="text-[10px] font-bold text-slate-500 mb-2">STRATEGY</p>
                            <div className="space-y-2">
                               <button onClick={() => addNode('action', 'Offer / Action', Gift, { actionType: 'marketing' })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-pink-50 border border-transparent hover:border-pink-100 group transition-all">
                                  <div className="p-1.5 bg-pink-100 text-pink-600 rounded"><Gift size={14} /></div>
                                  <div className="text-left">
                                     <span className="block text-sm font-medium text-slate-700">Define Offer</span>
                                     <span className="block text-[9px] text-slate-400">Plan, Device, Coupon...</span>
                                  </div>
                               </button>
                            </div>
                         </div>

                         <div>
                            <p className="text-[10px] font-bold text-slate-500 mb-2">EXECUTION</p>
                            <div className="space-y-2">
                               <button onClick={() => addNode('channel', 'Omni-Channel Blast', MessageSquare, { selectedChannels: ['sms', 'email'] })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 group transition-all">
                                  <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded"><Globe size={14} /></div>
                                  <div className="text-left">
                                     <span className="block text-sm font-medium text-slate-700">Omni-Channel</span>
                                     <span className="block text-[9px] text-slate-400">SMS, Social, App, USSD...</span>
                                  </div>
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