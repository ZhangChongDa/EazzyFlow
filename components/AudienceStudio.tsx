
import React, { useState } from 'react';
import { 
  Sparkles, Search, Filter, Plus, TrendingUp, Users, 
  Smartphone, Globe, MessageSquare, Tag, AlertCircle,
  ChevronRight, ChevronDown, CheckCircle, XCircle,
  MoreHorizontal, Brain, Zap, ArrowRight, LayoutGrid, Trash2, GripVertical,
  SlidersHorizontal, Check
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, CartesianGrid
} from 'recharts';

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

const FILTER_DEFINITIONS: Record<string, any> = {
  // Demographics
  'Region': { type: 'select', operators: ['is', 'is not'], values: ['Yangon', 'Mandalay', 'Nay Pyi Taw', 'Bago', 'Shan', 'Ayeyarwady'] },
  'Gender': { type: 'select', operators: ['is'], values: ['Male', 'Female'] },
  'Device Type': { type: 'select', operators: ['is'], values: ['Android', 'iOS', 'Feature Phone'] },
  'VIP Tier': { type: 'select', operators: ['is', 'is at least'], values: ['Crown', 'Diamond', 'Gold', 'Silver'] },
  
  // Consumption (Metrics)
  'Data Usage Level': { type: 'metric', operators: ['>', '>=', '=', '<', '<='], unit: 'MB' },
  'Voice MOU': { type: 'metric', operators: ['>', '>=', '=', '<', '<='], unit: 'Mins' },
  'Recharge Freq': { type: 'metric', operators: ['>', '>=', '=', '<'], unit: 'Times/Mo' },
  'ARPU Tier': { type: 'select', operators: ['is'], values: ['High', 'Medium', 'Low'] },
  
  // Interests (Tags)
  'Interests': { type: 'tag', operators: ['contains'], values: [] }, // Values come from the tag itself
  'Channel Pref': { type: 'select', operators: ['is'], values: ['SMS', 'App', 'Facebook', 'USSD'] },
  
  // Fallback
  'default': { type: 'text', operators: ['contains'] }
};

const MOCK_OPPORTUNITIES = [
  {
    id: 1,
    title: "Mobile Legends eSports Event",
    description: "Detected 15k users with concentrated traffic to IP 103.x.x.x (MLBB Servers) showing 'Small Packet, High Freq' pattern.",
    aiAnalysis: "High probability of active eSports viewership/participation.",
    suggestion: "Label as 'ML Active Gamer' & Push 'Game Booster Pack'.",
    trendData: [
      { time: '10am', users: 2000 },
      { time: '12pm', users: 4500 },
      { time: '2pm', users: 8000 },
      { time: '4pm', users: 15000 },
    ],
    growth: "+650%"
  },
  {
    id: 2,
    title: "Competitor SIM Swap Risk",
    description: "Detected 3,200 dual-SIM users with sudden drop in outgoing voice calls but stable data usage.",
    aiAnalysis: "Likely using competitor SIM for voice calls due to recent price hike.",
    suggestion: "Offer 'Voice Only' discount pack to retain voice traffic.",
    trendData: [
      { time: 'Mon', users: 100 },
      { time: 'Tue', users: 500 },
      { time: 'Wed', users: 1200 },
      { time: 'Thu', users: 3200 },
    ],
    growth: "+160%"
  }
];

const TAG_TAXONOMY = {
  "Demographics": ["Age Group", "Gender", "Region", "Device Type", "VIP Tier"],
  "Consumption": ["Recharge Freq", "ARPU Tier", "Data Usage Level", "Voice MOU"],
  "Lifecycle (MCCM)": ["Acquire (New)", "Engage (Active)", "Convert (Potential)", "Retain (Churn Risk)", "Grow (Upsell)"],
  "Interests": ["Gaming", "Sports", "Music Streaming", "Social Media", "K-Drama"],
  "Channel Pref": ["SMS Responsive", "App Active", "Facebook Reachable", "USSD User"]
};

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

