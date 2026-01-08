import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// Error Boundary Component
class DashboardErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.error('🔴 Dashboard Error Boundary caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🔴 Dashboard Error Boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Dashboard Error</h1>
            <p className="text-gray-600 mb-4">Something went wrong while loading the dashboard.</p>
            <details className="text-left">
              <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-w-md">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
import {
  Activity,
  Megaphone,
  Users,
  Download,
  Search,
  Bell,
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  Signal,
  Wallet,
  Plane,
  MoreHorizontal,
  Globe,
  Zap,
  Calendar,
  Bookmark,
  Bot,
  Edit,
  Trash2,
  BarChart3,
  CheckCircle,
  X,
  Mail
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import { useBusinessOverview, useAiActionableTasks, useUpcomingHoliday } from '../hooks/useDashboardData';
import { useCampaignFlightData } from '../hooks/useCampaignFlightData';
import { useDashboardCampaignAutoSend } from '../hooks/useDashboardCampaignAutoSend';
import ChatAssistant from './ChatAssistant';
import { supabase } from '../services/supabaseClient';

function DashboardContent() {
  const navigate = useNavigate();

  console.log('🟡 Dashboard component rendering...');

  // Data Hooks
  const { metrics } = useBusinessOverview();
  const { tasks } = useAiActionableTasks();
  const { campaigns, loading: campaignsLoading, refreshCampaigns } = useCampaignFlightData();
  const { holiday } = useUpcomingHoliday();
  
  // ✅ Fix-6: Dashboard Auto-Send and Realtime Updates
  const {
    notifications,
    handleCampaignActivated,
    subscribeToCampaign,
    unsubscribeFromCampaign,
    updateCampaignConversion,
    removeNotification
  } = useDashboardCampaignAutoSend();
  
  // ✅ UI State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInitialPrompt, setChatInitialPrompt] = useState<string | undefined>(undefined);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // ✅ Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (activeMenuId !== null) {
        setActiveMenuId(null);
      }
    };
    
    if (activeMenuId !== null) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeMenuId]);

  // Helper for sparklines (mock data generator for visuals if metrics don't have history)
  const getSparklineData = () => Array.from({ length: 10 }, (_, i) => ({ value: 50 + Math.random() * 50 }));

  // ✅ Interaction Handlers
  const handleDeepDive = () => {
    setChatInitialPrompt('Analyze the specific reasons for the recent churn spike and provide actionable recommendations.');
    setIsChatOpen(true);
  };

  const handleNavigateToCanvas = (template?: string) => {
    navigate(template ? `/campaign-canvas?template=${template}` : '/campaign-canvas');
  };

  const handleNavigateToAudience = () => {
    navigate('/audience-studio');
  };

  const handleNavigateToAnalytics = () => {
    navigate('/analytics');
  };

  const handleToggleCampaignStatus = async (id: string, currentStatus: string) => {
    // ✅ Fix: Normalize status (UI sends 'Active'/'Inactive', DB expects 'active'/'paused')
    const normalizedStatus = currentStatus.toLowerCase();
    const isActive = normalizedStatus === 'active' || currentStatus === 'Active';
    const newStatus = isActive ? 'paused' : 'active';
    const wasInactive = !isActive; // Was paused/draft, now activating
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) throw error;
      
      // ✅ Fix-6: If activating campaign, auto-send emails and subscribe to updates
      if (wasInactive && newStatus === 'active') {
        const campaign = campaigns.find(c => c.id === id);
        if (campaign) {
          // Auto-send emails to demo email addresses
          await handleCampaignActivated(id);
          
          // Subscribe to realtime updates for conversions
          subscribeToCampaign(id, campaign.name);
        }
      } else if (isActive && newStatus === 'paused') {
        // Unsubscribe when pausing
        unsubscribeFromCampaign(id);
      }
      
      // Refresh campaigns to update UI
      refreshCampaigns();
    } catch (error) {
      console.error('Error updating campaign status:', error);
    }
  };
  
  // ✅ Task 1: Stabilize subscriptions - Only subscribe/unsubscribe when status actually changes
  // Use useMemo with deep comparison to avoid unnecessary re-subscriptions
  const campaignStatusKey = useMemo(() => {
    // Create a stable key based on campaign IDs and statuses
    // Sort to ensure consistent ordering regardless of array order
    const statusMap = campaigns.map(c => `${c.id}:${c.status}`).sort().join(',');
    return statusMap;
  }, [campaigns.map(c => `${c.id}:${c.status}`).sort().join(',')]); // ✅ Fix: Use content-based dependency

  useEffect(() => {
    console.log(`[Dashboard] Setting up subscriptions for ${campaigns.length} campaigns (status key: ${campaignStatusKey})`);
    
    campaigns.forEach(camp => {
      if (camp.status === 'Active') {
        // ✅ Task 1: subscribeToCampaign now checks internally if already subscribed
        console.log(`[Dashboard] Checking subscription for campaign ${camp.id} (${camp.name})`);
        subscribeToCampaign(camp.id, camp.name);
      } else {
        // Only unsubscribe if status is not Active
        console.log(`[Dashboard] Unsubscribing from campaign ${camp.id} (status: ${camp.status})`);
        unsubscribeFromCampaign(camp.id);
      }
    });
    
    // ✅ Task 1: Cleanup only on unmount, not on every render
    return () => {
      console.log(`[Dashboard] Component unmounting, cleaning up all subscriptions`);
      campaigns.forEach(camp => {
        unsubscribeFromCampaign(camp.id);
      });
    };
  }, [campaignStatusKey]); // Only re-run when status key changes
  
  // ✅ Fix-6: Refresh campaigns when notifications arrive to update conversion rates and reach
  // ✅ Fix: Increase delay to allow workflow to start before refreshing
  useEffect(() => {
    if (notifications.length > 0) {
      console.log(`[Dashboard] ${notifications.length} notifications received, scheduling campaign refresh...`);
      // ✅ Fix: Increased delay to ensure workflow has time to start (5 seconds instead of 1.5)
      // This prevents connection storm from interrupting workflow execution
      const timer = setTimeout(() => {
        console.log(`[Dashboard] Refreshing campaigns to update reach and conversion...`);
        refreshCampaigns();
      }, 5000); // Increased delay to allow workflow to start before refresh
      return () => clearTimeout(timer);
    }
  }, [notifications.length]);

  const handleDeleteCampaign = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      const { error } = await supabase
        .from('campaigns')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      refreshCampaigns();
    } catch (error) {
      console.error('Error deleting campaign:', error);
    }
  };

  console.log('🟢 Dashboard about to render JSX...', { metrics, tasks, campaigns });

  return (
    <div className="bg-slate-50 text-slate-800 antialiased h-screen flex overflow-hidden selection:bg-indigo-100 selection:text-indigo-900 font-sans">

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 relative w-full">
        <header className="h-16 flex items-center justify-between px-8 border-b border-slate-200 bg-white shrink-0 z-10 sticky top-0">
          <h1 className="text-xl font-semibold text-slate-900">Dashboard Overview</h1>
          <div className="flex items-center gap-4">
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400 group-focus-within:text-indigo-600">
                <Search size={20} />
              </div>
              <input
                type="text"
                className="pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full text-sm w-64 focus:ring-2 focus:ring-indigo-600/20 focus:bg-white transition-all shadow-sm outline-none"
                placeholder="Search insights..."
              />
            </div>
            <button className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 relative transition-colors">
              <Bell size={22} />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          {/* Scrollable Metric Area */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-50">
            <div className="max-w-[1600px] mx-auto flex flex-col gap-6 pb-24">

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Card 1: Active Users */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Total Active Users</p>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {metrics[3]?.value || '2.4M'}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 border border-green-100">
                      <TrendingUp size={12} />
                      +12.5%
                    </span>
                  </div>
                  <div className="w-full h-10 mt-auto opacity-70">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData()}>
                        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Card 2: ARPU */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Avg. Revenue (ARPU)</p>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {metrics[0]?.value || '$18.40'}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs font-semibold text-green-700 border border-green-100">
                      <TrendingUp size={12} />
                      +2.1%
                    </span>
                  </div>
                  <div className="w-full h-10 mt-auto opacity-70">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData()}>
                        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Card 3: Churn Rate */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Churn Rate</p>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">
                        {metrics[2]?.value || '0.8%'}
                      </h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 border border-red-100">
                      <TrendingUp size={12} />
                      +0.3%
                    </span>
                  </div>
                  <div className="w-full h-10 mt-auto opacity-70">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData()}>
                        <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Card 4: ROI */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between h-36 relative overflow-hidden group hover:border-indigo-300 transition-all cursor-pointer hover:shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-slate-500 mb-1">Campaign ROI</p>
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{metrics[1]?.value || '0%'}</h3>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 border border-slate-200">
                      <Minus size={12} />
                      0.0%
                    </span>
                  </div>
                  <div className="w-full h-10 mt-auto opacity-70">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={getSparklineData()}>
                        <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

              {/* Layout Content */}
              <div className="flex flex-col lg:flex-row gap-6">

                {/* Flight Board Table */}
                <div className="flex-1 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                  <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Campaign Flight Board</h2>
                      <p className="text-sm text-slate-500 mt-1">Live status of ongoing marketing initiatives</p>
                    </div>
                    <button 
                      onClick={() => handleNavigateToCanvas()}
                      className="flex items-center gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-full text-sm font-semibold transition-colors"
                    >
                      <Plus size={18} />
                      New Campaign
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="text-xs text-slate-500 uppercase border-b border-slate-100 bg-slate-50/50">
                          <th className="px-6 py-4 font-semibold w-20">On/Off</th>
                          <th className="px-2 py-4 font-semibold">Campaign Name</th>
                          <th className="px-6 py-4 font-semibold">Delivery</th>
                          <th className="px-6 py-4 font-semibold text-right">Reach</th>
                          <th className="px-6 py-4 font-semibold text-right">Conversion</th>
                          <th className="px-6 py-4"></th>
                        </tr>
                      </thead>
                      <tbody className="text-sm">
                        {campaignsLoading ? (
                          <tr><td colSpan={6} className="p-8 text-center text-slate-500">Loading flight data...</td></tr>
                        ) : campaigns.map((camp) => (
                          <tr key={camp.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-50">
                            <td className="px-6 py-4 align-top w-20">
                              <div 
                                onClick={() => handleToggleCampaignStatus(camp.id, camp.status)} 
                                className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${camp.status === 'Active' ? 'bg-indigo-600' : 'bg-slate-200'}`} 
                                title="Toggle"
                              >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${camp.status === 'Active' ? 'translate-x-4' : ''}`}></div>
                              </div>
                            </td>
                            <td className="px-2 py-4 align-top">
                              <div className="flex items-start gap-3">
                                <div className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${camp.status === 'Active' ? 'bg-indigo-50 border-indigo-100 text-indigo-600' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>
                                  <Signal size={20} />
                                </div>
                                <div>
                                  <span className="font-semibold text-slate-900 block text-sm">{camp.name}</span>
                                  <span className="text-xs text-slate-500 font-mono">ID: {camp.id.slice(0, 8)}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top">
                              <div className="flex flex-col">
                                <div className={`flex items-center gap-2 text-sm font-semibold leading-tight ${camp.status === 'Active' ? 'text-green-700' : 'text-slate-500'}`}>
                                  <span className={`w-2 h-2 rounded-full ${camp.status === 'Active' ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                  {camp.status}
                                </div>
                                <span className="text-xs text-slate-500 mt-1.5 font-medium pl-4">{camp.status === 'Active' ? 'Optimizing' : 'Paused'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top text-right font-medium text-slate-900">
                              {camp.reach?.toLocaleString()}
                            </td>
                            <td className="px-6 py-4 align-top text-right">
                              <div className="flex flex-col items-end gap-1">
                                <span className="font-medium text-slate-900">{(camp.conversion * 100).toFixed(1)}%</span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(camp.conversion * 1000, 100)}%` }}></div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 align-top text-right relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuId(activeMenuId === camp.id ? null : camp.id);
                                }}
                                className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                              >
                                <MoreHorizontal size={20} />
                              </button>
                              
                              {/* ✅ Dropdown Menu */}
                              {activeMenuId === camp.id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-8 top-12 z-50 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1"
                                >
                                  <button 
                                    onClick={() => { 
                                      navigate(`/analytics?campaignId=${camp.id}`);
                                      setActiveMenuId(null); 
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                  >
                                    <BarChart3 size={16} /> View Report
                                  </button>
                                  <button 
                                    onClick={() => { 
                                      handleNavigateToCanvas(); 
                                      // ✅ Fix: Pass campaignId via URL parameter
                                      navigate(`/campaign-canvas?campaignId=${camp.id}`);
                                      setActiveMenuId(null); 
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 text-slate-700"
                                  >
                                    <Edit size={16} /> Edit
                                  </button>
                                  <button 
                                    onClick={() => { handleDeleteCampaign(camp.id); setActiveMenuId(null); }}
                                    className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 flex items-center gap-2 text-red-600"
                                  >
                                    <Trash2 size={16} /> Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right Panel Items */}
                <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">

                  {/* Alert Card */}
                  {tasks.some(t => t.type === 'churn_risk') && (
                    <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-red-500 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="px-4 py-3 flex items-center justify-between bg-red-50/50 border-b border-red-50">
                        <div className="flex items-center gap-2">
                          <div className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </div>
                          <h3 className="font-bold text-slate-900 text-sm">Real-Time Alert</h3>
                        </div>
                        <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">Just now</span>
                      </div>
                      <div className="p-4 flex flex-col">
                        <div className="flex items-center gap-2 mb-2">
                          <TrendingDown size={20} className="text-red-600" />
                          <h4 className="font-semibold text-sm text-slate-900">Churn Risk Detected</h4>
                        </div>
                        <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                          High-risk gaming segment (iPhone 11 users) detailed.
                        </p>
                        <button 
                          onClick={handleDeepDive}
                          className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-lg text-xs font-semibold text-indigo-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                        >
                          Deep Dive Analysis
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upsell Card */}
                  <div className="bg-white rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="px-4 py-3 flex items-center justify-between bg-emerald-50/50 border-b border-emerald-50">
                      <div className="flex items-center gap-2">
                        <Globe size={18} className="text-emerald-600" />
                        <h3 className="font-bold text-slate-900 text-sm">Upsell Opportunity</h3>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">1h ago</span>
                    </div>
                    <div className="p-4 flex flex-col">
                      <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                        12k users hit 90% data cap. Suggest launching "Unlimited Weekend" add-on.
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleNavigateToAudience}
                          className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          Review Segment
                        </button>
                        <button className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors">
                          <Bookmark size={18} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Holidays Card */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                      <div className="flex items-center gap-2">
                        <Calendar size={18} className="text-slate-500" />
                        <h3 className="font-bold text-slate-900 text-sm">Upcoming Holidays</h3>
                      </div>
                    </div>
                    <div className="p-4 flex flex-col gap-3">
                      {holiday ? (
                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 hover:bg-indigo-50 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Zap size={18} className="text-indigo-600" />
                              <h4 className="text-sm font-bold text-slate-900">{holiday.name}</h4>
                            </div>
                            <span className="text-[10px] bg-white px-1.5 py-0.5 rounded border border-indigo-100 text-indigo-600 font-bold">
                              {new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 mb-3">
                            <Bot size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-indigo-900 font-medium leading-tight">AI Suggestion: Special offer for {holiday.name}.</p>
                          </div>
                          <button 
                            onClick={() => handleNavigateToCanvas('holiday')}
                            className="w-full py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                          >
                            <Plane size={14} />
                            Launch Campaign
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm text-slate-500 text-center py-4">No upcoming holidays found</div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        </div>
      </main>

      {/* ✅ Enhanced: Live Conversion Ticker (Flight Board Style) */}
      {notifications.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 space-y-2 max-w-md">
          {notifications.map((notif) => {
            // Determine notification style based on type
            let bgColor = 'bg-white';
            let borderColor = 'border-emerald-200';
            let iconBg = 'bg-emerald-100';
            let iconColor = 'text-emerald-600';
            let title = '🎉 Conversion Alert';
            let titleColor = 'text-slate-900';

            if (notif.type === 'upsell_sent') {
              bgColor = 'bg-indigo-50';
              borderColor = 'border-indigo-300';
              iconBg = 'bg-indigo-100';
              iconColor = 'text-indigo-600';
              title = '📧 Upsell Sent';
              titleColor = 'text-indigo-900';
            } else if (notif.type === 'workflow_step') {
              bgColor = 'bg-amber-50';
              borderColor = 'border-amber-300';
              iconBg = 'bg-amber-100';
              iconColor = 'text-amber-600';
              title = '⚙️ Workflow Step';
              titleColor = 'text-amber-900';
            }

            return (
              <div
                key={notif.id}
                className={`${bgColor} rounded-lg shadow-xl border-2 ${borderColor} p-4 flex items-start gap-3 animate-slide-up`}
                style={{
                  animation: 'slideUp 0.3s ease-out',
                }}
              >
                <div className="shrink-0 mt-0.5">
                  <div className={`w-10 h-10 rounded-full ${iconBg} flex items-center justify-center`}>
                    {notif.type === 'upsell_sent' ? (
                      <Mail className={iconColor} size={20} />
                    ) : notif.type === 'workflow_step' ? (
                      <Zap className={iconColor} size={20} />
                    ) : (
                      <CheckCircle className={iconColor} size={20} />
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <p className={`font-bold ${titleColor} text-sm`}>
                        {title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {notif.campaignName}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotification(notif.id)}
                      className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {notif.message ? (
                    <p className="text-sm text-slate-700 mb-2">{notif.message}</p>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <span className="font-mono">
                        {notif.timestamp.toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          second: '2-digit'
                        })}
                      </span>
                      {notif.userEmail && (
                        <>
                          <span>•</span>
                          <span className="truncate">{notif.userEmail}</span>
                        </>
                      )}
                      {notif.revenue && (
                        <>
                          <span>•</span>
                          <span className="font-semibold text-emerald-600">+${notif.revenue}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ✅ Chat Assistant with auto-prompt support */}
      <ChatAssistant 
        isOpen={isChatOpen} 
        onClose={() => {setIsChatOpen(false); setChatInitialPrompt(undefined);}} 
        initialPrompt={chatInitialPrompt}
      />

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: rgba(0, 0, 0, 0.05); 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: rgba(0, 0, 0, 0.2); 
            border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: rgba(0, 0, 0, 0.3); 
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-up {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

export default function Dashboard() {
  return (
    <DashboardErrorBoundary>
      <DashboardContent />
    </DashboardErrorBoundary>
  );
}
