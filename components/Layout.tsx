
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Megaphone,
  Palette,
  BarChart3,
  Settings,
  Database,
  ShoppingBag,
  LogOut,
  Loader2,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { dataService } from '../services/dataService';
import ChatAssistant from './ChatAssistant';
import { CanvasNodesProvider, useCanvasNodes } from '../contexts/CanvasNodesContext';
import { ChatAssistantProvider, useChatAssistant } from '../contexts/ChatAssistantContext';

const LayoutContentInner: React.FC = () => {
  console.log('🔵 LayoutContentInner rendering...');

  const [user, setUser] = useState<any>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [dbStatus, setDbStatus] = useState<'connected' | 'empty' | 'error'>('empty');
  const navigate = useNavigate();
  const location = useLocation();
  
  // ✅ Task 3: Determine context mode based on current route
  const contextMode = location.pathname === '/campaign-canvas' ? 'canvas' : 'catalog';
  
  // ✅ Task 3: Get nodes from context for ChatAssistant
  const { nodes: canvasNodes } = useCanvasNodes();
  
  // ✅ Fix-3: Get ChatAssistant context including initialPrompt
  const { isOpen, closeChat, onResponseCallback, initialPrompt } = useChatAssistant();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth check failed:', error);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sync data when user is authenticated
  useEffect(() => {
    if (!user) return;

    const syncCloudData = async () => {
      setIsSyncing(true);
      try {
        const dbProducts = await dataService.getProducts().catch(() => []);
        const dbCoupons = await dataService.getCoupons().catch(() => []);
        const dbCustomers = await dataService.getCustomers().catch(() => []);

        if (dbProducts.length || dbCoupons.length || dbCustomers.length) {
          setDbStatus('connected');
        } else {
          setDbStatus('empty');
        }
      } catch (error) {
        console.error("Database sync failed", error);
        setDbStatus('error');
      } finally {
        setIsSyncing(false);
      }
    };

    syncCloudData();
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/login';
  };

  console.log('🟣 LayoutContentInner about to render JSX...');

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col fixed h-full z-10 shadow-sm">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100 bg-slate-50/30">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-200">
            T
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight tracking-tight text-slate-900 italic">
              TeleFlow AI
            </span>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
              Growth Engine
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 mt-2">
            Intelligence
          </div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <LayoutDashboard size={18} />
            <span>Smart Dashboard</span>
          </NavLink>
          <NavLink
            to="/analytics"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <BarChart3 size={18} />
            <span>Analytics & Reports</span>
          </NavLink>

          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 mt-6">
            Campaigns
          </div>
          <NavLink
            to="/campaign-canvas"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Megaphone size={18} />
            <span>Campaign Canvas</span>
          </NavLink>
          <NavLink
            to="/content-studio"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Palette size={18} />
            <span>Content Studio</span>
          </NavLink>
          <NavLink
            to="/product-catalog"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <ShoppingBag size={18} />
            <span>Offer Catalog</span>
          </NavLink>

          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-4 mt-6">
            Audience
          </div>
          <NavLink
            to="/customer-360"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Users size={18} />
            <span>Customer 360</span>
          </NavLink>
          <NavLink
            to="/audience-studio"
            className={({ isActive }) =>
              `w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`
            }
          >
            <Database size={18} />
            <span>Audience Studio</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          {dbStatus === 'empty' ? (
            <div className="px-4 py-2 mb-2 flex items-center gap-2 text-[10px] text-amber-600 font-black uppercase bg-amber-50 border border-amber-100 rounded-lg shadow-sm">
              <ShieldCheck size={12} />
              Expert Mock Mode
            </div>
          ) : isSyncing ? (
            <div className="px-4 py-2 mb-2 flex items-center gap-2 text-[10px] text-indigo-600 font-black uppercase bg-white border border-indigo-100 rounded-lg animate-pulse">
              <Loader2 size={12} className="animate-spin" />
              Syncing Cloud...
            </div>
          ) : (
            <div className="px-4 py-2 mb-2 flex items-center gap-2 text-[10px] text-emerald-600 font-black uppercase bg-emerald-50 border border-emerald-100 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
              Cloud Active
            </div>
          )}
          {/* User Info */}
          <div className="px-4 py-2 mb-2 text-xs text-gray-600">
            <div className="font-medium text-gray-900">{user?.email}</div>
            <div className="text-[10px] text-gray-500">Signed in</div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-red-600 text-sm font-medium w-full rounded-lg hover:bg-white transition-all"
          >
            <LogOut size={18} />
            <span>Sign Out</span>
          </button>
          <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 text-sm font-medium w-full rounded-lg hover:bg-white transition-all">
            <Settings size={18} /> Settings
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 overflow-y-auto h-screen">
        <Outlet />
      </main>

      {/* ✅ Task 3: Global AI Assistant with context mode and nodes */}
      {/* ✅ Fix-2: Pass ChatAssistant context props */}
      <ChatAssistant 
        contextMode={contextMode} 
        canvasNodes={canvasNodes}
        isOpen={isOpen}
        onClose={closeChat}
        initialPrompt={initialPrompt} // ✅ Fix-3: Use initialPrompt from Context
        onCopyGenerated={onResponseCallback ? (copy: string | null) => {
          // ✅ Fix-3: Always call onResponseCallback, even if copy is null (to handle errors)
          if (onResponseCallback) {
            onResponseCallback(copy);
          }
        } : undefined}
      />
    </div>
  );
};

const LayoutContent: React.FC = () => {
  return (
    <ChatAssistantProvider>
      <LayoutContentInner />
    </ChatAssistantProvider>
  );
};

const Layout: React.FC = () => {
  return (
    <CanvasNodesProvider>
      <LayoutContent />
    </CanvasNodesProvider>
  );
};

export default Layout;

