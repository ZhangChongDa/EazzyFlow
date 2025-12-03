import React from 'react';
import { 
  TrendingUp, Users, Activity, AlertCircle, DollarSign, 
  Sparkles, ArrowRight, Zap, AlertTriangle, Play, Pause, XCircle 
} from 'lucide-react';
import { DASHBOARD_AI_TASKS, FUNNEL_DATA, HEALTH_ALERTS, DASHBOARD_KPIS } from '../constants';
import { AiActionTask } from '../types';

// --- Sub-components ---

const TaskCard: React.FC<{ task: AiActionTask }> = ({ task }) => {
  const isAlert = task.type === 'alert';
  const isOpp = task.type === 'opportunity';
  const isOpt = task.type === 'optimization';

  const borderColor = isAlert ? 'border-red-200' : isOpp ? 'border-indigo-200' : 'border-amber-200';
  const bgColor = isAlert ? 'bg-red-50' : isOpp ? 'bg-indigo-50' : 'bg-amber-50';
  const iconColor = isAlert ? 'text-red-600' : isOpp ? 'text-indigo-600' : 'text-amber-600';
  const headerBg = isAlert ? 'bg-red-100' : isOpp ? 'bg-indigo-100' : 'bg-amber-100';

  return (
    <div className={`bg-white rounded-xl border ${borderColor} shadow-sm flex flex-col h-full overflow-hidden transition-all hover:shadow-md`}>
      {/* Header */}
      <div className={`px-4 py-3 ${headerBg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          {isAlert && <AlertCircle size={18} className={iconColor} />}
          {isOpp && <Sparkles size={18} className={iconColor} />}
          {isOpt && <Zap size={18} className={iconColor} />}
          <span className={`text-sm font-bold ${iconColor} uppercase tracking-wider`}>
            {task.type}
          </span>
        </div>
        <span className="text-xs font-semibold bg-white/60 px-2 py-0.5 rounded text-slate-700">
          {task.impact}
        </span>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 space-y-4">
        <div>
          <h4 className="font-bold text-slate-900 mb-1 leading-tight">{task.title}</h4>
          <p className="text-xs text-slate-500">Task ID: #{task.id}</p>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900 block text-xs uppercase text-slate-400 mb-0.5">The Issue</span>
            {task.issue}
          </div>
          <div className="text-sm text-slate-700">
            <span className="font-semibold text-slate-900 block text-xs uppercase text-slate-400 mb-0.5">The Why</span>
            {task.analysis}
          </div>
          <div className={`p-3 rounded-lg border ${borderColor} ${bgColor}`}>
            <span className={`font-bold block text-xs uppercase mb-1 ${iconColor}`}>The Fix</span>
            <p className="text-sm text-slate-800 font-medium">{task.suggestion}</p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 mt-auto flex gap-2">
        <button className={`flex-1 py-2 px-3 rounded-lg text-white text-sm font-medium shadow-sm transition-colors ${
          isAlert ? 'bg-red-600 hover:bg-red-700' : 
          isOpp ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-900 hover:bg-slate-800'
        }`}>
          {isAlert ? 'Fix Issue' : isOpp ? 'Create Campaign' : 'Execute Fix'}
        </button>
        <button className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm font-medium transition-colors">
          Dismiss
        </button>
      </div>
    </div>
  );
};

const KPICard = ({ title, value, trend, trendUp, icon: Icon }: any) => (
  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-200 transition-colors group cursor-pointer">
    <div className="flex justify-between items-start mb-2">
      <p className="text-sm font-medium text-slate-500 group-hover:text-indigo-600 transition-colors">{title}</p>
      <div className={`p-2 rounded-lg ${trendUp ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
        <Icon size={18} />
      </div>
    </div>
    <div className="flex flex-col gap-1">
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      <div className="flex items-center gap-1.5">
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600' : 'text-slate-500'}`}>
           {trend}
        </span>
      </div>
    </div>
  </div>
);

const ConversionFunnelViz = () => {
  // Custom SVG visualization to match the "Attachment 2" style (Separated trapezoids)
  // We use fixed geometry for the shapes to ensure a perfect funnel look, 
  // preventing the "widening" issue when Revenue > Conversion.
  
  const width = 600;
  const height = 300;
  const gap = 12;
  const layerHeight = (height - (3 * gap)) / 4; // ~66px

  // Trapezoid geometry calculation
  // Each layer insets X by a fixed amount to create the pyramid shape
  const insetStep = 50; 
  
  const layers = FUNNEL_DATA.map((d, i) => {
    const topInset = i * insetStep;
    const bottomInset = (i + 1) * insetStep;
    
    // Coordinates for polygon: TopLeft, TopRight, BottomRight, BottomLeft
    const x1 = topInset;
    const x2 = width - topInset;
    const x3 = width - bottomInset;
    const x4 = bottomInset;
    
    const y1 = i * (layerHeight + gap);
    const y2 = y1 + layerHeight;

    const points = `${x1},${y1} ${x2},${y1} ${x3},${y2} ${x4},${y2}`;
    
    // Annotation line coordinates
    const lineStartX = x2 - 20;
    const lineStartY = y1 + (layerHeight / 2);
    const lineEndX = width + 40; // Push out to the right

    return { ...d, points, lineStartX, lineStartY, lineEndX };
  });

  return (
    <div className="w-full flex justify-center py-4 overflow-visible">
      <svg width="100%" height="320" viewBox={`-50 0 ${width + 250} ${height}`} className="overflow-visible">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000000" floodOpacity="0.1"/>
          </filter>
          <linearGradient id="gradExposure" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" />
            <stop offset="100%" stopColor="#4338ca" />
          </linearGradient>
           <linearGradient id="gradEngagement" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
           <linearGradient id="gradConversion" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
           <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
        </defs>

        {layers.map((layer, i) => (
          <g key={i}>
            {/* Trapezoid Shape */}
            <polygon 
              points={layer.points} 
              fill={layer.stage === 'Revenue' ? 'url(#gradRevenue)' : i === 0 ? 'url(#gradExposure)' : i === 1 ? 'url(#gradEngagement)' : 'url(#gradConversion)'}
              filter="url(#shadow)"
              className="transition-all duration-300 hover:opacity-90 cursor-pointer"
            />
            
            {/* Stage Label Inside */}
            <text 
              x="300" 
              y={i * (layerHeight + gap) + (layerHeight / 2) + 6} 
              textAnchor="middle" 
              fill="white" 
              className="text-lg font-bold uppercase tracking-widest pointer-events-none"
              style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
            >
              {layer.stage}
            </text>

            {/* Connecting Line */}
            <line 
              x1={layer.lineStartX} 
              y1={layer.lineStartY} 
              x2={layer.lineEndX} 
              y2={layer.lineStartY} 
              stroke="#cbd5e1" 
              strokeWidth="1" 
              strokeDasharray="4 4"
            />
            <circle cx={layer.lineEndX} cy={layer.lineStartY} r="3" fill="#94a3b8" />

            {/* Side Annotation */}
            <foreignObject x={layer.lineEndX + 15} y={layer.lineStartY - 25} width="200" height="50">
              <div className="flex flex-col justify-center h-full">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{layer.label}</p>
                <div className="flex items-baseline gap-2">
                   <p className="text-sm font-bold text-slate-800">
                     {layer.stage === 'Revenue' ? '$' : ''}{Number(layer.value).toLocaleString()}
                   </p>
                   {layer.dropOff && layer.dropOff !== '-' && layer.dropOff !== '0%' && (
                     <span className="text-[10px] text-red-500 bg-red-50 px-1 rounded border border-red-100">
                       ↓ {layer.dropOff}
                     </span>
                   )}
                </div>
              </div>
            </foreignObject>
          </g>
        ))}
      </svg>
    </div>
  );
};

// --- Main Dashboard Component ---

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-8 pb-12">
      
      {/* 1. AI Strategy & Action Center */}
      <section className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 leading-none">AI Strategy & Action Center</h2>
            <p className="text-sm text-slate-500 mt-1">Daily intelligence briefing & prioritized tasks.</p>
          </div>
        </div>

        {/* Daily Executive Briefing */}
        <div className="bg-white border border-indigo-100 rounded-xl p-6 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <div className="relative z-10">
            <h3 className="text-sm font-bold text-indigo-900 uppercase tracking-wide mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-indigo-500" /> Daily Executive Briefing
            </h3>
            <p className="text-slate-700 text-lg leading-relaxed max-w-4xl">
              "Good morning. Overall revenue is up <span className="text-green-600 font-bold bg-green-50 px-1 rounded">5%</span> WoW. 
              However, churn rate in <span className="font-semibold text-slate-900">Yangon</span> region showed an anomaly 
              (<span className="text-red-600 font-bold bg-red-50 px-1 rounded">+0.2%</span>) yesterday, likely due to competitor pricing. 
              I have generated <span className="font-semibold text-slate-900 underline decoration-indigo-300 decoration-2">3 actionable tasks</span> for you below."
            </p>
          </div>
          {/* Decorative background element */}
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-indigo-50 rounded-full blur-3xl opacity-60 pointer-events-none"></div>
        </div>

        {/* AI Actionable Task List */}
        <div>
           <h3 className="text-sm font-bold text-slate-900 mb-3 ml-1">AI Actionable Task List</h3>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {DASHBOARD_AI_TASKS.map(task => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </div>
      </section>

      {/* 2. Executive Overview (KPIs) */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Global Business Overview</h2>
          <select className="bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded-lg px-3 py-2 outline-none hover:border-slate-300">
             <option>Last 7 Days</option>
             <option>Last 30 Days</option>
             <option>This Quarter</option>
          </select>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <KPICard icon={DollarSign} {...DASHBOARD_KPIS[0]} trendUp={true} />
          <KPICard icon={Activity} {...DASHBOARD_KPIS[1]} trendUp={false} />
          <KPICard icon={TrendingUp} {...DASHBOARD_KPIS[2]} trendUp={true} />
          <KPICard icon={Users} {...DASHBOARD_KPIS[3]} trendUp={true} />
        </div>
      </section>

      {/* 3. Funnel & Health Monitor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Unified Conversion Funnel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Unified Conversion Funnel</h3>
              <p className="text-xs text-slate-500 mt-0.5">Campaign performance flow</p>
            </div>
            <button className="text-xs text-indigo-600 font-medium hover:bg-indigo-50 px-2 py-1 rounded transition-colors">
              View Attribution
            </button>
          </div>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
             {FUNNEL_DATA.map((stage, idx) => (
               <div key={idx} className="text-center p-3 rounded-lg bg-slate-50/50">
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1" style={{ color: stage.color }}>{stage.stage}</p>
                 <p className="text-lg font-bold text-slate-900">{stage.stage === 'Revenue' ? '$' : ''}{Number(stage.value).toLocaleString()}</p>
               </div>
             ))}
          </div>
          
          <ConversionFunnelViz />

          {/* Funnel Diagnostics */}
          <div className="mt-6 pt-5 border-t border-slate-100">
             <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
               <AlertTriangle size={14} className="text-amber-500" />
               Worst Performing Campaigns (Funnel Leaks)
             </h4>
             <div className="space-y-2">
               {[1, 2].map(i => (
                 <div key={i} className="flex items-center justify-between text-sm p-2.5 bg-slate-50 rounded-lg hover:bg-slate-100 transition cursor-pointer group">
                   <div className="flex items-center gap-3">
                     <span className="text-slate-400 font-mono text-xs bg-white border border-slate-200 px-1.5 py-0.5 rounded">#102{i}</span>
                     <span className="text-slate-700 font-medium group-hover:text-indigo-700 transition-colors">
                        {i === 1 ? 'Weekend Data Flash Sale (Yangon)' : 'Midnight Data Pack Push'}
                     </span>
                   </div>
                   <div className="flex items-center gap-4 text-xs">
                      <span className="text-slate-500">Conv. Rate: <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded ml-1">{i === 1 ? '0.8%' : '1.1%'}</span></span>
                      <ArrowRight size={14} className="text-slate-300 group-hover:text-indigo-400" />
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* Campaign Health Monitor */}
        <div className="space-y-6">
           {/* Status Widgets */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Health Monitor</h3>
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="p-3 bg-green-50 rounded-lg border border-green-100 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                   <Play size={20} className="text-green-600 mb-2" />
                   <span className="text-2xl font-bold text-green-700">14</span>
                   <span className="text-[10px] font-bold uppercase text-green-600 tracking-wider">Running</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex flex-col items-center justify-center text-center hover:shadow-sm transition-shadow">
                   <Pause size={20} className="text-slate-400 mb-2" />
                   <span className="text-2xl font-bold text-slate-700">8</span>
                   <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Paused</span>
                </div>
              </div>
              
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex items-center justify-between px-5">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                     <AlertCircle size={18} />
                   </div>
                   <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Attention</span>
                 </div>
                 <span className="text-2xl font-bold text-amber-700">3</span>
              </div>
           </div>

           {/* Live Alerts List */}
           <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
             <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
                Live Alerts
                <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-full">Real-time</span>
             </h3>
             <div className="space-y-3">
                {HEALTH_ALERTS.map((alert) => (
                  <div key={alert.id} className="flex gap-3 items-start p-2.5 rounded-lg border border-transparent hover:bg-slate-50 hover:border-slate-100 transition-all group cursor-pointer">
                    {alert.type === 'critical' ? (
                      <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-xs text-slate-800 font-semibold leading-snug mb-1 group-hover:text-indigo-700 transition-colors">{alert.message}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{alert.time}</p>
                    </div>
                  </div>
                ))}
             </div>
             <button className="w-full mt-4 py-2.5 text-xs font-semibold text-slate-600 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200">
               Run System Diagnostics
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;