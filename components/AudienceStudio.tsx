
import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Search, Filter, Plus, TrendingUp, Users,
  Smartphone, Globe, MessageSquare, Tag, AlertCircle,
  ChevronRight, ChevronDown, CheckCircle, XCircle,
  MoreHorizontal, Brain, Zap, ArrowRight, LayoutGrid, Trash2, GripVertical,
  SlidersHorizontal, Check, X, Save, Edit2, Award
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { useAudienceOpportunities } from '../hooks/useCustomerData';
import { Loader2 } from 'lucide-react';
import { useUserTags } from '../hooks/useUserTags';
import { useUserSegments } from '../hooks/useUserSegments';
import { useAudienceFilter } from '../hooks/useAudienceFilter';
import { useAudienceEstimator, SegmentCriteria } from '../hooks/useAudienceEstimator';
import { AudienceBuilder } from './AudienceBuilder';

// --- Types & Interfaces ---

type LogicOp = 'AND' | 'OR';

interface FilterItem {
  id: string;
  category: string;
  operator: string;
  value: string | number;
  logic: LogicOp;
  type: 'select' | 'metric' | 'tag' | 'text';
  unit?: string;
}

// --- Configuration ---

// ✅ 只使用 profiles 表中实际存在的字段
const FILTER_DEFINITIONS: Record<string, any> = {
  // Demographics - 直接映射到 profiles 表字段
  'City': { type: 'select', operators: ['is'], values: ['Yangon', 'Mandalay', 'Nay Pyi Taw', 'Bago', 'Shan', 'Ayeyarwady'], field: 'city' },
  'Gender': { type: 'select', operators: ['is'], values: ['Male', 'Female'], field: 'gender' },
  'Device Type': { type: 'select', operators: ['is'], values: ['Android', 'iOS', 'iPhone', 'Feature Phone'], field: 'device_type' },
  'Tier': { type: 'select', operators: ['is'], values: ['Crown', 'Diamond', 'Platinum', 'Gold', 'Silver'], field: 'tier' },
  'Status': { type: 'select', operators: ['is'], values: ['Active', 'Inactive', 'Churned'], field: 'status' },

  // Metrics - 直接映射到 profiles 表字段
  'Age': { type: 'metric', operators: ['>', '>=', '=', '<', '<='], unit: 'years', field: 'age' },
  'ARPU': { type: 'metric', operators: ['>', '>=', '=', '<', '<='], unit: 'Ks', field: 'arpu_30d' },
  'Balance': { type: 'metric', operators: ['>', '>=', '=', '<', '<='], unit: 'Ks', field: 'balance' },

  // Interests (Tags) - 使用 user_tags 表
  'Interests': { type: 'tag', operators: ['contains'], values: [], field: 'tags' },

  // Fallback
  'default': { type: 'text', operators: ['contains'] }
};



// TAG_TAXONOMY is now loaded from database via useUserTags hook

const MOCK_INSIGHT_GENDER = [
  { name: 'Male', value: 55, color: '#6366f1' },
  { name: 'Female', value: 45, color: '#ec4899' },
];

const MOCK_INSIGHT_CHANNEL = [
  { channel: 'App', reach: 85 },
  { channel: 'SMS', reach: 98 },
  { channel: 'Facebook', reach: 60 },
  { channel: 'USSD', reach: 90 },
];

// --- Sub-Components ---

