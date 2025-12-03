import React, { useState, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  ScatterChart, Scatter, ZAxis, BarChart, Bar, Legend, PieChart, Pie, Cell, Line 
} from 'recharts';
import { 
  Calendar, Filter, ChevronDown, RefreshCw, Target, Users, DollarSign, 
  TrendingUp, TrendingDown, Info, FileText, Brain, AlertTriangle, 
  CheckCircle, X, Share2, Clock, ArrowRight, Layout, Download, ListFilter 
} from 'lucide-react';

// --- Mock Data Generators ---

const generateTrendData = (period: string) => {
  if (period === 'This Month') {
    // Daily Granularity for "This Month"
    return Array.from({ length: 30 }, (_, i) => ({
      label: `Day ${i + 1}`,
      revenue: Math.floor(4000 + Math.random() * 2000 + (i * 100)), // Upward trend
      prevRevenue: Math.floor(3500 + Math.random() * 1500 + (i * 80)), // Comparison
      roi: (3.5 + Math.random() * 2).toFixed(1),
      prevRoi: (3.0 + Math.random() * 1.5).toFixed(1),
    }));
  }
  
  // Weekly Granularity for "This Quarter" (Default)
  return [
    { label: 'W1', revenue: 12500, prevRevenue: 10800, roi: 4.1, prevRoi: 3.8 },
    { label: 'W2', revenue: 15200, prevRevenue: 11500, roi: 4.5, prevRoi: 3.9 },
    { label: 'W3', revenue: 11000, prevRevenue: 12000, roi: 3.8, prevRoi: 4.0 },
    { label: 'W4', revenue: 18500, prevRevenue: 13200, roi: 5.2, prevRoi: 4.1 },
    { label: 'W5', revenue: 24000, prevRevenue: 14500, roi: 6.1, prevRoi: 4.3 },
    { label: 'W6', revenue: 28500, prevRevenue: 16000, roi: 6.8, prevRoi: 4.5 },
    { label: 'W7', revenue: 26000, prevRevenue: 17500, roi: 6.4, prevRoi: 4.6 },
    { label: 'W8', revenue: 32000, prevRevenue: 19000, roi: 7.5, prevRoi: 5.0 },
    { label: 'W9', revenue: 35800, prevRevenue: 21000, roi: 8.2, prevRoi: 5.2 },
    { label: 'W10', revenue: 33500, prevRevenue: 20500, roi: 7.8, prevRoi: 5.1 },
    { label: 'W11', revenue: 41000, prevRevenue: 22000, roi: 8.8, prevRoi: 5.4 },
    { label: 'W12', revenue: 45000, prevRevenue: 24000, roi: 9.5, prevRoi: 5.6 },
  ];
};

const SEGMENT_MATRIX_DATA = [
  { name: 'Student (High Vol)', cvr: 1.5, arpu: 3500, size: 800, fill: '#60a5fa' }, // Low ARPU, Low CVR, Huge Size
  { name: 'Business (VVIP)', cvr: 5.2, arpu: 28000, size: 150, fill: '#4f46e5' }, // High ARPU, High CVR, Small Size
  { name: 'Govt Staff', cvr: 2.8, arpu: 12000, size: 300, fill: '#818cf8' },
  { name: 'Gamers', cvr: 4.1, arpu: 9500, size: 450, fill: '#a78bfa' }, // Med ARPU, High CVR, Med Size
  { name: 'Inactive/Churn', cvr: 0.8, arpu: 1200, size: 600, fill: '#f87171' }, // Terrible stats, Big size
  { name: 'Night Owls', cvr: 2.1, arpu: 4500, size: 200, fill: '#34d399' },
  { name: 'Roamers', cvr: 3.5, arpu: 18000, size: 80, fill: '#fbbf24' },
];

const PRODUCT_CONTRIBUTION_DATA = [
  { month: 'Jan', data: 4200, voice: 2400, vas: 1200 },
  { month: 'Feb', data: 4800, voice: 2300, vas: 1300 },
  { month: 'Mar', data: 5500, voice: 2200, vas: 1400 },
  { month: 'Apr', data: 6100, voice: 2100, vas: 1350 },
  { month: 'May', data: 7200, voice: 2000, vas: 1600 },
  { month: 'Jun', data: 8500, voice: 1800, vas: 1800 }, // Big jump in data
];

