import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, Users,
  Filter, Download, Layout, Save, Search, X, ChevronRight, Activity,
  Smartphone, CreditCard, Clock, Zap, Loader2, ChevronLeft, TrendingUp
} from 'lucide-react';

import { useCustomerOverview, useCustomerList } from '../hooks/useCustomerData';
import { useUserSegments } from '../hooks/useUserSegments';
import { useAudienceFilter } from '../hooks/useAudienceFilter';

// --- Mock Data (Removed: Replaced by Hook) ---

// --- Sub-components ---

const AlertBanner = () => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 mb-6 animate-in slide-in-from-top-2">
    <AlertTriangle className="text-red-600 shrink-0 mt-0.5" size={20} />
    <div className="flex-1">
      <h4 className="text-sm font-bold text-red-900 flex items-center gap-2">
        Anomaly Detected: Student Segment
        <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full border border-red-200">Critical</span>
      </h4>
      <p className="text-sm text-red-800 mt-1">
        Yesterday's Data Usage (DOU) dropped by <span className="font-bold">20%</span>. AI analysis suggests high correlation with competitor MPT's new "Student Flash Sale" launch.
      </p>
    </div>
    <button className="text-xs font-semibold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition-colors shadow-sm">
      Launch Counter-Offer
    </button>
  </div>
);

const UserDetailModal = ({ user, onClose }: { user: any, onClose: () => void }) => {
  if (!user) return null;
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-indigo-600 p-6 flex justify-between items-start text-white">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} /> Customer 360 Sample
            </h3>
            <p className="opacity-80 text-sm mt-1">Verifying segment data for {user.msisdn}</p>
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Device Info</label>
              <div className="flex items-center gap-2 mt-1">
                <Smartphone size={16} className="text-slate-600" />
                <span className="font-semibold text-slate-800">{user.device}</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Plan</label>
              <div className="flex items-center gap-2 mt-1">
                <CreditCard size={16} className="text-slate-600" />
                <span className="font-semibold text-slate-800">Super Data 10GB</span>
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Avg. ARPU</label>
              <div className="flex items-center gap-2 mt-1">
                <Activity size={16} className="text-slate-600" />
                <span className="font-semibold text-slate-800">{user.arpu} MMK</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Recent Journey</label>
            <div className="space-y-3 relative before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              <div className="relative pl-5">
                <div className="absolute left-0 top-1 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs font-bold text-slate-800">Top-up 5,000 MMK</p>
                <p className="text-[10px] text-slate-500">2 hours ago</p>
              </div>
              <div className="relative pl-5">
                <div className="absolute left-0 top-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs font-bold text-slate-800">Purchased Data Pack</p>
                <p className="text-[10px] text-slate-500">Yesterday</p>
              </div>
              <div className="relative pl-5">
                <div className="absolute left-0 top-1 w-3.5 h-3.5 bg-amber-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs font-bold text-slate-800">Low Balance Warning</p>
                <p className="text-[10px] text-slate-500">2 days ago</p>
              </div>
              {/* New Events Added */}
              <div className="relative pl-5">
                <div className="absolute left-0 top-1 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs font-bold text-slate-800">App Login (iOS)</p>
                <p className="text-[10px] text-slate-500">3 days ago</p>
              </div>
              <div className="relative pl-5">
                <div className="absolute left-0 top-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
                <p className="text-xs font-bold text-slate-800">Call to Support (Complaint)</p>
                <p className="text-[10px] text-slate-500">5 days ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>
  );
};

// --- Main Component ---

