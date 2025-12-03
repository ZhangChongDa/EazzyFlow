import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  AlertTriangle, ArrowRight, ArrowUpRight, ArrowDownRight, Users, 
  Filter, Download, Layout, Save, Search, X, ChevronRight, Activity, 
  Smartphone, CreditCard, Clock, Zap
} from 'lucide-react';

// --- Mock Data ---

const MOCK_SEGMENT_DNA = [
  { subject: 'ARPU', A: 150, B: 100, fullMark: 150 },
  { subject: 'Data Usage', A: 80, B: 100, fullMark: 150 },
  { subject: 'Voice MOU', A: 120, B: 90, fullMark: 150 },
  { subject: 'Digital', A: 140, B: 60, fullMark: 150 }, // App usage
  { subject: 'Tenure', A: 60, B: 100, fullMark: 150 },
  { subject: 'Loyalty', A: 110, B: 100, fullMark: 150 },
];

const MOCK_LIFECYCLE_DATA = [
  { name: 'New', value: 15, color: '#60a5fa' },
  { name: 'Growing', value: 35, color: '#34d399' },
  { name: 'Stable', value: 40, color: '#818cf8' },
  { name: 'Churn Risk', value: 10, color: '#f87171' },
];

const MOCK_ARPU_DIST = [
  { range: '0-2k', users: 2500 },
  { range: '2k-5k', users: 4500 },
  { range: '5k-10k', users: 3000 },
  { range: '10k+', users: 1200 },
];

const MOCK_HEATMAP_DATA = [
  // Tenure (rows) x Tier (cols)
  { tenure: '< 6mo', crown: 5, diamond: 10, gold: 40, silver: 80 },
  { tenure: '6-12mo', crown: 15, diamond: 25, gold: 60, silver: 50 },
  { tenure: '1-3yr', crown: 40, diamond: 60, gold: 50, silver: 30 },
  { tenure: '> 3yr', crown: 80, diamond: 50, gold: 20, silver: 10 },
];