const CAMPAIGNS_LIST = [
  { 
    id: 'C-1024', name: 'Yangon Rainy Season Data', status: 'Completed', 
    sent: 150000, cvr: '4.2%', revenue: '$42,500', roi: '1:8.5', 
    aiSummary: "Excellent performance. ROI 1:8.5 exceeds quarterly avg (1:5). App Push channel contributed 60% of conversions.",
    attribution: [
      { name: 'App Push', value: 60, color: '#4f46e5' },
      { name: 'SMS', value: 30, color: '#10b981' },
      { name: 'Social', value: 10, color: '#f59e0b' }
    ]
  },
  { 
    id: 'C-1025', name: 'Midnight Flash Sale', status: 'Completed', 
    sent: 45000, cvr: '1.1%', revenue: '$5,200', roi: '1:1.2', 
    aiSummary: "Underperforming. Technical latency in SMS gateway caused delivery delays during peak hours.",
    attribution: [
      { name: 'SMS', value: 90, color: '#10b981' },
      { name: 'App Push', value: 10, color: '#4f46e5' }
    ]
  },
  { 
    id: 'C-1026', name: 'VVIP Retention Bonus', status: 'Running', 
    sent: 1200, cvr: '18.5%', revenue: '$18,000', roi: '1:12', 
    aiSummary: "Ongoing. High engagement from 'Business' segment. Suggest extending duration by 2 days.",
    attribution: [
      { name: 'Direct Call', value: 20, color: '#ec4899' },
      { name: 'SMS', value: 40, color: '#10b981' },
      { name: 'App Push', value: 40, color: '#4f46e5' }
    ]
  },
  { 
    id: 'C-1027', name: 'Game Pack Upsell', status: 'Paused', 
    sent: 8500, cvr: '3.4%', revenue: '$2,100', roi: '1:4', 
    aiSummary: "Paused due to low inventory of game codes. Creative performance was high.",
    attribution: [
      { name: 'App Push', value: 80, color: '#4f46e5' },
      { name: 'SMS', value: 20, color: '#10b981' }
    ]
  },
];

// --- Sub-components ---