const OpportunityCard: React.FC<{ opp: any }> = ({ opp }) => (
  <div className="bg-white rounded-xl border border-indigo-100 shadow-sm p-4 flex gap-4 min-w-[400px] hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-indigo-50 to-white rounded-bl-full -z-0"></div>
    <div className="flex-1 space-y-3 z-10">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-100 rounded text-indigo-600">
            <Brain size={16} />
          </div>
          <h4 className="font-bold text-slate-900 text-sm">{opp.title}</h4>
        </div>
        <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded flex items-center gap-1">
          <TrendingUp size={12} /> {opp.growth}
        </span>
      </div>
      <p className="text-xs text-slate-600 leading-relaxed border-l-2 border-indigo-200 pl-2">
        {opp.description}
      </p>
      <div className="bg-slate-50 p-2 rounded border border-slate-100">
        <div className="flex items-center gap-1.5 mb-1">
          <Sparkles size={12} className="text-amber-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">AI Suggestion</span>
        </div>
        <p className="text-xs font-medium text-slate-800">{opp.suggestion}</p>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => {
            // Basic interaction simulation
            alert(`Creating segment for opportunity: ${opp.title}`);
            // In a real app, this would create a segment in Supabase
          }}
          className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition">
          Create Segment
        </button>
        <button className="px-3 py-1.5 border border-slate-200 text-slate-600 text-xs font-semibold rounded hover:bg-slate-50">
          Details
        </button>
      </div>
    </div>
    <div className="w-24 flex flex-col justify-end pb-2 opacity-80">
      <div className="h-16 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={opp.trendData}>
            <defs>
              <linearGradient id={`grad${opp.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2} fill={`url(#grad${opp.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-center text-slate-400 font-medium mt-1">Real-time Growth</p>
    </div>
  </div>
);

interface TagTreeItemProps {
  category: string;
  tags: Array<{ id: string; name: string; color: string; category: string }>;
  onSelectTag: (tag: string, category: string) => void;
  onEditTag: (tagId: string, tagName: string, tagCategory: string, tagColor: string) => void;
  onDeleteTag: (tagId: string, tagName: string) => void;
}

const TagTreeItem: React.FC<TagTreeItemProps> = ({ category, tags, onSelectTag, onEditTag, onDeleteTag }) => {
  const [expanded, setExpanded] = useState(true);
  const [hoveredTagId, setHoveredTagId] = useState<string | null>(null);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded text-slate-700 font-medium text-sm transition-colors group"
      >
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="group-hover:text-indigo-600 transition-colors">{category}</span>
        </div>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{tags.length}</span>
      </button>

      {expanded && (
        <div className="ml-4 pl-2 border-l border-slate-100 space-y-0.5 mt-1">
          {tags.map(tag => (
            <div
              key={tag.id}
              onMouseEnter={() => setHoveredTagId(tag.id)}
              onMouseLeave={() => setHoveredTagId(null)}
              className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-indigo-50 text-xs text-slate-600 group active:scale-[0.98] transition-all"
            >
              <div 
                className="flex items-center gap-2 flex-1"
                onClick={() => onSelectTag(tag.name, category)}
              >
                <span 
                  className="w-2 h-2 rounded-full" 
                  style={{ backgroundColor: tag.color }}
                  title="Tag Color"
                />
                <span className="flex-1">{tag.name}</span>
              </div>
              {/* ✅ Enhanced: Always show edit/delete buttons with better visibility */}
              <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditTag(tag.id, tag.name, tag.category, tag.color);
                  }}
                  className="p-1.5 hover:bg-indigo-100 rounded-lg text-indigo-600 transition-all hover:scale-110"
                  title="Edit Tag"
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTag(tag.id, tag.name);
                  }}
                  className="p-1.5 hover:bg-red-100 rounded-lg text-red-600 transition-all hover:scale-110"
                  title="Delete Tag"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ✅ New Component: Segment Tree Item
interface SegmentTreeItemProps {
  segments: Array<{ id: string; name: string; estimated_size?: number }>;
  onSelectSegment: (segmentId: string, segmentName: string) => void;
}

const SegmentTreeItem: React.FC<SegmentTreeItemProps> = ({ segments, onSelectSegment }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mb-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-2 hover:bg-slate-50 rounded text-slate-700 font-medium text-sm transition-colors group"
            >
              <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
          <span className="group-hover:text-purple-600 transition-colors">Saved Segments</span>
              </div>
        <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 rounded">{segments.length}</span>
      </button>

      {expanded && (
        <div className="ml-4 pl-2 border-l border-slate-100 space-y-0.5 mt-1">
          {segments.map(segment => (
            <div
              key={segment.id}
              className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-purple-50 text-xs text-slate-600 group active:scale-[0.98] transition-all"
              onClick={() => onSelectSegment(segment.id, segment.name)}
            >
              <div className="flex items-center gap-2 flex-1">
                <Users size={14} className="text-purple-600" />
                <span className="flex-1 font-medium">{segment.name}</span>
                {segment.estimated_size !== undefined && (
                  <span className="text-[10px] text-purple-600 bg-purple-100 px-1.5 py-0.5 rounded">
                    {segment.estimated_size.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ValueSelector = ({ filter, onChange, availableTags = [] }: { filter: FilterItem, onChange: (updates: Partial<FilterItem>) => void, availableTags?: string[] }) => {
  const config = FILTER_DEFINITIONS[filter.category] || FILTER_DEFINITIONS['default'];

  // Operator Selector
  const renderOperator = () => (
    <select
      className="bg-slate-50 border border-slate-200 text-slate-600 text-xs font-medium rounded px-2 py-1 outline-none focus:border-indigo-500 cursor-pointer hover:bg-white transition-colors"
      value={filter.operator}
      onChange={(e) => onChange({ operator: e.target.value })}
    >
      {(config.operators || ['is']).map((op: string) => (
        <option key={op} value={op}>{op}</option>
      ))}
    </select>
  );

  // Value Input based on type
  const renderValueInput = () => {
    if (config.type === 'select') {
      return (
        <select
          className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-3 py-1 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
          value={filter.value}
          onChange={(e) => onChange({ value: e.target.value })}
        >
          <option value="">Select...</option>
          {config.values.map((v: string) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      );
    }

    if (config.type === 'metric') {
      return (
        <div className="flex items-center gap-2">
          <input
            type="number"
            className="w-20 bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-100"
            value={filter.value}
            onChange={(e) => onChange({ value: Number(e.target.value) })}
            placeholder="0"
          />
          <span className="text-xs text-slate-400 font-medium">{config.unit}</span>
        </div>
      );
    }

    // ✅ Tag 类型：显示下拉选择器，让用户选择标签
    if (config.type === 'tag') {
      return (
        <select
          className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-3 py-1 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer min-w-[120px]"
          value={filter.value as string}
          onChange={(e) => onChange({ value: e.target.value })}
        >
          <option value="">Select tag...</option>
          {availableTags.map((tag: string) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      );
    }

    return (
      <span className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-3 py-1">
        {filter.value || 'Not set'}
      </span>
    );
  };

  return (
    <div className="flex items-center gap-2">
      {renderOperator()}
      {renderValueInput()}
    </div>
  );
};

const LogicSeparator = ({ logic, onToggle }: { logic: LogicOp, onToggle: () => void }) => (
  <div className="flex justify-center relative py-2">
    <div className="absolute inset-0 flex items-center" aria-hidden="true">
      <div className="w-full border-t border-slate-200"></div>
    </div>
    <button
      onClick={onToggle}
      className={`relative z-10 text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${logic === 'AND'
        ? 'text-indigo-600 bg-indigo-50 border-indigo-100 hover:bg-indigo-100'
        : 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100'
        }`}
    >
      {logic}
    </button>
  </div>
);

interface SmartBuilderProps {
  filters: FilterItem[];
  onRemoveFilter: (index: number) => void;
  onUpdateFilter: (index: number, updates: Partial<FilterItem>) => void;
  onAddPlaceholder: () => void;
  estimatedAudience: number;
  loadingAudience?: boolean;
  onSaveSegment?: () => void;
  availableTags?: string[];
}

const SmartBuilder = ({ filters, onRemoveFilter, onUpdateFilter, onAddPlaceholder, estimatedAudience, loadingAudience = false, onSaveSegment, availableTags = [] }: SmartBuilderProps) => {
  const [nlInput, setNlInput] = useState('');

  // Helper to determine visual style
  const getFilterStyle = (category: string) => {
    if (['City'].includes(category)) return { bg: 'bg-blue-100', text: 'text-blue-600', icon: Globe };
    if (['Interest', 'Interests'].includes(category)) return { bg: 'bg-purple-100', text: 'text-purple-600', icon: Smartphone };
    if (['ARPU', 'Balance', 'Age'].includes(category)) return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: TrendingUp };
    if (['Tier', 'Status'].includes(category)) return { bg: 'bg-amber-100', text: 'text-amber-600', icon: Award };
    if (['Gender', 'Device Type'].includes(category)) return { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: Users };
    return { bg: 'bg-indigo-100', text: 'text-indigo-600', icon: Tag };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* 1. NL Input Header */}
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/50 to-white">
        <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wide mb-2 flex items-center gap-1.5">
          <Sparkles size={14} className="text-indigo-600" /> AI Smart Selector
        </label>
        <div className="relative">
          <input
            type="text"
            className="w-full pl-10 pr-24 py-3 bg-white border border-indigo-200 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            placeholder="e.g. Find users in Yangon who play games but have low balance..."
            value={nlInput}
            onChange={(e) => setNlInput(e.target.value)}
          />
          <Search className="absolute left-3.5 top-3 text-indigo-400" size={18} />
          <button className="absolute right-2 top-2 px-3 py-1 bg-indigo-600 text-white text-xs font-medium rounded hover:bg-indigo-700 transition">
            Generate
          </button>
        </div>
      </div>

      {/* 2. Visual Builder Canvas */}
      <div className="flex-1 p-6 bg-slate-50 overflow-y-auto">
        <div className="max-w-3xl mx-auto space-y-1">
          {filters.length > 0 && (
            <div className="flex justify-center mb-4">
              <span className="text-xs font-bold text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                Include Users Matching
              </span>
            </div>
          )}

          {filters.length === 0 && (
            <div className="text-center py-10 opacity-50">
              <Filter size={48} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">No filters applied yet.</p>
              <p className="text-xs text-slate-400">Select tags from the left or use AI search above.</p>
            </div>
          )}

          {filters.map((filter, index) => {
            const style = getFilterStyle(filter.category);
            const Icon = style.icon;

            return (
              <React.Fragment key={filter.id}>
                {index > 0 && (
                  <LogicSeparator
                    logic={filters[index - 1].logic}
                    onToggle={() => onUpdateFilter(index - 1, { logic: filters[index - 1].logic === 'AND' ? 'OR' : 'AND' })}
                  />
                )}

                <div className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative group hover:border-indigo-300 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GripVertical size={16} className="text-slate-300 cursor-move" />

                    {/* Category Chip */}
                    <div className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md ${style.bg} ${style.text}`}>
                      <Icon size={14} />
                      <span className="text-xs font-bold">{filter.category}</span>
                    </div>

                    {/* Configurable Area */}
                    <ValueSelector
                      filter={filter}
                      onChange={(updates) => onUpdateFilter(index, updates)}
                      availableTags={availableTags}
                    />
                  </div>

                  <button
                    onClick={() => onRemoveFilter(index)}
                    className="text-slate-300 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </React.Fragment>
            );
          })}

          {/* Drop Zone */}
          <div
            onClick={onAddPlaceholder}
            className="mt-6 border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group active:scale-[0.99]"
          >
            <Plus size={24} className="mb-2 group-hover:text-indigo-500" />
            <p className="text-sm font-medium group-hover:text-indigo-600">Click to add another filter</p>
          </div>
        </div>
      </div>

      {/* 3. Footer Estimation */}
      <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Estimated Audience</p>
          <div className="flex items-baseline gap-2">
            {loadingAudience ? (
              <Loader2 className="animate-spin text-indigo-600" size={20} />
            ) : (
            <span className="text-2xl font-bold text-slate-900">
                {estimatedAudience.toLocaleString()}
            </span>
            )}
            <span className="text-sm font-medium text-slate-500">
              matching users
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {onSaveSegment && (
            <button 
              onClick={onSaveSegment}
              className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-50 rounded-lg border border-transparent flex items-center gap-2"
            >
              <Save size={14} /> Save Segment
            </button>
          )}
          <button className="px-6 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2">
            View Users <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

interface InsightPanelProps {
  users: any[];
  loading: boolean;
  audienceSize?: number | null;
  isEstimating?: boolean;
}

const InsightPanel = ({ users, loading, audienceSize, isEstimating = false }: InsightPanelProps) => {
  // Calculate gender distribution
  const genderData = useMemo(() => {
    const genderCounts: Record<string, number> = {};
    users.forEach(user => {
      const gender = user.gender || 'Unknown';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    
    const total = users.length || 1;
    return Object.entries(genderCounts).map(([name, count]) => ({
      name,
      value: Math.round((count / total) * 100),
      color: name === 'Male' ? '#6366f1' : name === 'Female' ? '#ec4899' : '#94a3b8'
    }));
  }, [users]);

  // Extract top tags
  const topTags = useMemo(() => {
    const tagCounts: Record<string, number> = {};
    users.forEach(user => {
      (user.tags || []).forEach((tag: string) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });
    
    return Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([tag]) => tag);
  }, [users]);

  if (loading || isEstimating) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 flex items-center justify-center h-full">
        <Loader2 className="animate-spin text-indigo-600" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 space-y-6 h-full overflow-y-auto">
    <div className="flex items-center gap-2 mb-2">
      <LayoutGrid size={18} className="text-slate-400" />
      <h3 className="font-bold text-slate-800 text-sm">Audience Snapshot</h3>
    </div>

    {/* Demographics */}
      {genderData.length > 0 && (
        <>
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gender Distribution</h4>
      <div className="flex items-center justify-between">
        <div className="h-24 w-24 w-full">
          <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                      <Pie data={genderData} innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                        {genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="flex-1 pl-4 space-y-2">
                {genderData.map(g => (
            <div key={g.name} className="flex justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: g.color }}></span>
                {g.name}
              </span>
              <span className="font-bold text-slate-900">{g.value}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>

    <div className="w-full h-px bg-slate-100"></div>
        </>
      )}

    {/* Keywords */}
      {topTags.length > 0 && (
        <>
    <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Tags</h4>
      <div className="flex flex-wrap gap-2">
              {topTags.map(tag => (
          <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
            {tag}
          </span>
        ))}
      </div>
    </div>

    <div className="w-full h-px bg-slate-100"></div>
        </>
      )}

      {/* User Count - MD3 Enhanced */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Total Users</h4>
        {isEstimating ? (
          <div className="flex items-center gap-2">
            <Loader2 className="animate-spin text-indigo-600" size={20} />
            <span className="text-lg text-slate-500">Calculating...</span>
        </div>
        ) : (
          <>
            <div className="text-3xl font-bold text-indigo-600 mb-1">
              {(audienceSize !== null && audienceSize !== undefined) ? audienceSize.toLocaleString() : users.length.toLocaleString()}
      </div>
            <p className="text-xs text-slate-500 mt-1">matching current filters</p>
          </>
        )}
    </div>
  </div>
);
};

// --- Main Component ---

const AudienceStudio: React.FC = () => {
  const { opportunities, loading: oppsLoading } = useAudienceOpportunities();
  const { tags, loading: tagsLoading, createTag, updateTag, deleteTag } = useUserTags();
  const { segments, createSegment, loading: segmentsLoading } = useUserSegments();

  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([]);
  const [showCreateTagModal, setShowCreateTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagCategory, setNewTagCategory] = useState('Custom');
  const [showSaveSegmentModal, setShowSaveSegmentModal] = useState(false);
  const [segmentName, setSegmentName] = useState('');
  
  // ✅ Task 3.1: State for new Segment Builder (using AudienceBuilder)
  const [newSegmentCriteria, setNewSegmentCriteria] = useState<SegmentCriteria>({});
  
  // ✅ Tag Edit/Delete Modal States
  const [showEditTagModal, setShowEditTagModal] = useState(false);
  const [editingTag, setEditingTag] = useState<{ id: string; name: string; category: string; color: string } | null>(null);
  const [editTagName, setEditTagName] = useState('');
  const [editTagCategory, setEditTagCategory] = useState('Custom');
  const [editTagColor, setEditTagColor] = useState('#6366f1');

  // ✅ 将 FilterItem 转换为 SegmentCriteria，完全参考 CampaignCanvas.tsx 的实现
  // 只使用 profiles 表中实际存在的字段
  const segmentCriteria: SegmentCriteria | undefined = useMemo(() => {
    if (activeFilters.length === 0) return undefined;

    const criteria: SegmentCriteria = {};
    
    activeFilters.forEach(filter => {
      // ✅ 跳过 value 为空或无效的筛选器
      if (filter.value === '' || filter.value === null || filter.value === undefined) {
        return;
      }

      const filterDef = FILTER_DEFINITIONS[filter.category] || FILTER_DEFINITIONS['default'];
      const field = filterDef.field;

      // ✅ 如果没有 field 定义，跳过
      if (!field) {
        return;
      }

      switch (field) {
        case 'city':
          // City 映射到 location_city
          criteria.city = filter.value as string;
          break;
        case 'gender':
          criteria.gender = filter.value as string;
          break;
        case 'tier':
          criteria.tier = filter.value as string;
          break;
        case 'status':
          // Status 映射到 activityType
          criteria.activityType = filter.value as string;
          break;
        case 'device_type':
          // Device Type 暂时不支持，因为 SegmentCriteria 中没有 device_type 字段
          // 可以通过 tags 或其他方式实现
          break;
        case 'age':
          // Age 需要根据 operator 设置 ageMin 或 ageMax
          const ageVal = Number(filter.value);
          if (!isNaN(ageVal)) {
            if (filter.operator === '>=' || filter.operator === '>') {
              criteria.ageMin = ageVal.toString();
            } else if (filter.operator === '<=' || filter.operator === '<') {
              criteria.ageMax = ageVal.toString();
            } else if (filter.operator === '=') {
              // 等于时，设置 min 和 max 为相同值
              criteria.ageMin = ageVal.toString();
              criteria.ageMax = ageVal.toString();
            }
          }
          break;
        case 'arpu_30d':
          // ARPU 需要根据 operator 设置 arpu.min 或 arpu.max
          const arpuVal = Number(filter.value);
          if (!isNaN(arpuVal)) {
            if (!criteria.arpu) criteria.arpu = {};
            if (filter.operator === '>=' || filter.operator === '>') {
              criteria.arpu.min = arpuVal.toString();
            } else if (filter.operator === '<=' || filter.operator === '<') {
              criteria.arpu.max = arpuVal.toString();
            } else if (filter.operator === '=') {
              // 等于时，设置一个小的范围
              criteria.arpu.min = (arpuVal - 0.01).toString();
              criteria.arpu.max = (arpuVal + 0.01).toString();
            }
          }
          break;
        case 'balance':
          // Balance 需要根据 operator 设置 balance.min 或 balance.max
          const balanceVal = Number(filter.value);
          if (!isNaN(balanceVal)) {
            if (!criteria.balance) criteria.balance = {};
            if (filter.operator === '>=' || filter.operator === '>') {
              criteria.balance.min = balanceVal.toString();
            } else if (filter.operator === '<=' || filter.operator === '<') {
              criteria.balance.max = balanceVal.toString();
            } else if (filter.operator === '=') {
              // 等于时，设置一个小的范围
              criteria.balance.min = (balanceVal - 0.01).toString();
              criteria.balance.max = (balanceVal + 0.01).toString();
            }
          }
          break;
        case 'tags':
          // Tags 添加到 tags 数组
          if (!criteria.tags) criteria.tags = [];
          criteria.tags.push(filter.value as string);
          break;
      }
    });

    return Object.keys(criteria).length > 0 ? criteria : undefined;
  }, [activeFilters]);

  // ✅ 使用 useAudienceEstimator 进行实时人数估算（与 CampaignCanvas.tsx 保持一致）
  const { audienceSize, loading: estimatingAudience } = useAudienceEstimator(segmentCriteria);
  
  // ✅ Task 3.1: Real-time count for new Segment Builder
  const { audienceSize: newSegmentAudienceSize, loading: estimatingNewSegment } = useAudienceEstimator(
    Object.keys(newSegmentCriteria).length > 0 ? newSegmentCriteria : undefined
  );
  
  // ✅ 使用 useAudienceFilter 获取实际用户列表
  const { users, count, loading: filterLoading } = useAudienceFilter(segmentCriteria);
  
  // ✅ 使用 audienceSize 作为估算值（如果 count 为 0 但 audienceSize 有值，说明还在加载）
  const estimatedCount = count > 0 ? count : (audienceSize ?? 0);

  // Group tags by category
  const tagsByCategory = useMemo(() => {
    const grouped: Record<string, typeof tags> = {};
    tags.forEach(tag => {
      if (!grouped[tag.category]) {
        grouped[tag.category] = [];
      }
      grouped[tag.category].push(tag);
    });
    return grouped;
  }, [tags]);

  const handleAddFilter = (tag: string, category: string) => {
    // Check if it's a tag from database
    const dbTag = tags.find(t => t.name === tag);
    
    if (dbTag) {
      // It's a database tag - add as Interests filter
      const newFilter: FilterItem = {
        id: Date.now().toString(),
        category: 'Interests',
        operator: 'contains',
        value: tag,
        logic: 'AND',
        type: 'tag'
      };
      setActiveFilters([...activeFilters, newFilter]);
      return;
    }

    // ✅ 只使用 FILTER_DEFINITIONS 中定义的字段（profiles 表中存在的字段）
    const def = FILTER_DEFINITIONS[tag] || FILTER_DEFINITIONS['default'];
    if (!def || def === FILTER_DEFINITIONS['default']) {
      // 如果不在定义中，可能是自定义标签，跳过
      console.warn(`Filter "${tag}" is not in FILTER_DEFINITIONS, skipping...`);
      return;
    }

    const newFilter: FilterItem = {
      id: Date.now().toString(),
      category: tag,
      operator: def.operators ? def.operators[0] : 'is',
      value: def.values ? def.values[0] : (def.type === 'metric' ? 0 : ''),
      logic: 'AND',
      type: def.type || 'text',
      unit: def.unit
    };

    setActiveFilters([...activeFilters, newFilter]);
  };

  const handleUpdateFilter = (index: number, updates: Partial<FilterItem>) => {
    const newFilters = [...activeFilters];
    newFilters[index] = { ...newFilters[index], ...updates };
    setActiveFilters(newFilters);
  };

  const handleRemoveFilter = (index: number) => {
    const newFilters = [...activeFilters];
    newFilters.splice(index, 1);
    setActiveFilters(newFilters);
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    
    const tag = await createTag(newTagName.trim(), newTagCategory);
    if (tag) {
      setShowCreateTagModal(false);
      setNewTagName('');
      setNewTagCategory('Custom');
    }
  };

  // ✅ Handle Edit Tag
  const handleEditTag = (tagId: string, tagName: string, tagCategory: string, tagColor: string) => {
    setEditingTag({ id: tagId, name: tagName, category: tagCategory, color: tagColor });
    setEditTagName(tagName);
    setEditTagCategory(tagCategory);
    setEditTagColor(tagColor);
    setShowEditTagModal(true);
  };

  // ✅ Handle Save Edited Tag
  const handleSaveEditedTag = async () => {
    if (!editingTag || !editTagName.trim()) return;
    
    const success = await updateTag(editingTag.id, {
      name: editTagName.trim(),
      category: editTagCategory,
      color: editTagColor
    });
    
    if (success) {
      setShowEditTagModal(false);
      setEditingTag(null);
      setEditTagName('');
      setEditTagCategory('Custom');
      setEditTagColor('#6366f1');
    }
  };

  // ✅ Handle Delete Tag
  const handleDeleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Are you sure you want to delete the tag "${tagName}"? This action cannot be undone.`)) {
      return;
    }
    
    const success = await deleteTag(tagId);
    if (success) {
      // Tag will be automatically removed from the list via useUserTags hook
    }
  };

  const handleSaveSegment = async () => {
    if (!segmentName.trim()) return;
    
    // ✅ Fix-4: Use newSegmentCriteria (from AudienceBuilder) instead of old segmentCriteria
    const criteriaToSave = Object.keys(newSegmentCriteria).length > 0 ? newSegmentCriteria : segmentCriteria;
    if (!criteriaToSave) {
      console.warn('[AudienceStudio] No criteria to save');
      return;
    }
    
    // ✅ Fix-4: Use newSegmentAudienceSize instead of estimatedCount
    const audienceCount = newSegmentAudienceSize !== null ? newSegmentAudienceSize : estimatedCount;
    
    const segment = await createSegment(
      segmentName.trim(),
      criteriaToSave,
      undefined,
      audienceCount
    );
    
    if (segment) {
      setShowSaveSegmentModal(false);
      setSegmentName('');
      // ✅ Reset newSegmentCriteria after successful save
      if (Object.keys(newSegmentCriteria).length > 0) {
        setNewSegmentCriteria({});
      }
    }
  };

  return (
    <div className="space-y-6 pb-6 h-full flex flex-col">
      {/* 1. Top Section: AI Opportunity Hunter */}
      <section className="shrink-0">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg text-white shadow-md shadow-indigo-200">
            <Brain size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-none">AI Opportunity Hunter</h2>
            <p className="text-sm text-slate-500 mt-0.5">Real-time detection of micro-segment opportunities.</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide min-h-[220px]">
          {oppsLoading ? (
            <div className="flex items-center justify-center w-full h-48 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <Loader2 className="animate-spin" size={24} />
                <span className="text-xs font-medium">Scanning for patterns...</span>
              </div>
            </div>
          ) : opportunities.length > 0 ? (
            opportunities.map(opp => <OpportunityCard key={opp.id} opp={opp} />)
          ) : (
            <div className="flex items-center justify-center w-full h-48 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
              <span className="text-slate-400 text-sm">No new opportunities detected.</span>
            </div>
          )}

          {!oppsLoading && opportunities.length > 0 && (
            <div className="min-w-[100px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
              <MoreHorizontal size={24} />
              <span className="text-xs font-bold mt-2">View All</span>
            </div>
          )}
        </div>
      </section>

      {/* 2. Main Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">

        {/* Left Sidebar: Tag Taxonomy - MD3 Enhanced */}
        <div className="col-span-3 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Tag size={16} className="text-slate-500" /> Tag Library
            </h3>
            <Filter size={14} className="text-slate-400 hover:text-indigo-600 cursor-pointer" />
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {tagsLoading || segmentsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              </div>
            ) : (
              <>
                {/* ✅ Tags Section */}
                {Object.keys(tagsByCategory).length === 0 ? (
                  <div className="text-center py-4 text-slate-400 text-xs">
                    No tags found. Create your first tag!
                  </div>
                ) : (
                  Object.entries(tagsByCategory).map(([cat, categoryTags]) => (
              <TagTreeItem
                key={cat}
                category={cat}
                      tags={categoryTags.map(t => ({ id: t.id, name: t.name, color: t.color, category: t.category }))}
                onSelectTag={handleAddFilter}
                      onEditTag={handleEditTag}
                      onDeleteTag={handleDeleteTag}
                    />
                  ))
                )}

                {/* ✅ Segments Section */}
                {segments.length > 0 && (
                  <>
                    {Object.keys(tagsByCategory).length > 0 && (
                      <div className="my-2 border-t border-slate-200"></div>
                    )}
                    <SegmentTreeItem
                      segments={segments.map(s => ({ id: s.id, name: s.name, estimated_size: s.estimated_size }))}
                      onSelectSegment={(segmentId, segmentName) => {
                        // ✅ When a Segment is selected, apply its criteria to the builder
                        const segment = segments.find(s => s.id === segmentId);
                        if (segment && segment.criteria) {
                          // Apply segment criteria to newSegmentCriteria
                          setNewSegmentCriteria(segment.criteria);
                        }
                      }}
                    />
                  </>
                )}
              </>
            )}
          </div>
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
            <button 
              onClick={() => setShowCreateTagModal(true)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 w-full"
            >
              <Plus size={14} /> Create New Tag
            </button>
          </div>
        </div>

        {/* Center: Builder - MD3 Enhanced */}
        <div className="col-span-6 h-full flex flex-col">
          {/* ✅ MD3 Design: Enhanced Card with Better Visual Hierarchy */}
          <div className="flex-1 overflow-y-auto bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-6">
            <div className="mb-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI SMART SELECTOR</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Build advanced customer segments with condition groups</p>
                </div>
              </div>
            </div>
            
            <AudienceBuilder
              criteria={newSegmentCriteria}
              onChange={setNewSegmentCriteria}
              audienceSize={newSegmentAudienceSize}
              isEstimating={estimatingNewSegment}
              showVerifyButton={false}
          />
        </div>

          {/* ✅ MD3 Design: Save Button with Enhanced Visual Feedback */}
          <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <Users size={20} className="text-indigo-600" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase mb-1 tracking-wider">Ready to Save</div>
                <div className="text-sm text-slate-600">
                  {Object.keys(newSegmentCriteria).length > 0 
                    ? `${newSegmentAudienceSize !== null ? newSegmentAudienceSize.toLocaleString() : 'Calculating...'} users will be included`
                    : 'Configure segment criteria first'}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                if (Object.keys(newSegmentCriteria).length > 0 && newSegmentAudienceSize !== null) {
                  setSegmentName('');
                  setShowSaveSegmentModal(true);
                }
              }}
              disabled={Object.keys(newSegmentCriteria).length === 0 || newSegmentAudienceSize === null || estimatingNewSegment}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 font-semibold text-sm transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save size={16} />
              Save as Segment
            </button>
          </div>
        </div>

        {/* Right: Insights - MD3 Enhanced */}
        <div className="col-span-3 h-full">
          <InsightPanel 
            users={users} 
            loading={filterLoading} 
            audienceSize={newSegmentAudienceSize}
            isEstimating={estimatingNewSegment}
          />
        </div>

      </div>

      {/* Create Tag Modal */}
      {showCreateTagModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Create New Tag</h3>
              <button
                onClick={() => {
                  setShowCreateTagModal(false);
                  setNewTagName('');
                  setNewTagCategory('Custom');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g. Gamer, Student, High Value"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={newTagCategory}
                  onChange={(e) => setNewTagCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="Demographics">Demographics</option>
                  <option value="Consumption">Consumption</option>
                  <option value="Lifecycle (MCCM)">Lifecycle (MCCM)</option>
                  <option value="Interests">Interests</option>
                  <option value="Channel Pref">Channel Pref</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowCreateTagModal(false);
                    setNewTagName('');
                    setNewTagCategory('Custom');
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Segment Modal */}
      {showSaveSegmentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Save Segment</h3>
              <button
                onClick={() => {
                  setShowSaveSegmentModal(false);
                  setSegmentName('');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Segment Name</label>
                <input
                  type="text"
                  value={segmentName}
                  onChange={(e) => setSegmentName(e.target.value)}
                  placeholder="e.g. High Value Gamers, Student Segment"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                <p className="text-xs text-slate-600 mb-1">Estimated Audience:</p>
                {estimatingNewSegment ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin text-indigo-600" size={16} />
                    <span className="text-sm text-slate-500">Calculating...</span>
                  </div>
                ) : (
                  <p className="text-lg font-bold text-indigo-600">
                    {newSegmentAudienceSize !== null ? newSegmentAudienceSize.toLocaleString() : '0'} users
                  </p>
                )}
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowSaveSegmentModal(false);
                    setSegmentName('');
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSegment}
                  disabled={(() => {
                    const hasNewSegment = Object.keys(newSegmentCriteria).length > 0;
                    const criteriaToCheck = hasNewSegment ? newSegmentCriteria : segmentCriteria;
                    return !segmentName.trim() || !criteriaToCheck || (hasNewSegment && newSegmentAudienceSize === null);
                  })()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Segment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tag Modal */}
      {showEditTagModal && editingTag && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Tag</h3>
              <button
                onClick={() => {
                  setShowEditTagModal(false);
                  setEditingTag(null);
                  setEditTagName('');
                  setEditTagCategory('Custom');
                  setEditTagColor('#6366f1');
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tag Name</label>
                <input
                  type="text"
                  value={editTagName}
                  onChange={(e) => setEditTagName(e.target.value)}
                  placeholder="e.g. Gamer, Student, High Value"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editTagCategory}
                  onChange={(e) => setEditTagCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  <option value="Demographics">Demographics</option>
                  <option value="Consumption">Consumption</option>
                  <option value="Lifecycle (MCCM)">Lifecycle (MCCM)</option>
                  <option value="Interests">Interests</option>
                  <option value="Channel Pref">Channel Pref</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Color</label>
                <div className="flex items-center gap-3">
                  <div className="flex gap-2">
                    {['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(color => (
                      <button
                        key={color}
                        onClick={() => setEditTagColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          editTagColor === color ? 'border-slate-900 scale-110' : 'border-slate-300 hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                  <div className="flex-1">
                    <input
                      type="color"
                      value={editTagColor}
                      onChange={(e) => setEditTagColor(e.target.value)}
                      className="w-full h-8 rounded border border-slate-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowEditTagModal(false);
                    setEditingTag(null);
                    setEditTagName('');
                    setEditTagCategory('Custom');
                    setEditTagColor('#6366f1');
                  }}
                  className="flex-1 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEditedTag}
                  disabled={!editTagName.trim()}
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudienceStudio;