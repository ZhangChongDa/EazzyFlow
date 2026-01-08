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
  Calendar, Phone, DollarSign, AppWindow, Loader2, CheckCircle, Radio, Target, FolderOpen, FileText
} from 'lucide-react';
import { Product, Coupon, Offer } from '../types';
import { generateMarketingCopy } from '../services/geminiService';
import { useAudienceEstimator, SegmentCriteria } from '../hooks/useAudienceEstimator';
import { useCampaignPersistence } from '../hooks/useCampaignPersistence';
import { useCampaignSimulator } from '../hooks/useCampaignSimulator';
import { ConfigurationDrawer } from './ConfigurationDrawer';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { useCanvasNodes } from '../contexts/CanvasNodesContext';

// --- Icon Map for Serialization ---
// Maps string identifiers to Lucide icon components for safe serialization
const ICON_MAP: Record<string, any> = {
  users: Users,
  wifi: Wifi,
  gift: Gift,
  'message-square': MessageSquare,
  clock: Clock,
  split: Split,
  zap: Zap,
  bell: Bell,
  mail: Mail,
  smartphone: Smartphone,
  globe: Globe,
  calendar: Calendar,
  phone: Phone,
  'message-circle': MessageCircle,
  'rotate-ccw': RotateCcw,
  default: Zap
};

// --- Types & Interfaces ---

type ChannelContentData = {
  subject?: string;     // Email
  text?: string;        // All
  image?: string;       // Social / Chat
  actionLabel?: string; // ChatBox
  actionUrl?: string;   // ChatBox
  ussdMenu?: string;    // USSD
};

// ✅ SegmentCriteria is now imported from useAudienceEstimator hook

type TriggerCondition = {
  id: string;
  field: string; // 'balance', 'data', 'arpu', 'location', 'app', etc.
  operator: string; // '<', '>', '=', 'contains', etc.
  value: string | number;
};

type TriggerConditionGroup = {
  id: string;
  conditions: TriggerCondition[];
  operator: 'AND' | 'OR'; // Within group operator
  groupOperator?: 'AND' | 'OR'; // Between groups operator (for next group)
};

// ✅ Opt-2: New Trigger Condition Item (for multi-select)
type TriggerConditionItem = {
  id: string;
  category: 'topup' | 'data' | 'voice' | 'location' | 'app';
  operator?: string;
  threshold?: string | number;
  unit?: string;
  locationName?: string;
  radius?: string;
  appName?: string;
  appUrl?: string;
  relationToNext?: 'AND' | 'OR'; // Relation to next condition
};

type TriggerConfig = {
  // ✅ Opt-2: Multiple conditions (Topup, Data, Voice, Location, App) - Multi-select Toggle
  conditions?: TriggerConditionItem[];
  
  // ✅ Opt-2: Schedule is now required
  scheduleType?: 'specific' | 'ongoing'; // Required (default to 'ongoing' if not set)
  // Specific time schedule
  startDate?: string;
  endDate?: string;
  allDay?: boolean; // If true, all time in date range is valid
  specificTime?: boolean; // If true, use time windows
  dailyTimeStart?: string; // e.g., "19:00"
  dailyTimeEnd?: string; // e.g., "20:00"
  weeklyDays?: string[]; // e.g., ["Wednesday"] for weekly schedule
  weeklyTimeStart?: string;
  weeklyTimeEnd?: string;
  
  // Legacy fields (for backward compatibility - will be migrated)
  category?: 'topup' | 'data' | 'voice' | 'location' | 'app' | 'schedule';
  operator?: string;
  threshold?: string | number;
  unit?: string;
  locationName?: string;
  radius?: string;
  startTime?: string; // Legacy - use dailyTimeStart/weeklyTimeStart instead
  endTime?: string; // Legacy - use dailyTimeEnd/weeklyTimeEnd instead
  appName?: string;
  appUrl?: string;
  conditionGroups?: TriggerConditionGroup[]; // Legacy - will be removed
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
  offerId?: string; // ✅ Category 2.1: Offer ID from offers table
  landingPageUrl?: string; // ✅ Category 2.1: Custom landing page URL fallback
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

  // ✅ Fix: Get icon from string identifier or fallback to default
  // 🔥 强壮性修复：无论 data.icon 是什么脏数据（对象/null），都强制转为字符串处理
  // 如果不是字符串，直接回退到 'default'，防止 React 渲染崩溃
  const iconKey = typeof data.icon === 'string' ? data.icon : 'default';
  const Icon = ICON_MAP[iconKey] || ICON_MAP.default;
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

  // ✅ Category 1.2: Check if node is unconfigured (for warning icon)
  const isUnconfigured = () => {
    if (type === 'action' && !data.offerId && !data.landingPageUrl && !data.messageContent) return true;
    if (type === 'logic' && (!data.branches || data.branches.length === 0)) return true;
    if (type === 'wait' && !data.waitType) return true;
    if (type === 'segment' && !data.segmentCriteria) return true;
    if (type === 'trigger' && !data.triggerConfig) return true;
    if (type === 'channel' && (!data.selectedChannels || data.selectedChannels.length === 0)) return false; // Channel can have defaults
    return false;
  };

  return (
    <div className={`w-56 bg-white rounded-lg shadow-md border transition-all duration-200 group ${selected ? 'ring-2 ring-offset-2' : ''} ${borderColor}`}>
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !bg-slate-400 !border-2 !border-white !-ml-1.5" />
      
      {/* ✅ Category 1.2: N8N-Style Colored Header Strip */}
      <div className={`h-1 ${colorClass} rounded-t-lg`}></div>
      
      <div className="p-2.5">
        {/* ✅ Category 1.2: Compact Header with Icon + Label */}
        <div className="flex items-center gap-2 mb-1.5">
          <div className={`p-1.5 rounded ${bgIcon} ${iconColor} shrink-0`}>
            <Icon size={14} />
          </div>
          <div className="flex-1 overflow-hidden min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate leading-tight">{data.label}</p>
            {data.subLabel && (
              <p className="text-[10px] text-slate-500 truncate">{data.subLabel}</p>
            )}
          </div>
          {/* ✅ Category 1.2: Warning Icon for Unconfigured Nodes */}
          {isUnconfigured() && (
            <div className="shrink-0" title="Node not configured">
              <XCircle size={14} className="text-amber-500" />
            </div>
          )}
        </div>

        {/* Segment Node Specific Summary - Simplified: Only Show Audience Size */}
        {type === 'segment' && data.segmentCriteria && (
          <div className="mt-2 pt-2 border-t border-slate-100">
            {/* ✅ Fix: Only display audience size (simplified display) */}
            {data.audienceSize !== undefined && data.audienceSize !== null ? (
              <div className="flex justify-between items-center text-[10px] bg-indigo-50 px-2 py-1.5 rounded border border-indigo-100">
                <span className="font-bold text-indigo-600">Reach</span>
                <span className="text-sm font-bold text-indigo-600">
                  {data.audienceSize.toLocaleString()}
                </span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 italic text-center py-1">Configure criteria to view count</p>
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

      {/* ✅ Bug Fix 2: Logic nodes should have YES/NO outputs (Trigger nodes removed) */}
      {type === 'logic' ? (
        <>
          {/* True Handle (Top 35%) */}
          <Handle
            id="true"
            type="source"
            position={Position.Right}
            style={{ top: '35%', background: '#10b981', borderColor: '#fff' }}
            className="!w-3 !h-3 !border-2 !border-white !-mr-2 shadow-sm"
          />
          {/* False Handle (Bottom 65%) */}
          <Handle
            id="false"
            type="source"
            position={Position.Right}
            style={{ top: '65%', background: '#ef4444', borderColor: '#fff' }}
            className="!w-3 !h-3 !border-2 !border-white !-mr-2 shadow-sm"
          />
          {/* Visual Labels */}
          <div className="absolute right-0 top-[30%] text-[9px] font-bold text-emerald-600 pointer-events-none">Yes</div>
          <div className="absolute right-0 top-[60%] text-[9px] font-bold text-red-600 pointer-events-none">No</div>
        </>
      ) : (
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-slate-400 !border-2 !border-white !-mr-2 shadow-sm" />
      )}
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
        <button type="button" onClick={() => { }} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors" title="Lock Canvas"><Lock size={18} /></button>
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
      icon: 'users', // ✅ Changed from Users component to string
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
      icon: 'wifi', // ✅ Changed from Wifi component to string
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
      icon: 'gift', // ✅ Changed from Gift component to string
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
      icon: 'message-square', // ✅ Changed from MessageSquare component to string
      selectedChannels: ['sms', 'facebook', 'email'],
      // ✅ Opt-3: Remove hardcoded default content - let useEffect auto-populate from Segment + Action nodes
      channelContent: {}
    }
  },
  {
    id: '5',
    type: 'wait',
    position: { x: 950, y: 250 },
    data: { label: 'Wait 3 Days', waitType: 'duration', durationValue: 3, durationUnit: 'days' }
    // ✅ No icon needed for wait nodes, will use default
  },
  {
    id: '6',
    type: 'logic',
    position: { x: 950, y: 350 },
    data: {
      label: 'Check Purchase',
      icon: 'split', // ✅ Changed from Split component to string
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
  // ✅ Phase 2: Campaign Persistence
  const {
    loadCampaign,
    saveCampaign,
    getCampaignIdFromUrl,
    updateUrlWithCampaignId,
    loading: loadingCampaign,
    saving: savingCampaign,
    error: persistenceError
  } = useCampaignPersistence();

  // ✅ Phase 2: Campaign Simulator (Real-time Interactive Closed Loop)
  const {
    simulateCampaign,
    simulating,
    error: simulateError,
    liveStatus,
    stopListening
  } = useCampaignSimulator();

  // Campaign ID state
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // State for Live Demo Modal
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoEmails, setDemoEmails] = useState<string[]>(['']); // ✅ Fix-5: Support multiple emails
  const [liveLogs, setLiveLogs] = useState<Array<{ time: string; message: string; type: 'info' | 'success' | 'warning' }>>([]);

  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES);
  
  // ✅ Task 3: Share nodes with ChatAssistant via Context
  const { setNodes: setContextNodes } = useCanvasNodes();
  useEffect(() => {
    setContextNodes(nodes);
  }, [nodes, setContextNodes]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [campaignName, setCampaignName] = useState<string>('Untitled Campaign');
  const [isCampaignListOpen, setIsCampaignListOpen] = useState(false);
  const [campaigns, setCampaigns] = useState<Array<{ id: string; name: string; status: string; updated_at: string }>>([]);
  
  // ✅ Grace Period Ref: Store timeout for delayed menu close
  const closeDelayRef = useRef<NodeJS.Timeout | null>(null);

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

  // ✅ Grace Period Handlers: Prevent menu from disappearing when moving mouse across gap
  const handleMouseEnter = () => {
    // Clear any pending close timeout
    if (closeDelayRef.current) {
      clearTimeout(closeDelayRef.current);
      closeDelayRef.current = null;
    }
    // Open the palette immediately
    setIsPaletteOpen(true);
  };

  const handleMouseLeave = () => {
    // Don't close immediately - set a 300ms delay
    closeDelayRef.current = setTimeout(() => {
      setIsPaletteOpen(false);
      closeDelayRef.current = null;
    }, 300); // 300ms grace period
  };

  // ✅ Category 1.1: Click-to-open palette handler
  const handleTogglePalette = () => {
    setIsPaletteOpen(!isPaletteOpen);
    if (closeDelayRef.current) {
      clearTimeout(closeDelayRef.current);
      closeDelayRef.current = null;
    }
  };

  // ✅ Category 3.1: Campaign Management
  const handleCampaignNameChange = (newName: string) => {
    setCampaignName(newName);
  };

  const handleCampaignNameBlur = async () => {
    if (campaignName.trim() && campaignId) {
      // ✅ Fix: Include demoEmails when saving
      const validEmails = demoEmails.filter(email => email.trim().length > 0);
      await saveCampaign(campaignId, nodes, edges, campaignName.trim(), undefined, validEmails.length > 0 ? validEmails : undefined);
    }
  };

  const handleLoadCampaigns = async () => {
    try {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, name, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      setCampaigns(data || []);
      setIsCampaignListOpen(true);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
      setToastMessage({ type: 'error', message: 'Failed to load campaigns' });
    }
  };

  const handleLoadCampaign = async (id: string) => {
    const loaded = await loadCampaign(id);
    if (loaded) {
      setNodes(loaded.nodes);
      setEdges(loaded.edges);
      setCampaignId(id);
      // Load campaign name and demoEmails
      const { data } = await supabase
        .from('campaigns')
        .select('name, flow_definition')
        .eq('id', id)
        .single();
      if (data?.name) setCampaignName(data.name);
      // ✅ Fix: Load demoEmails from flow_definition.metadata
      if (data?.flow_definition) {
        const flowDef = data.flow_definition as any;
        const savedEmails = flowDef?.metadata?.demoEmails || [];
        if (savedEmails.length > 0) {
          setDemoEmails(savedEmails.length > 0 ? savedEmails : ['']);
        }
      }
      setIsCampaignListOpen(false);
      setToastMessage({ type: 'success', message: 'Campaign loaded' });
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setCampaigns(campaigns.filter(c => c.id !== id));
      setToastMessage({ type: 'success', message: 'Campaign deleted' });
    } catch (error) {
      console.error('Failed to delete campaign:', error);
      setToastMessage({ type: 'error', message: 'Failed to delete campaign' });
    }
  };

  // ✅ Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeDelayRef.current) {
        clearTimeout(closeDelayRef.current);
      }
    };
  }, []);

  // ✅ Phase 2: Load campaign on mount
  // ✅ Fix: Load campaign from URL parameter (for Edit button from Dashboard)
  useEffect(() => {
    const loadInitialCampaign = async () => {
      const urlCampaignId = getCampaignIdFromUrl();
      if (urlCampaignId) {
        console.log(`[CampaignCanvas] Loading campaign from URL: ${urlCampaignId}`);
        setCampaignId(urlCampaignId);
        const loaded = await loadCampaign(urlCampaignId);
        if (loaded && loaded.nodes.length > 0) {
          setNodes(loaded.nodes);
          setEdges(loaded.edges);
          // Load campaign name and demoEmails
          const { data } = await supabase
            .from('campaigns')
            .select('name, flow_definition')
            .eq('id', urlCampaignId)
            .single();
          if (data?.name) {
            setCampaignName(data.name);
          }
          // ✅ Fix: Load demoEmails from flow_definition.metadata
          if (data?.flow_definition) {
            const flowDef = data.flow_definition as any;
            const savedEmails = flowDef?.metadata?.demoEmails || [];
            if (savedEmails.length > 0) {
              setDemoEmails(savedEmails);
            }
          }
          setToastMessage({ type: 'success', message: 'Campaign loaded successfully' });
        } else {
          console.warn(`[CampaignCanvas] Campaign ${urlCampaignId} not found or has no nodes`);
        }
      }
    };
    loadInitialCampaign();
  }, []); // Only run on mount
  
  // ✅ Fix: Also listen for URL changes (when navigating from Dashboard)
  useEffect(() => {
    const handleUrlChange = () => {
      const urlCampaignId = getCampaignIdFromUrl();
      if (urlCampaignId && urlCampaignId !== campaignId) {
        console.log(`[CampaignCanvas] URL changed, loading campaign: ${urlCampaignId}`);
        loadCampaign(urlCampaignId).then(loaded => {
          if (loaded && loaded.nodes.length > 0) {
            setCampaignId(urlCampaignId);
            setNodes(loaded.nodes);
            setEdges(loaded.edges);
            // Load campaign name and demoEmails
            supabase
              .from('campaigns')
              .select('name, flow_definition')
              .eq('id', urlCampaignId)
              .single()
              .then(({ data }) => {
                if (data?.name) {
                  setCampaignName(data.name);
                }
                // ✅ Fix: Load demoEmails from flow_definition.metadata
                if (data?.flow_definition) {
                  const flowDef = data.flow_definition as any;
                  const savedEmails = flowDef?.metadata?.demoEmails || [];
                  if (savedEmails.length > 0) {
                    setDemoEmails(savedEmails);
                  }
                }
              });
            setToastMessage({ type: 'success', message: 'Campaign loaded successfully' });
          }
        });
      }
    };
    
    // Check URL immediately (in case URL changed before component mounted)
    handleUrlChange();
    
    // Listen for popstate (back/forward) and custom events
    window.addEventListener('popstate', handleUrlChange);
    // Also check periodically (for React Router navigation)
    const interval = setInterval(handleUrlChange, 500);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      clearInterval(interval);
    };
  }, [campaignId, loadCampaign, getCampaignIdFromUrl]);

  // ✅ Task 2: Fetch offers for Action Node configuration
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        const data = await dataService.getOffers();
        setOffers(data);
      } catch (error) {
        console.error('Failed to fetch offers:', error);
      }
    };
    fetchOffers();
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tagInputRef.current && !tagInputRef.current.contains(event.target as any)) {
        setIsTagDropdownOpen(false);
      }
      if (appInputRef.current && !appInputRef.current.contains(event.target as any)) {
        setIsAppDropdownOpen(false);
      }
      if (locationInputRef.current && !locationInputRef.current.contains(event.target as any)) {
        setIsLocationDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ Phase 2: Toast notification auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

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

  // ✅ Fix: Accept iconKey as string instead of component
  const addNode = (type: string, label: string, iconKey: string, data: any = {}) => {
    const id = (nodes.length + 1).toString();
    const newNode: Node = {
      id,
      type,
      position: { x: 100, y: 100 + (nodes.length * 50) },
      data: { label, icon: iconKey, ...data }, // ✅ Store string identifier
    };
    setNodes((nds) => nds.concat(newNode));
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  // ✅ Phase 2: Real-time Audience Estimation for selected segment node
  const selectedSegmentNode = selectedNodeId && selectedNode?.type === 'segment'
    ? selectedNode
    : null;
  const segmentCriteria = selectedSegmentNode
    ? (selectedSegmentNode.data as CampaignNodeData).segmentCriteria
    : undefined;
  const { audienceSize, loading: estimatingAudience } = useAudienceEstimator(segmentCriteria);

  // Update audienceSize in the selected segment node
  useEffect(() => {
    if (selectedSegmentNode && audienceSize !== null) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedSegmentNode.id) {
            return { ...node, data: { ...node.data, audienceSize } };
          }
          return node;
        })
      );
    }
  }, [audienceSize, selectedSegmentNode?.id]);

  // ✅ Phase 2: Save Campaign Handler
  // ✅ Category 3.1: Updated to save campaign name
  const handleSaveCampaign = async () => {
    // ✅ Fix: Include demoEmails when saving
    const validEmails = demoEmails.filter(email => email.trim().length > 0);
    const result = await saveCampaign(
      campaignId,
      nodes,
      edges,
      campaignName.trim() || undefined, // ✅ Category 3.1: Save campaign name
      'draft',
      validEmails.length > 0 ? validEmails : undefined // ✅ Fix: Include demoEmails
    );

    if (result.success && result.campaignId) {
      setCampaignId(result.campaignId);
      updateUrlWithCampaignId(result.campaignId);
      setToastMessage({
        type: 'success',
        message: 'Campaign saved successfully!'
      });
    } else {
      setToastMessage({
        type: 'error',
        message: result.error || 'Failed to save campaign'
      });
    }
  };

  // ✅ Real-time Interactive Closed Loop: Open Demo Modal
  const handleOpenDemo = () => {
    setShowDemoModal(true);
    // ✅ Fix-5: Load saved emails from campaign if available
    if (campaignId) {
      // Try to load from flow_definition
      const segmentNode = nodes.find(n => n.type === 'segment');
      const segmentData = segmentNode?.data as CampaignNodeData;
      // We'll load emails from saved campaign data later
    } else {
      setDemoEmails(['']);
    }
    setLiveLogs([]);
  };
  
  // ✅ Fix-5: Add email to list
  const handleAddEmail = () => {
    setDemoEmails(prev => [...prev, '']);
  };
  
  // ✅ Fix-5: Remove email from list
  const handleRemoveEmail = (index: number) => {
    setDemoEmails(prev => prev.filter((_, i) => i !== index));
  };
  
  // ✅ Fix-5: Update email in list
  const handleUpdateEmail = (index: number, value: string) => {
    setDemoEmails(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  // ✅ Real-time Interactive Closed Loop: Start Live Demo
  const handleStartLiveDemo = async () => {
    // ✅ Fix-5: Validate at least one email is entered
    const validEmails = demoEmails.filter(email => email.trim().length > 0);
    if (validEmails.length === 0) {
      setToastMessage({
        type: 'error',
        message: 'Please enter at least one recipient email address'
      });
      return;
    }

    // Find the first segment node
    const segmentNode = nodes.find(n => n.type === 'segment');
    if (!segmentNode) {
      setToastMessage({
        type: 'error',
        message: 'Please add a Segment node to simulate'
      });
      return;
    }

    const segmentData = segmentNode.data as CampaignNodeData;
    const criteria = segmentData.segmentCriteria;

    if (!criteria) {
      setToastMessage({
        type: 'error',
        message: 'Please configure segment criteria'
      });
      return;
    }

    // Find the first action node to get offer details
    const actionNode = nodes.find(n => n.type === 'action');
    const actionData = actionNode?.data as CampaignNodeData;
    const offerName = actionData?.productName || actionData?.couponName || 'Campaign Offer';
    const productId = actionData?.productId || '';
    const offerId = actionData?.offerId; // ✅ Fix-1: Get offerId from Action node

    if (!productId && !offerId) {
      setToastMessage({
        type: 'error',
        message: 'Please select an offer or product in the Action node'
      });
      return;
    }

    // Get marketing copy from Channel node (if available)
    const channelNode = nodes.find(n => n.type === 'channel');
    const channelData = channelNode?.data as CampaignNodeData;
    const marketingCopy = channelData?.channelContent?.email?.text ||
      channelData?.channelContent?.sms?.text ||
      `Don't miss out on this exclusive offer: ${offerName}!`;

    // ✅ Fix: Check if campaign ID is valid
    let activeId = campaignId;

    if (!activeId || activeId.startsWith('sim-')) {
      setLiveLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: 'Saving campaign before simulation...',
        type: 'info'
      }]);

      const saveResult = await saveCampaign(null, nodes, edges, undefined, 'draft');

      if (!saveResult.success || !saveResult.campaignId) {
        setToastMessage({
          type: 'error',
          message: saveResult.error || 'Failed to save campaign'
        });
        return;
      }

      activeId = saveResult.campaignId;
      setCampaignId(activeId);
      updateUrlWithCampaignId(activeId);
    }

    // ✅ Fix-5: Save emails to campaign before simulation
    const validEmailsList = demoEmails.filter(email => email.trim().length > 0);
    
    // Save campaign with emails in flow_definition
    const saveResultWithEmails = await saveCampaign(
      activeId,
      nodes,
      edges,
      undefined,
      'draft',
      validEmailsList // ✅ Fix-5: Pass emails to save
    );
    
    if (!saveResultWithEmails.success) {
      setToastMessage({
        type: 'error',
        message: saveResultWithEmails.error || 'Failed to save campaign with emails'
      });
      return;
    }
    
    activeId = saveResultWithEmails.campaignId || activeId;
    setCampaignId(activeId);
    updateUrlWithCampaignId(activeId);

    // Clear previous logs
    setLiveLogs([{
      time: new Date().toLocaleTimeString(),
      message: `Starting live demo for ${validEmailsList.length} recipient(s)...`,
      type: 'info'
    }]);

    // ✅ Fix-5: Send emails to all recipients
    const results = await Promise.all(
      validEmailsList.map(async (email) => {
        const result = await simulateCampaign(
          activeId,
          criteria,
          offerName,
          productId,
          offerId,
          email.trim(),
          marketingCopy,
          (status) => {
            setLiveLogs(prev => [...prev, {
              time: new Date().toLocaleTimeString(),
              message: `[${email}] ${status.message}`,
              type: status.stage === 'converted' ? 'success' :
                status.stage === 'clicked' ? 'success' :
                  status.stage === 'sent' ? 'success' : 'info'
            }]);
          }
        );
        return { email, result };
      })
    );

    const successCount = results.filter(r => r.result.success).length;
    const failCount = results.length - successCount;

    if (successCount > 0) {
      setLiveLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `✅ ${successCount} email(s) sent successfully!`,
        type: 'success'
      }]);
    }
    
    if (failCount > 0) {
      setLiveLogs(prev => [...prev, {
        time: new Date().toLocaleTimeString(),
        message: `❌ ${failCount} email(s) failed to send`,
        type: 'warning'
      }]);
      setToastMessage({
        type: 'error',
        message: `${failCount} email(s) failed to send`
      });
    }
  };

  // ✅ Legacy: Simple Simulate (for backward compatibility)
  const handleSimulate = async () => {
    handleOpenDemo();
  };

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
  // ✅ Moved to ConfigurationDrawer component

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

            {/* ✅ Fix-6: Fixed Toolbar Positioning (Left, Vertically Centered) */}
            <Panel position="top-left" className="!left-4 !top-1/2 !-translate-y-1/2 !transform">
              <div className="relative">
                <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 flex flex-col gap-1">
                  {/* Pointer (Selection Mode) */}
                  <button 
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="Selection Mode"
                  >
                    <MousePointer2 size={18} />
          </button>
                  
                  {/* Hand (Pan Mode - Default) */}
                  <button 
                    className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-indigo-600 transition-colors"
                    title="Pan Mode"
                  >
                    <Hand size={18} />
                  </button>
                  
                  <div className="h-px bg-slate-200 w-full my-1"></div>
                  
                  {/* Plus (Toggle Node Palette) */}
                      <button
                    onClick={handleTogglePalette}
                    className={`p-2 rounded-lg transition-colors ${
                      isPaletteOpen 
                        ? 'bg-indigo-100 text-indigo-600' 
                        : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                    }`}
                    title="Add Node"
                  >
                    <Plus size={18} />
                      </button>
              </div>

                {/* ✅ Category 1.1: Click-to-open Node Palette with Backdrop */}
                {isPaletteOpen && (
                  <>
                    {/* Backdrop */}
                    <div 
                      className="fixed inset-0 z-40"
                      onClick={() => setIsPaletteOpen(false)}
                    />
                    
                    {/* Palette */}
                    <div 
                      className="absolute left-full top-0 ml-2 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 z-50 animate-in slide-in-from-left-2 duration-200"
                      onClick={(e) => e.stopPropagation()}
                    >
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Node Palette</h4>

                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 mb-2">TRIGGERS</p>
                        <div className="space-y-2">
                          <button onClick={() => addNode('trigger', 'Event Trigger', 'zap')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-amber-50 border border-transparent hover:border-amber-100 group transition-all">
                            <div className="p-1.5 bg-amber-100 text-amber-600 rounded"><Zap size={14} /></div>
                            <span className="text-sm font-medium text-slate-700">Event Trigger</span>
                          </button>
                          <button onClick={() => addNode('trigger', 'Schedule', 'clock')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 group transition-all">
                            <div className="p-1.5 bg-slate-100 text-slate-600 rounded"><Clock size={14} /></div>
                            <span className="text-sm font-medium text-slate-700">Schedule</span>
                          </button>
                    </div>
                  </div>

                    <div>
                        <p className="text-[10px] font-bold text-slate-500 mb-2">STRATEGY</p>
                        <div className="space-y-2">
                          <button onClick={() => addNode('action', 'Offer / Action', 'gift', { actionType: 'marketing' })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-pink-50 border border-transparent hover:border-pink-100 group transition-all">
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
                          <button onClick={() => addNode('channel', 'Omni-Channel Blast', 'message-square', { selectedChannels: ['sms', 'email'] })} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-emerald-50 border border-transparent hover:border-emerald-100 group transition-all">
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
                          <button onClick={() => addNode('logic', 'Condition Split', 'split')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100 group transition-all">
                            <div className="p-1.5 bg-blue-100 text-blue-600 rounded"><Split size={14} /></div>
                            <span className="text-sm font-medium text-slate-700">Condition Split</span>
                    </button>
                          <button onClick={() => addNode('wait', 'Wait Duration', 'clock')} className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 group transition-all">
                            <div className="p-1.5 bg-slate-100 text-slate-600 rounded"><RotateCcw size={14} /></div>
                            <span className="text-sm font-medium text-slate-700">Wait Duration</span>
                          </button>
                </div>
              </div>
                  </div>
                    </div>
                  </>
                )}
              </div>
            </Panel>

            <CanvasControls />

            <Controls showInteractive={false} className="!hidden" />
          </ReactFlow>

          {/* Right Floating Configuration Panel */}
          {/* Configuration Drawer */}
          <ConfigurationDrawer
            node={selectedNode}
            onClose={() => setSelectedNodeId(null)}
            onUpdateNode={updateNodeData}
            products={products}
            coupons={coupons}
            offers={offers}
            nodes={nodes}
          />

          {/* ✅ Category 3.1 & 1.3: Top Header Overlay with Campaign Management */}
          <div className="absolute top-6 left-24 right-6 flex justify-between items-center pointer-events-none z-20">
            <div className="pointer-events-auto flex items-center gap-4">
              {/* ✅ Category 3.1: Editable Campaign Name */}
                    <input
                      type="text"
                value={campaignName}
                onChange={(e) => handleCampaignNameChange(e.target.value)}
                onBlur={handleCampaignNameBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
                className="text-2xl font-bold text-slate-900 bg-transparent border-none outline-none focus:outline-none focus:ring-0 px-2 py-1 rounded hover:bg-slate-50 focus:bg-white focus:shadow-sm transition-colors min-w-[200px] max-w-[400px]"
                placeholder="Untitled Campaign"
              />
              <span className="px-2 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded">Draft Mode</span>
              
              {/* ✅ Category 3.1: Campaign List Button */}
              <button
                onClick={handleLoadCampaigns}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-slate-600 font-medium rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors"
                title="Load Campaign"
              >
                <FolderOpen size={16} />
              </button>
                          </div>
            <div className="pointer-events-auto flex gap-3">
              {/* ✅ Category 1.3: Removed AI Copilot button (integrated into ChatAssistant) */}
              <button
                onClick={handleSimulate}
                disabled={simulating}
                className="flex items-center gap-2 px-4 py-2 bg-white text-slate-700 font-bold rounded-lg hover:bg-slate-50 border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {simulating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Simulating...
                  </>
                ) : (
                  <>
                    <Play size={16} /> Simulate
                  </>
                )}
              </button>
              <button
                onClick={handleSaveCampaign}
                disabled={savingCampaign}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingCampaign ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Campaign
                  </>
                )}
              </button>
                  </div>
                  </div>

          {/* ✅ Category 3.1: Campaign List Modal */}
          {isCampaignListOpen && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-500 text-white p-6 flex justify-between items-center">
                    <div>
                    <h2 className="text-2xl font-bold mb-1">Campaigns</h2>
                    <p className="text-indigo-100 text-sm">Select a campaign to load or delete</p>
                    </div>
                    <button
                    onClick={() => setIsCampaignListOpen(false)}
                    className="text-white/80 hover:text-white"
                  >
                    <X size={24} />
                    </button>
                  </div>
                <div className="flex-1 overflow-y-auto p-6">
                  {campaigns.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <FileText size={48} className="mx-auto mb-4 text-slate-300" />
                      <p className="text-lg font-medium">No campaigns found</p>
                      <p className="text-sm mt-2">Create a new campaign by saving this canvas</p>
                </div>
                  ) : (
                    <div className="space-y-2">
                      {campaigns.map((campaign) => (
                        <div
                          key={campaign.id}
                          className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900">{campaign.name || 'Untitled Campaign'}</h3>
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              <span className={`px-2 py-0.5 rounded font-medium ${
                                campaign.status === 'active' ? 'bg-emerald-100 text-emerald-700' :
                                campaign.status === 'paused' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-200 text-slate-600'
                              }`}>
                                {campaign.status || 'draft'}
                              </span>
                              <span>{new Date(campaign.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
                          <div className="flex items-center gap-2">
                  <button
                              onClick={() => handleLoadCampaign(campaign.id)}
                              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm transition-colors"
                  >
                              Load
                  </button>
                  <button
                              onClick={() => handleDeleteCampaign(campaign.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Campaign"
                  >
                              <Trash2 size={18} />
                  </button>
                </div>
              </div>
                      ))}
                    </div>
                  )}
                </div>
                        </div>
                      </div>
                    )}

          {/* ✅ Phase 2: Toast Notification */}
          {toastMessage && (
            <Panel position="top-center" className="m-6 pointer-events-auto z-30">
              <div className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${toastMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-800'
                }`}>
                {toastMessage.type === 'success' ? (
                  <CheckCircle size={20} className="text-emerald-600" />
                ) : (
                  <XCircle size={20} className="text-red-600" />
                )}
                <span className="text-sm font-medium">{toastMessage.message}</span>
                <button
                  onClick={() => setToastMessage(null)}
                  className="ml-2 text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
                  </div>
            </Panel>
          )}

          {/* ✅ Real-time Interactive Closed Loop: Live Demo Modal */}
          {showDemoModal && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-500 text-white p-6 flex justify-between items-center">
              <div>
                    <h2 className="text-2xl font-bold mb-1">Start Live Demo</h2>
                    <p className="text-indigo-100 text-sm">Send a real email and track the journey</p>
                  </div>
                      <button
                        onClick={() => {
                      setShowDemoModal(false);
                      stopListening();
                      setLiveLogs([]);
                    }}
                    className="text-white/80 hover:text-white"
                  >
                    <X size={24} />
                      </button>
              </div>

                {/* Modal Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {/* ✅ Fix-5: Multiple Email Inputs */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-bold text-slate-700">
                        Recipient Email Addresses
                      </label>
                      <button
                        type="button"
                        onClick={handleAddEmail}
                        disabled={simulating}
                        className="text-xs px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        <Plus size={14} />
                        Add Email
                      </button>
                    </div>
                    <div className="space-y-2">
                      {demoEmails.map((email, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => handleUpdateEmail(index, e.target.value)}
                            placeholder="your-email@example.com"
                            className="flex-1 px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                            disabled={simulating}
                          />
                          {demoEmails.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(index)}
                              disabled={simulating}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Add multiple email addresses to test the campaign with different recipients
                    </p>
              </div>

                  {/* Live Logs Panel */}
                  {liveLogs.length > 0 && (
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Radio className="text-indigo-600" size={18} />
                        <h3 className="font-bold text-slate-900">Live Activity Log</h3>
                      </div>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {liveLogs.map((log, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-3 p-2 rounded-lg ${log.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
                                log.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
                                  'bg-white border border-slate-200'
                              }`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-2 ${log.type === 'success' ? 'bg-emerald-500' :
                                log.type === 'warning' ? 'bg-amber-500' :
                                  'bg-indigo-500'
                              }`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono text-slate-500">{log.time}</span>
                                {log.type === 'success' && <CheckCircle size={14} className="text-emerald-600" />}
                                {log.type === 'warning' && <XCircle size={14} className="text-amber-600" />}
                              </div>
                              <p className={`text-sm ${log.type === 'success' ? 'text-emerald-800' :
                                  log.type === 'warning' ? 'text-amber-800' :
                                    'text-slate-700'
                                }`}>
                                {log.message}
                              </p>
                            </div>
                          </div>
                  ))}
                </div>
                    </div>
                  )}

                  {/* Status Indicator */}
                  {liveStatus.stage !== 'idle' && (
                    <div className={`p-4 rounded-lg border-2 ${liveStatus.stage === 'converted' ? 'bg-emerald-50 border-emerald-300' :
                        liveStatus.stage === 'clicked' ? 'bg-indigo-50 border-indigo-300' :
                          liveStatus.stage === 'sent' ? 'bg-blue-50 border-blue-300' :
                            'bg-slate-50 border-slate-300'
                      }`}>
                      <div className="flex items-center gap-3">
                        {liveStatus.stage === 'converted' && <CheckCircle className="text-emerald-600" size={24} />}
                        {liveStatus.stage === 'clicked' && <Target className="text-indigo-600" size={24} />}
                        {liveStatus.stage === 'sent' && <Mail className="text-blue-600" size={24} />}
                        {liveStatus.stage === 'sending' && <Loader2 className="text-slate-600 animate-spin" size={24} />}
                        <div>
                          <p className="font-bold text-slate-900 capitalize">{liveStatus.stage}</p>
                          <p className="text-sm text-slate-600">{liveStatus.message}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="border-t border-slate-200 p-6 flex justify-end gap-3">
                <button
                  onClick={() => {
                      setShowDemoModal(false);
                      stopListening();
                      setLiveLogs([]);
                    }}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                    disabled={simulating}
                  >
                    Cancel
                </button>
                      <button
                    onClick={handleStartLiveDemo}
                    disabled={simulating || demoEmails.every(email => !email.trim())}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {simulating ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                                  </>
                                ) : (
                                  <>
                        <Send size={18} />
                        Send Test Email
                                  </>
                                )}
                                </button>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Real-time Interactive Closed Loop: Floating Live Log Panel */}
          {liveLogs.length > 0 && !showDemoModal && (
            <Panel position="bottom-right" className="m-6 pointer-events-auto z-40">
              <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 max-h-96 overflow-hidden flex flex-col">
                <div className="bg-gradient-to-r from-indigo-600 to-emerald-500 text-white p-3 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Radio className="text-white animate-pulse" size={16} />
                    <span className="font-bold text-sm">Live Activity</span>
              </div>
          <button
                    onClick={() => {
                      setLiveLogs([]);
                      stopListening();
                    }}
                    className="text-white/80 hover:text-white"
                  >
                    <X size={16} />
          </button>
        </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-50">
                  {liveLogs.slice(-10).map((log, idx) => (
                    <div
                      key={idx}
                      className={`text-xs p-2 rounded ${log.type === 'success' ? 'bg-emerald-50 text-emerald-800' :
                          log.type === 'warning' ? 'bg-amber-50 text-amber-800' :
                            'bg-white text-slate-700'
                        }`}
                    >
                      <span className="font-mono text-slate-500">{log.time}</span>
                      <span className="ml-2">{log.message}</span>
                        </div>
                  ))}
                      </div>
                            </div>
            </Panel>
          )}
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default CampaignCanvas;