const CustomerProfileOverview: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [page, setPage] = useState(1);
  const pageSize = 5;
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  const { loading: metricsLoading, lifecycleData, heatmapData, segmentDNA: defaultSegmentDNA } = useCustomerOverview();
  const { users, count, loading: listLoading } = useCustomerList(page, pageSize);
  const { segments, loading: segmentsLoading, getSegmentById } = useUserSegments();

  // Get selected segment criteria
  const selectedSegment = useMemo(() => {
    if (!selectedSegmentId) return null;
    return segments.find(s => s.id === selectedSegmentId);
  }, [selectedSegmentId, segments]);

  // Get filtered users for selected segment
  const { users: segmentUsers, count: segmentUsersCount, loading: segmentUsersLoading } = useAudienceFilter(
    selectedSegment?.criteria
  );

  // ✅ Fix: Directly use estimated_size from database (as shown in dropdown)
  const displaySegmentCount = useMemo(() => {
    if (!selectedSegment) return 0;
    // Directly use estimated_size from database (same as shown in dropdown)
    return selectedSegment.estimated_size || 0;
  }, [selectedSegment]);

  // Calculate segment DNA from filtered users
  const segmentDNA = useMemo(() => {
    if (!selectedSegment || segmentUsers.length === 0) {
      // Fallback to default calculation
      return defaultSegmentDNA;
    }

    const totalCount = segmentUsers.length || 1;
    const sums = {
      arpu: 0,
      data: 0,
      voice: 0,
    };

    segmentUsers.forEach(user => {
      const arpu = user.arpu_30d || 0;
      const data = arpu * 10; // Proxy calculation
      const voice = arpu * 2; // Proxy calculation

      sums.arpu += arpu;
      sums.data += data;
      sums.voice += voice;
    });

    const avgs = {
      arpu: sums.arpu / totalCount,
      data: sums.data / totalCount,
      voice: sums.voice / totalCount,
    };

    // Get overall averages for comparison from default DNA
    const overallAvg = {
      arpu: defaultSegmentDNA[0]?.B || 100,
      data: defaultSegmentDNA[1]?.B || 100,
      voice: defaultSegmentDNA[2]?.B || 100,
    };

    // Normalize for Radar Chart (0-150 scale)
    const normalize = (val: number, max: number) => Math.min(Math.round((val / max) * 100) + 50, 150);

    return [
      { subject: 'ARPU', A: normalize(avgs.arpu, 20000), B: overallAvg.arpu, fullMark: 150 },
      { subject: 'Data Usage', A: normalize(avgs.data, 5000), B: overallAvg.data, fullMark: 150 },
      { subject: 'Voice MOU', A: normalize(avgs.voice, 200), B: overallAvg.voice, fullMark: 150 },
      { subject: 'Digital', A: 130, B: 70, fullMark: 150 },
      { subject: 'Tenure', A: 60, B: 110, fullMark: 150 },
      { subject: 'Loyalty', A: 90, B: 100, fullMark: 150 },
    ];
  }, [selectedSegment, segmentUsers, defaultSegmentDNA]);

  // ✅ Calculate lifecycleData based on selected segment
  const computedLifecycleData = useMemo(() => {
    if (!selectedSegment || displaySegmentCount === 0 || segmentUsers.length === 0) {
      return lifecycleData; // Use default data
    }

    const now = new Date();
    let newUsers = 0, growing = 0, stable = 0, churnRisk = 0;

    segmentUsers.forEach(user => {
      const regDate = new Date((user as any).created_at || now);
      const daysSinceReg = (now.getTime() - regDate.getTime()) / (1000 * 3600 * 24);
      const churnScore = (user as any).churn_score || 0;
      const arpu = user.arpu_30d || 0;

      if (daysSinceReg < 90) {
        newUsers++;
      } else if (churnScore > 0.7) {
        churnRisk++;
      } else if (arpu > 20000) {
        growing++;
      } else {
        stable++;
      }
    });

    const total = segmentUsers.length || 1;
    return [
      { name: 'New', value: Math.round((newUsers / total) * 100), color: '#10b981' },
      { name: 'Growing', value: Math.round((growing / total) * 100), color: '#3b82f6' },
      { name: 'Stable', value: Math.round((stable / total) * 100), color: '#f59e0b' },
      { name: 'Churn Risk', value: Math.round((churnRisk / total) * 100), color: '#ef4444' },
    ];
  }, [selectedSegment, segmentUsers, displaySegmentCount, lifecycleData]);

  // ✅ Calculate heatmapData based on selected segment
  const computedHeatmapData = useMemo(() => {
    if (!selectedSegment || displaySegmentCount === 0 || segmentUsers.length === 0) {
      return heatmapData; // Use default data
    }

    const buckets = {
      '< 6mo': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
      '6-12mo': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
      '1-3yr': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
      '> 3yr': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
    };

    const now = new Date();

    segmentUsers.forEach(user => {
      const regDate = new Date((user as any).created_at || now);
      const days = (now.getTime() - regDate.getTime()) / (1000 * 3600 * 24);
      let tenureKey: keyof typeof buckets = '> 3yr';

      if (days < 180) tenureKey = '< 6mo';
      else if (days < 365) tenureKey = '6-12mo';
      else if (days < 1095) tenureKey = '1-3yr';

      const tier = user.tier || 'Silver';
      if (tier in buckets[tenureKey]) {
        // @ts-ignore
        buckets[tenureKey][tier]++;
        buckets[tenureKey].total++;
      }
    });

    // Convert to percentage
    return Object.entries(buckets).map(([tenure, counts]) => ({
      tenure,
      crown: counts.total ? Math.round((counts.Crown / counts.total) * 100) : 0,
      diamond: counts.total ? Math.round((counts.Diamond / counts.total) * 100) : 0,
      gold: counts.total ? Math.round((counts.Gold / counts.total) * 100) : 0,
      silver: counts.total ? Math.round((counts.Silver / counts.total) * 100) : 0,
    }));
  }, [selectedSegment, segmentUsers, displaySegmentCount, heatmapData]);

  if (metricsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 size={48} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-500">

      {/* Header */}
      <header className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Insights & Macro Analytics</h2>
          <p className="text-slate-500 mt-1">Holistic view of customer base, segments, and value migration.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Layout size={16} /> Edit Dashboard
          </button>
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            <Save size={16} /> Save View
          </button>
        </div>
      </header>

      {/* 1. Alert Watchdog */}
      <AlertBanner />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* 2. Segment DNA Analyzer (Left Column) - MD3 Enhanced */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-indigo-100 shadow-lg shadow-slate-200/50 relative overflow-hidden">
            {/* Decorative Background - MD3 Gradient */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-bl-full -z-0 pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200">
                    <Users size={18} />
                  </div>
                  <h3 className="font-bold text-indigo-900 text-lg">Segment DNA</h3>
                </div>
              </div>

              {/* Segment Selector (Real Data) - MD3 Enhanced */}
              <div className="mb-5">
                <label className="block text-xs text-slate-500 font-bold uppercase mb-2 tracking-wider">Target Segment</label>
                <select
                  value={selectedSegmentId || ''}
                  onChange={(e) => setSelectedSegmentId(e.target.value || null)}
                  className="w-full bg-white border-2 border-indigo-200 rounded-xl p-3 text-sm font-semibold text-indigo-700 hover:border-indigo-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer shadow-sm"
                >
                  <option value="">-- Select Segment --</option>
                  {segments.map(seg => (
                    <option key={seg.id} value={seg.id}>
                      {seg.name} ({seg.estimated_size.toLocaleString()} users)
                    </option>
                  ))}
                </select>
                {selectedSegment && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <p className="text-xs text-indigo-800 font-medium">{selectedSegment.description || 'No description'}</p>
                    {displaySegmentCount > 0 && (
                      <p className="text-xs text-indigo-600 mt-1">
                        📊 Analyzing {displaySegmentCount.toLocaleString()} users in this segment
                      </p>
                    )}
                  </div>
                )}
                {selectedSegment && segmentUsersLoading && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-indigo-600">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Loading segment data...</span>
                  </div>
                )}
              </div>

              {/* Radar Chart */}
              {/* Fixed container size and wrapper to handle positioning cleanly without confusing Recharts */}
              <div className="-ml-6 h-64">
                <div className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="70%" data={segmentDNA}>
                      <PolarGrid stroke="#e2e8f0" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                    <Radar name={selectedSegment?.name || "Selected Segment"} dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#6366f1" fillOpacity={0.4} />
                    <Radar name="Overall Average" dataKey="B" stroke="#94a3b8" strokeWidth={2} fill="#cbd5e1" fillOpacity={0.1} />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Insights & Action - MD3 Enhanced */}
              <div className="space-y-3 mt-4">
                {selectedSegment && displaySegmentCount > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 shadow-sm">
                    <div className="flex items-start gap-2">
                      <div className="p-1.5 bg-indigo-100 rounded-lg">
                        <Zap size={14} className="text-indigo-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-bold text-indigo-900 mb-1">AI Insight</p>
                        <p className="text-xs text-indigo-800 leading-snug">
                          {selectedSegment.name} has <strong>{displaySegmentCount.toLocaleString()} users</strong>. 
                          {segmentDNA[0]?.A > segmentDNA[0]?.B 
                            ? ' Higher ARPU than average - premium segment.' 
                            : ' Lower ARPU than average - high potential for upsell campaigns.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {selectedSegment && (
                  <button className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/50 transition-all flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]">
                    <Zap size={16} /> Create Campaign for Segment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 3. Macro Dashboard (Right Column - 2 span) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Top Row: Quick Stats & Migration - MD3 Enhanced */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Lifecycle Dist - MD3 Enhanced */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Activity size={18} className="text-indigo-600" />
                  Lifecycle Distribution
                </h3>
                {selectedSegment && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-semibold">
                    Segment View
                  </span>
                )}
              </div>
              <div className="flex items-center">
                <div className="h-40 w-40 min-w-[10rem] shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={computedLifecycleData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                        {computedLifecycleData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2 pl-4">
                  {computedLifecycleData.map(d => (
                    <div key={d.name} className="flex justify-between items-center text-sm p-2 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: d.color }}></span>
                        <span className="text-slate-700 font-medium">{d.name}</span>
                      </div>
                      <span className="font-bold text-slate-900">{d.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Segment Migration Matrix (Simplified) - MD3 Enhanced */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col">
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <TrendingUp size={18} className="text-indigo-600" />
                  Value Migration (MoM)
                </h3>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full font-medium">Last 30 Days</span>
              </div>

              <div className="flex-1 flex flex-col justify-center gap-4">
                {/* Upgrade Flow */}
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-200 rounded-full text-green-700">
                      <ArrowUpRight size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-green-800 uppercase tracking-wide">Upgraded</p>
                      <p className="text-lg font-bold text-slate-900">12,450</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-white px-2 py-1 rounded border border-green-200">+5.2%</span>
                </div>

                {/* Downgrade Flow */}
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-100 group cursor-pointer hover:border-orange-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-200 rounded-full text-orange-700">
                      <ArrowDownRight size={18} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-orange-800 uppercase tracking-wide">Downgraded</p>
                      <p className="text-lg font-bold text-slate-900">3,200</p>
                    </div>
                  </div>
                  <button className="text-xs font-bold text-white bg-orange-500 px-3 py-1.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                    Win Back
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ARPU & Heatmap Row - MD3 Enhanced */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white shadow-md shadow-indigo-200">
                  <Layout size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Cross-Tabulation: Tenure vs. Tier</h3>
                  {selectedSegment && (
                    <p className="text-xs text-slate-500 mt-0.5">Based on selected segment</p>
                  )}
                </div>
              </div>
              <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                <Download size={18} />
              </button>
            </div>

            {/* Heatmap Grid Visualization - MD3 Enhanced */}
            <div className="grid grid-cols-5 gap-2 text-sm">
              {/* Header Row */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 font-bold text-slate-600 text-xs flex items-center justify-center rounded-lg border border-slate-200">Tenure \ Tier</div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-3 font-bold text-indigo-700 text-xs text-center rounded-lg border border-indigo-200">Crown</div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 font-bold text-blue-700 text-xs text-center rounded-lg border border-blue-200">Diamond</div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-3 font-bold text-amber-700 text-xs text-center rounded-lg border border-amber-200">Gold</div>
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-3 font-bold text-slate-700 text-xs text-center rounded-lg border border-slate-200">Silver</div>

              {computedHeatmapData.map((row, i) => (
                <React.Fragment key={i}>
                  {/* Row Label */}
                  <div className="bg-slate-50 p-3 font-semibold text-slate-700 text-xs border border-slate-200 rounded-lg flex items-center justify-center">
                    {row.tenure}
                  </div>
                  {/* Cells - Color intensity based on value */}
                  <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white p-3 flex items-center justify-center font-semibold rounded-lg shadow-sm transition-all hover:scale-105" style={{ opacity: Math.max(0.3, row.crown / 100) }}>{row.crown}%</div>
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 flex items-center justify-center font-semibold rounded-lg shadow-sm transition-all hover:scale-105" style={{ opacity: Math.max(0.3, row.diamond / 100) }}>{row.diamond}%</div>
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 text-white p-3 flex items-center justify-center font-semibold rounded-lg shadow-sm transition-all hover:scale-105" style={{ opacity: Math.max(0.3, row.gold / 100) }}>{row.gold}%</div>
                  <div className="bg-gradient-to-br from-slate-500 to-slate-600 text-white p-3 flex items-center justify-center font-semibold rounded-lg shadow-sm transition-all hover:scale-105" style={{ opacity: Math.max(0.3, row.silver / 100) }}>{row.silver}%</div>
                </React.Fragment>
              ))}
            </div>
            <p className="text-xs text-slate-500 mt-3 text-right">
              * {selectedSegment ? 'Percentage of selected segment' : 'Percentage of total user base'}
            </p>
          </div>

          {/* Sampling Table - MD3 Enhanced */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-gradient-to-r from-slate-50 to-white">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <div className="p-1.5 bg-indigo-100 rounded-lg">
                  <Search size={16} className="text-indigo-600" />
                </div>
                Individual Sampling
              </h3>
              <span className="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full font-medium">
                {selectedSegment ? `Segment: ${selectedSegment.name}` : 'All Users'}
              </span>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="p-3 pl-4">MSISDN</th>
                  <th className="p-3">Current Tier</th>
                  <th className="p-3">Avg ARPU</th>
                  <th className="p-3">Device</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-indigo-50/50 transition-colors">
                    <td className="p-3 pl-4 font-mono text-slate-600">{user.msisdn}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${user.tier === 'Diamond' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                        user.tier === 'Gold' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-slate-50 text-slate-600 border-slate-100'
                        }`}>
                        {user.tier}
                      </span>
                    </td>
                    <td className="p-3 font-medium text-slate-800">{user.arpu}</td>
                    <td className="p-3 text-slate-500">{user.device}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="text-indigo-600 hover:text-indigo-800 text-xs font-semibold hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between bg-slate-50">
              <span className="text-xs text-slate-500 font-medium">
                Showing {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, count)} of {count}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || listLoading}
                  className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} className="text-slate-600" />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={page * pageSize >= count || listLoading}
                  className="p-2 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={16} className="text-slate-600" />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Detail Modal */}
      {
        selectedUser && (
          <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
        )
      }
    </div >
  );
};

export default CustomerProfileOverview;