const MOCK_SAMPLES = [
  { id: 'u1', msisdn: '09xxxx1234', tier: 'Diamond', arpu: '12,500', device: 'iPhone 14' },
  { id: 'u2', msisdn: '09xxxx5678', tier: 'Gold', arpu: '8,200', device: 'Samsung S23' },
  { id: 'u3', msisdn: '09xxxx9012', tier: 'Silver', arpu: '4,500', device: 'Oppo A54' },
];

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
        
        {/* 2. Segment DNA Analyzer (Left Column) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -z-0 pointer-events-none"></div>
             
             <div className="relative z-10">
               <div className="flex justify-between items-start mb-4">
                 <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                   <Users size={18} className="text-indigo-600" /> Segment DNA
                 </h3>
                 <button className="text-xs text-indigo-600 font-medium hover:underline">Change</button>
               </div>
               
               {/* Segment Selector (Mock) */}
               <div className="mb-4 bg-white/50 backdrop-blur-sm border border-indigo-200 rounded-lg p-2 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition">
                  <div>
                    <span className="block text-xs text-slate-400 font-bold uppercase">Target Segment</span>
                    <span className="block text-sm font-bold text-indigo-700">Student & Youth</span>
                  </div>
                  <ChevronRight size={16} className="text-indigo-400" />
               </div>

               {/* Radar Chart */}
               {/* Fixed container size and wrapper to handle positioning cleanly without confusing Recharts */}
               <div className="-ml-6 h-64">
                  <div className="w-full h-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="70%" data={MOCK_SEGMENT_DNA}>
                        <PolarGrid stroke="#e2e8f0" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                        <Radar name="Student" dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#6366f1" fillOpacity={0.4} />
                        <Radar name="Avg" dataKey="B" stroke="#94a3b8" strokeWidth={2} fill="#cbd5e1" fillOpacity={0.1} />
                        <Tooltip 
                          contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
               </div>

               {/* Insights & Action */}
               <div className="space-y-3 mt-2">
                 <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                    <p className="text-xs text-indigo-800 leading-snug">
                      <strong>Insight:</strong> High digital usage but low ARPU compared to average. High potential for "Data Content" upsell.
                    </p>
                 </div>
                 <button className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2">
                   <Zap size={16} /> Create Campaign for Segment
                 </button>
               </div>
             </div>
          </div>
        </div>

        {/* 3. Macro Dashboard (Right Column - 2 span) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Top Row: Quick Stats & Migration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Lifecycle Dist */}
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-4 text-sm">Lifecycle Distribution</h3>
                <div className="flex items-center">
                  <div className="h-40 w-40 min-w-[10rem] shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={MOCK_LIFECYCLE_DATA} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                          {MOCK_LIFECYCLE_DATA.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2 pl-4">
                     {MOCK_LIFECYCLE_DATA.map(d => (
                       <div key={d.name} className="flex justify-between items-center text-sm">
                         <div className="flex items-center gap-2">
                           <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }}></span>
                           <span className="text-slate-600">{d.name}</span>
                         </div>
                         <span className="font-bold text-slate-800">{d.value}%</span>
                       </div>
                     ))}
                  </div>
                </div>
             </div>

             {/* Segment Migration Matrix (Simplified) */}
             <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-sm">Value Migration (MoM)</h3>
                  <span className="text-xs text-slate-400">Last 30 Days</span>
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

          {/* ARPU & Heatmap Row */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 text-sm">Cross-Tabulation: Tenure vs. Tier</h3>
                <button className="text-slate-400 hover:text-indigo-600"><Download size={16} /></button>
             </div>
             
             {/* Heatmap Grid Visualization */}
             <div className="grid grid-cols-5 gap-1 text-sm">
                {/* Header Row */}
                <div className="bg-slate-50 p-2 font-bold text-slate-400 text-xs flex items-center justify-center">Tenure \ Tier</div>
                <div className="bg-indigo-50/50 p-2 font-bold text-slate-600 text-xs text-center">Crown</div>
                <div className="bg-blue-50/50 p-2 font-bold text-slate-600 text-xs text-center">Diamond</div>
                <div className="bg-amber-50/50 p-2 font-bold text-slate-600 text-xs text-center">Gold</div>
                <div className="bg-slate-50/50 p-2 font-bold text-slate-600 text-xs text-center">Silver</div>

                {MOCK_HEATMAP_DATA.map((row, i) => (
                  <React.Fragment key={i}>
                    {/* Row Label */}
                    <div className="bg-slate-50 p-3 font-semibold text-slate-600 text-xs border-r border-slate-200 flex items-center justify-center">
                      {row.tenure}
                    </div>
                    {/* Cells - Color intensity based on mock value */}
                    <div className="bg-indigo-600 text-white p-3 flex items-center justify-center font-medium" style={{ opacity: row.crown / 100 }}>{row.crown}%</div>
                    <div className="bg-indigo-600 text-white p-3 flex items-center justify-center font-medium" style={{ opacity: row.diamond / 100 }}>{row.diamond}%</div>
                    <div className="bg-indigo-600 text-white p-3 flex items-center justify-center font-medium" style={{ opacity: row.gold / 100 }}>{row.gold}%</div>
                    <div className="bg-indigo-600 text-white p-3 flex items-center justify-center font-medium" style={{ opacity: row.silver / 100 }}>{row.silver}%</div>
                  </React.Fragment>
                ))}
             </div>
             <p className="text-xs text-slate-400 mt-2 text-right">* Percentage of total user base</p>
          </div>

          {/* Sampling Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
               <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                 <Search size={14} className="text-slate-400" /> Individual Sampling
               </h3>
               <span className="text-xs text-slate-500">Verifying: Student Segment</span>
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
                 {MOCK_SAMPLES.map((user) => (
                   <tr key={user.id} className="hover:bg-indigo-50/50 transition-colors">
                     <td className="p-3 pl-4 font-mono text-slate-600">{user.msisdn}</td>
                     <td className="p-3">
                       <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${
                         user.tier === 'Diamond' ? 'bg-blue-50 text-blue-600 border-blue-100' :
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
          </div>

        </div>
      </div>

      {/* Detail Modal */}
      {selectedUser && (
        <UserDetailModal user={selectedUser} onClose={() => setSelectedUser(null)} />
      )}
    </div>
  );
};

export default CustomerProfileOverview;