const CustomTooltip = ({ active, payload, label, prefix = '', suffix = '' }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-xl rounded-lg text-xs z-50">
        <p className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
             <span className="text-slate-500 capitalize">{entry.name}:</span>
             <span className="font-mono font-bold text-slate-900">
               {prefix}{entry.value.toLocaleString()}{suffix}
             </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CampaignDetailModal = ({ campaign, onClose }: { campaign: any, onClose: () => void }) => {
  const [isMarkingOutlier, setIsMarkingOutlier] = useState(false);
  const [outlierReason, setOutlierReason] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmitOutlier = () => {
    setIsSubmitted(true);
    setTimeout(() => {
      onClose(); 
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-slate-200 flex flex-col">
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-slate-100 p-6 flex justify-between items-start z-10 rounded-t-2xl">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-2xl font-bold text-slate-900">{campaign.name}</h2>
              <span className={`px-2.5 py-0.5 rounded text-xs font-bold uppercase ${campaign.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-indigo-100 text-indigo-700'}`}>
                {campaign.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 font-mono flex items-center gap-2">
              <span>ID: {campaign.id}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>Sent: {campaign.sent.toLocaleString()}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-8 flex-1 overflow-y-auto">
          {/* Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center hover:border-indigo-200 transition-colors">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Conversion Rate</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{campaign.cvr}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center hover:border-green-200 transition-colors">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Uplift</p>
              <p className="text-2xl font-bold text-green-600 mt-1">{campaign.revenue}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center hover:border-indigo-200 transition-colors">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ROI</p>
              <p className="text-2xl font-bold text-indigo-600 mt-1">{campaign.roi}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center hover:border-slate-300 transition-colors">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">CPA</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">$0.45</p>
            </div>
          </div>

          {/* AI Feedback Section */}
          <div className="border-t border-slate-100 pt-6">
            {!isMarkingOutlier ? (
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex gap-3 items-center">
                   <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-400">
                      <Brain size={20} />
                   </div>
                   <div>
                      <h4 className="font-bold text-slate-900 text-sm">Model Training Feedback</h4>
                      <p className="text-xs text-slate-500">Is this data valid for training future AI models?</p>
                   </div>
                </div>
                <div className="flex gap-3">
                   <button 
                     onClick={() => setIsMarkingOutlier(true)}
                     className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 flex items-center gap-2 transition-colors"
                   >
                     <AlertTriangle size={14} className="text-red-500" /> Mark as Outlier
                   </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-50 p-5 rounded-xl border border-red-200 animate-in slide-in-from-right duration-300">
                 {!isSubmitted ? (
                   <>
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-red-900 text-sm flex items-center gap-2">
                          <AlertTriangle size={18} className="text-red-600" /> Mark as Outlier (Exclude from Training)
                        </h4>
                        <button onClick={() => setIsMarkingOutlier(false)} className="text-red-400 hover:text-red-600">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="flex gap-4 items-end">
                        <div className="flex-1 space-y-2">
                          <label className="block text-xs font-bold text-red-800 uppercase">Select Exclusion Reason</label>
                          <select 
                            className="w-full p-2.5 rounded border border-red-200 text-sm bg-white focus:ring-2 focus:ring-red-200 outline-none"
                            value={outlierReason}
                            onChange={(e) => setOutlierReason(e.target.value)}
                          >
                            <option value="">-- Choose Reason --</option>
                            <option value="technical">Technical Issue (Gateway/Platform Failure)</option>
                            <option value="creative">Creative/Content Deployment Error</option>
                            <option value="external">External Factor (Political/Network Outage)</option>
                          </select>
                        </div>
                        <button 
                          onClick={handleSubmitOutlier}
                          disabled={!outlierReason}
                          className="px-4 py-2.5 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 disabled:opacity-50 shadow-sm shadow-red-200"
                        >
                          Confirm Exclusion
                        </button>
                      </div>
                   </>
                 ) : (
                   <div className="flex flex-col items-center justify-center py-6 text-green-700">
                      <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle size={24} className="text-green-600" />
                      </div>
                      <p className="font-bold text-sm">Feedback Recorded Successfully</p>
                   </div>
                 )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Analytics Component ---

const Analytics: React.FC = () => {
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [trendMetric, setTrendMetric] = useState<'revenue' | 'roi'>('revenue');
  const [timeFilter, setTimeFilter] = useState('This Quarter');
  const [statusFilter, setStatusFilter] = useState('All');

  // Dynamic Data based on Time Filter
  const trendData = useMemo(() => generateTrendData(timeFilter), [timeFilter]);

  // Filter Logic
  const filteredCampaigns = CAMPAIGNS_LIST.filter(c => 
    statusFilter === 'All' || c.status === statusFilter
  );

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      
      {/* --- Header & Global Filter Bar --- */}
      <section>
        <div className="flex justify-between items-center mb-6">
           <div>
              <h1 className="text-2xl font-bold text-slate-900">Analytics & Report Center</h1>
              <p className="text-slate-500 text-sm mt-1">Review performance, ROI, and optimize AI models.</p>
           </div>
           
           <div className="bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
              {/* Time Dimension */}
              <div className="relative group z-20">
                <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors">
                  <Calendar size={14} />
                  <span>{timeFilter}</span>
                  <ChevronDown size={12} />
                </button>
                <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 shadow-lg rounded-lg hidden group-hover:block">
                   {['This Month', 'This Quarter'].map(opt => (
                     <div key={opt} onClick={() => setTimeFilter(opt)} className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg">{opt}</div>
                   ))}
                </div>
              </div>
              
              <div className="h-4 w-px bg-slate-200"></div>
              
              {/* Status Filter */}
              <div className="relative group z-20">
                <button className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium text-slate-600 border border-transparent hover:border-slate-200 hover:bg-slate-50 transition-colors">
                  <Filter size={14} />
                  <span>Status: {statusFilter}</span>
                  <ChevronDown size={12} />
                </button>
                <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-200 shadow-lg rounded-lg hidden group-hover:block">
                   {['All', 'Running', 'Completed', 'Paused'].map(opt => (
                     <div key={opt} onClick={() => setStatusFilter(opt)} className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer first:rounded-t-lg last:rounded-b-lg">{opt}</div>
                   ))}
                </div>
              </div>
              
              <div className="h-4 w-px bg-slate-200"></div>
              
              <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer select-none hover:bg-slate-50 rounded transition-colors">
                 <input type="checkbox" className="rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600" defaultChecked />
                 <span className="text-xs font-medium text-slate-700">Compare (PoP)</span>
              </label>

              <button className="ml-2 p-1.5 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-indigo-50 transition-colors">
                <RefreshCw size={14} />
              </button>
           </div>
        </div>

        {/* --- Level 1: Macro Business Review --- */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            Macro Business Review
            <span className="bg-yellow-100 text-yellow-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Level 1</span>
        </h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
           {/* KPI Cards */}
           <div className="lg:col-span-1 space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-all group">
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide group-hover:text-indigo-500 transition-colors">Acquisition Cost (CPA)</p>
                    <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded group-hover:bg-indigo-600 group-hover:text-white transition-colors"><Target size={16} /></div>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900">$0.45</h3>
                 <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                   <TrendingUp size={12} /> -12% vs last period
                 </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-emerald-200 transition-all group">
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide group-hover:text-emerald-500 transition-colors">Retention Rate</p>
                    <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded group-hover:bg-emerald-600 group-hover:text-white transition-colors"><Users size={16} /></div>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900">94.2%</h3>
                 <p className="text-xs text-green-600 font-bold mt-1 flex items-center gap-1">
                   <TrendingUp size={12} /> +0.8% Uplift
                 </p>
              </div>
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-amber-200 transition-all group">
                 <div className="flex justify-between items-start mb-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide group-hover:text-amber-500 transition-colors">ARPU Uplift</p>
                    <div className="p-1.5 bg-amber-50 text-amber-600 rounded group-hover:bg-amber-600 group-hover:text-white transition-colors"><DollarSign size={16} /></div>
                 </div>
                 <h3 className="text-2xl font-bold text-slate-900">+$1.20</h3>
                 <p className="text-xs text-slate-500 font-medium mt-1">Per active user</p>
              </div>
           </div>

           {/* Trend Chart (Revenue/ROI) */}
           <div className="lg:col-span-3 bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="font-bold text-slate-900 text-lg">Campaign {trendMetric === 'revenue' ? 'Revenue' : 'ROI'} Trend</h3>
                   <p className="text-xs text-slate-500 mt-1">
                     {trendMetric === 'revenue' ? 'Incremental revenue generated by MCCM campaigns.' : 'Return on Investment Efficiency.'}
                   </p>
                 </div>
                 <div className="flex items-center gap-4">
                    {/* Metric Toggle */}
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                      <button 
                        onClick={() => setTrendMetric('revenue')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trendMetric === 'revenue' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        Revenue
                      </button>
                      <button 
                        onClick={() => setTrendMetric('roi')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${trendMetric === 'roi' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                      >
                        ROI
                      </button>
                    </div>

                    <div className="h-4 w-px bg-slate-200"></div>

                    {/* Legend */}
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
                         <span className={`w-3 h-3 rounded-full ${trendMetric === 'revenue' ? 'bg-indigo-500' : 'bg-emerald-500'}`}></span> Current
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                         <span className="w-3 h-3 rounded-full bg-slate-300 border border-white shadow-sm dashed-circle"></span> Previous Period
                      </div>
                    </div>
                 </div>
              </div>
              
              {/* Responsive Container with Fixed Height Fallback */}
              <div className="w-full h-[320px] bg-slate-50/50 rounded-lg border border-slate-100 p-4 relative" style={{ height: '320px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                       <defs>
                          <linearGradient id="colorMain" x1="0" y1="0" x2="0" y2="1">
                             <stop offset="5%" stopColor={trendMetric === 'revenue' ? "#6366f1" : "#10b981"} stopOpacity={0.2}/>
                             <stop offset="95%" stopColor={trendMetric === 'revenue' ? "#6366f1" : "#10b981"} stopOpacity={0}/>
                          </linearGradient>
                       </defs>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                       <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', dy: 10}} />
                       <YAxis 
                         axisLine={false} 
                         tickLine={false} 
                         tick={{fontSize: 12, fill: '#64748b'}} 
                         tickFormatter={(val) => trendMetric === 'revenue' ? `${val/1000}k` : `${val}x`} 
                         width={40}
                       />
                       <Tooltip 
                         contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                         formatter={(val: number, name: string) => [
                            trendMetric === 'revenue' ? `$${val.toLocaleString()}` : `${val}x`,
                            name === 'revenue' || name === 'roi' ? 'Current' : 'Previous'
                         ]}
                       />
                       <Area 
                          type="monotone" 
                          dataKey={trendMetric === 'revenue' ? "revenue" : "roi"} 
                          stroke={trendMetric === 'revenue' ? "#6366f1" : "#10b981"} 
                          strokeWidth={3} 
                          fillOpacity={1} 
                          fill="url(#colorMain)" 
                          activeDot={{ r: 6, strokeWidth: 0 }}
                       />
                       <Area 
                          type="monotone" 
                          dataKey={trendMetric === 'revenue' ? "prevRevenue" : "prevRoi"} 
                          stroke="#cbd5e1" 
                          strokeWidth={2} 
                          strokeDasharray="5 5" 
                          fill="none" 
                       />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </div>
        </div>
      </section>

      {/* --- Level 2: Deep Dive: Segments & Products --- */}
      <section>
         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            Deep Dive: Segments & Products 
            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Level 2</span>
         </h2>
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Segment Matrix (Scatter) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Segment Performance Matrix</h3>
                    <p className="text-xs text-slate-500 mt-1">CVR vs ARPU (Bubble Size = Audience Volume)</p>
                  </div>
                  <Info size={16} className="text-slate-400" />
               </div>
               
               <div className="w-full h-[320px] bg-slate-50/50 rounded-lg border border-slate-100 p-2" style={{ height: '320px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" dataKey="cvr" name="CVR" unit="%" tick={{fontSize: 10, fill: '#64748b'}} label={{ value: 'Conversion Rate (%)', position: 'insideBottom', offset: -10, fontSize: 10, fill: '#94a3b8' }} />
                      <YAxis type="number" dataKey="arpu" name="ARPU" unit="Ks" tick={{fontSize: 10, fill: '#64748b'}} label={{ value: 'ARPU', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }} />
                      <ZAxis type="number" dataKey="size" range={[60, 600]} />
                      <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip prefix="ARPU: " suffix=" Ks" />} />
                      <Scatter name="Segments" data={SEGMENT_MATRIX_DATA}>
                        {SEGMENT_MATRIX_DATA.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} stroke="white" strokeWidth={1} />
                        ))}
                      </Scatter>
                    </ScatterChart>
                 </ResponsiveContainer>
               </div>
            </div>

            {/* Product Contribution (Stacked Bar) */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Revenue Contribution by Category</h3>
                    <p className="text-xs text-slate-500 mt-1">Monthly breakdown of revenue sources</p>
                  </div>
                  <div className="flex gap-3">
                     <span className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span> Data</span>
                     <span className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Voice</span>
                     <span className="flex items-center gap-1.5 text-[10px] text-slate-600 font-medium"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> VAS</span>
                  </div>
               </div>
               
               <div className="w-full h-[320px] bg-slate-50/50 rounded-lg border border-slate-100 p-2" style={{ height: '320px' }}>
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={PRODUCT_CONTRIBUTION_DATA} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8', dy: 10}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#94a3b8'}} unit="Ks" />
                      <Tooltip content={<CustomTooltip prefix="Rev: " suffix=" Ks" />} />
                      <Bar dataKey="data" stackId="a" fill="#6366f1" radius={[0, 0, 0, 0]} maxBarSize={50} />
                      <Bar dataKey="voice" stackId="a" fill="#10b981" maxBarSize={50} />
                      <Bar dataKey="vas" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    </BarChart>
                 </ResponsiveContainer>
               </div>
            </div>
         </div>
      </section>

      {/* --- Level 3: Micro Campaign Deep-dive --- */}
      <section>
         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            Micro Campaign Deep-dive
            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Level 3</span>
         </h2>
         <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
               <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                  <tr>
                     <th className="p-4 pl-6 font-semibold uppercase text-xs tracking-wider">Campaign Name</th>
                     <th className="p-4 font-semibold uppercase text-xs tracking-wider">Status</th>
                     <th className="p-4 font-semibold uppercase text-xs tracking-wider">Sent</th>
                     <th className="p-4 font-semibold uppercase text-xs tracking-wider">CVR</th>
                     <th className="p-4 font-semibold uppercase text-xs tracking-wider">Revenue</th>
                     <th className="p-4 font-semibold uppercase text-xs tracking-wider">ROI</th>
                     <th className="p-4 text-right pr-6 font-semibold uppercase text-xs tracking-wider">Action</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.map(campaign => (
                     <tr key={campaign.id} className="hover:bg-slate-50 transition-colors group cursor-default">
                        <td className="p-4 pl-6">
                           <div className="font-bold text-slate-900">{campaign.name}</div>
                           <div className="text-xs text-slate-500 font-mono mt-0.5">{campaign.id}</div>
                        </td>
                        <td className="p-4">
                           <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase ${
                              campaign.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                              campaign.status === 'Running' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
                           }`}>
                              {campaign.status}
                           </span>
                        </td>
                        <td className="p-4 text-slate-600 font-medium font-mono text-xs">{campaign.sent.toLocaleString()}</td>
                        <td className="p-4 text-slate-600 font-bold">{campaign.cvr}</td>
                        <td className="p-4 text-green-600 font-bold">{campaign.revenue}</td>
                        <td className="p-4">
                           <div className="flex items-center gap-1.5">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-xs font-mono font-bold text-slate-700">
                                 {campaign.roi}
                              </span>
                              {parseFloat(campaign.roi.split(':')[1]) > 5 && <TrendingUp size={14} className="text-green-500" />}
                           </div>
                        </td>
                        <td className="p-4 text-right pr-6">
                           <button 
                             onClick={() => setSelectedCampaign(campaign)}
                             className="text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-200 hover:border-indigo-600 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 justify-center ml-auto shadow-sm"
                           >
                              <FileText size={14} /> View Report
                           </button>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </section>

      {/* --- Level 4: AI Feedback Loop --- */}
      <section>
         <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            AI Model Health & Training
            <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wide">Level 4</span>
         </h2>
         <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded-lg"><RefreshCw size={18} /></div>
                  <div>
                     <h4 className="font-bold text-slate-900 text-sm">Automated Feedback Stream</h4>
                     <p className="text-xs text-slate-500">Real-time campaign result ingestion</p>
                  </div>
               </div>
               <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                     <span className="text-slate-600 font-medium">Positive Samples</span>
                     <span className="font-bold text-slate-900">12,450</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                     <div className="bg-green-500 h-full rounded-full" style={{ width: '75%' }}></div>
                  </div>
               </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={18} /></div>
                  <div>
                     <h4 className="font-bold text-slate-900 text-sm">Human Corrections</h4>
                     <p className="text-xs text-slate-500">Excluded from training data</p>
                  </div>
               </div>
               <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-bold text-slate-900">3</span>
                  <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-1 rounded">Last 30 Days</span>
               </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
               <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Brain size={18} /></div>
                  <div>
                     <h4 className="font-bold text-slate-900 text-sm">Prediction Accuracy</h4>
                     <p className="text-xs text-slate-500">Predicted vs Actual Uplift</p>
                  </div>
               </div>
               <div className="flex items-end gap-2 mb-2">
                  <span className="text-3xl font-bold text-slate-900">94.2%</span>
                  <span className="text-xs font-bold text-green-600 mb-1.5">+0.5% this week</span>
               </div>
            </div>
         </div>
      </section>

      {/* Campaign Detail Modal */}
      {selectedCampaign && (
        <CampaignDetailModal 
           campaign={selectedCampaign} 
           onClose={() => setSelectedCampaign(null)} 
        />
      )}
    </div>
  );
};

export default Analytics;