const OpportunityCard: React.FC<{ opp: typeof MOCK_OPPORTUNITIES[0] }> = ({ opp }) => (
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
        <button className="flex-1 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded hover:bg-indigo-700 transition">
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
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
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

const TagTreeItem: React.FC<{ category: string, tags: string[], onSelectTag: (tag: string, category: string) => void }> = ({ category, tags, onSelectTag }) => {
  const [expanded, setExpanded] = useState(true);
  
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
              key={tag} 
              onClick={() => onSelectTag(tag, category)}
              className="flex items-center justify-between px-2 py-1.5 rounded cursor-pointer hover:bg-indigo-50 text-xs text-slate-600 group active:scale-[0.98] transition-all"
            >
              <div className="flex items-center gap-2">
                <Tag size={12} className="text-slate-300 group-hover:text-indigo-400" />
                <span>{tag}</span>
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 opacity-50 group-hover:opacity-100" title="Data Healthy"></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ValueSelector = ({ filter, onChange }: { filter: FilterItem, onChange: (updates: Partial<FilterItem>) => void }) => {
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
          />
          <span className="text-xs text-slate-400 font-medium">{config.unit}</span>
        </div>
      );
    }

    return (
      <span className="bg-white border border-indigo-200 text-indigo-700 text-xs font-bold rounded px-3 py-1">
        {filter.value}
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
      className={`relative z-10 text-xs font-bold px-3 py-0.5 rounded-full uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 ${
        logic === 'AND' 
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
}

const SmartBuilder = ({ filters, onRemoveFilter, onUpdateFilter, onAddPlaceholder }: SmartBuilderProps) => {
  const [nlInput, setNlInput] = useState('');
  
  // Helper to determine visual style
  const getFilterStyle = (category: string) => {
    if (['Region', 'City'].includes(category)) return { bg: 'bg-blue-100', text: 'text-blue-600', icon: Globe };
    if (['Interest', 'Interests'].includes(category)) return { bg: 'bg-purple-100', text: 'text-purple-600', icon: Smartphone };
    if (['ARPU Tier', 'Balance', 'Data Usage Level'].includes(category)) return { bg: 'bg-emerald-100', text: 'text-emerald-600', icon: TrendingUp };
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
              <span className="text-2xl font-bold text-slate-900">
                {(12500 - (filters.length * 1500)).toLocaleString()}
              </span>
              <span className="text-sm font-medium text-slate-500">
                ({(0.5 - (filters.length * 0.05)).toFixed(1)}% of Base)
              </span>
           </div>
         </div>
         <div className="flex gap-3">
            <button className="px-4 py-2 text-slate-600 font-medium text-sm hover:bg-slate-50 rounded-lg border border-transparent">Save Draft</button>
            <button className="px-6 py-2 bg-indigo-600 text-white font-medium text-sm rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 flex items-center gap-2">
               Next: Insights <ArrowRight size={16} />
            </button>
         </div>
      </div>
    </div>
  );
};

const InsightPanel = () => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-6 h-full overflow-y-auto">
    <div className="flex items-center gap-2 mb-2">
      <LayoutGrid size={18} className="text-slate-400" />
      <h3 className="font-bold text-slate-800 text-sm">Audience Snapshot</h3>
    </div>

    {/* Demographics */}
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Gender Distribution</h4>
      <div className="flex items-center justify-between">
         <div className="h-24 w-24 w-full">
            <div className="w-full h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={MOCK_INSIGHT_GENDER} innerRadius={25} outerRadius={40} dataKey="value" stroke="none">
                    {MOCK_INSIGHT_GENDER.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
         </div>
         <div className="flex-1 pl-4 space-y-2">
            {MOCK_INSIGHT_GENDER.map(g => (
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

    {/* Keywords */}
    <div>
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Top Keywords</h4>
      <div className="flex flex-wrap gap-2">
         {['Price Sensitive', 'Night User', 'Android', 'Gamer'].map(tag => (
           <span key={tag} className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded border border-slate-200">
             {tag}
           </span>
         ))}
      </div>
    </div>

    <div className="w-full h-px bg-slate-100"></div>

    {/* Channel Reachability */}
    <div className="flex-1">
      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Channel Reachability</h4>
      <div className="-ml-4 h-40"> 
        <div className="w-full h-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={MOCK_INSIGHT_CHANNEL} layout="vertical" barSize={12}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis dataKey="channel" type="category" tick={{fontSize: 10, fill: '#64748b'}} width={60} axisLine={false} tickLine={false} />
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '12px' }} />
              <Bar dataKey="reach" radius={[0, 4, 4, 0]}>
                {MOCK_INSIGHT_CHANNEL.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.reach > 90 ? '#10b981' : entry.reach > 70 ? '#6366f1' : '#f59e0b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  </div>
);

// --- Main Component ---

const AudienceStudio: React.FC = () => {
  const [activeFilters, setActiveFilters] = useState<FilterItem[]>([
    { id: '1', category: 'Region', operator: 'is', value: 'Yangon', logic: 'AND', type: 'select' }
  ]);

  const handleAddFilter = (tag: string, category: string) => {
    // Intelligent Filter Creation based on Category
    const def = FILTER_DEFINITIONS[tag] || FILTER_DEFINITIONS['default'];
    
    // If the tag itself is a category parent (like "Region"), use defaults
    // If the tag is a leaf value (like "Gaming"), set it as value
    
    const newFilter: FilterItem = {
      id: Date.now().toString(),
      category: Object.keys(FILTER_DEFINITIONS).includes(tag) ? tag : category,
      operator: def.operators ? def.operators[0] : 'contains',
      value: Object.keys(FILTER_DEFINITIONS).includes(tag) ? (def.values ? def.values[0] : 0) : tag,
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
        
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
           {MOCK_OPPORTUNITIES.map(opp => <OpportunityCard key={opp.id} opp={opp} />)}
           <div className="min-w-[100px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:border-indigo-300 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer">
              <MoreHorizontal size={24} />
              <span className="text-xs font-bold mt-2">View All</span>
           </div>
        </div>
      </section>

      {/* 2. Main Workspace */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6">
        
        {/* Left Sidebar: Tag Taxonomy */}
        <div className="col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
           <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Tag size={16} className="text-slate-500" /> Tag Library
              </h3>
              <Filter size={14} className="text-slate-400 hover:text-indigo-600 cursor-pointer" />
           </div>
           <div className="flex-1 overflow-y-auto p-2">
              {Object.entries(TAG_TAXONOMY).map(([cat, tags]) => (
                <TagTreeItem 
                  key={cat} 
                  category={cat} 
                  tags={tags} 
                  onSelectTag={handleAddFilter}
                />
              ))}
           </div>
           <div className="p-3 bg-slate-50 border-t border-slate-200 text-center">
              <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 w-full">
                <Plus size={14} /> Create New Tag
              </button>
           </div>
        </div>

        {/* Center: Builder */}
        <div className="col-span-6 h-full">
           <SmartBuilder 
              filters={activeFilters} 
              onRemoveFilter={handleRemoveFilter}
              onUpdateFilter={handleUpdateFilter}
              onAddPlaceholder={() => handleAddFilter('Interests', 'Interests')}
           />
        </div>

        {/* Right: Insights */}
        <div className="col-span-3 h-full">
           <InsightPanel />
        </div>

      </div>
    </div>
  );
};

export default AudienceStudio;