import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import CampaignCanvas from './components/CampaignCanvas';
import ContentStudio from './components/ContentStudio';
import ChatAssistant from './components/ChatAssistant';
import CustomerProfileOverview from './components/CustomerProfileOverview';
import AudienceStudio from './components/AudienceStudio';
import ProductCatalog from './components/ProductCatalog';
import Analytics from './components/Analytics';
import { ViewState, Product, Coupon } from './types';
import { INITIAL_PRODUCTS, INITIAL_COUPONS } from './constants';
import { 
  LayoutDashboard, 
  Users, 
  Megaphone, 
  Palette, 
  BarChart3, 
  Settings, 
  Database,
  ShoppingBag
} from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  
  // Shared State for Catalog
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);

  // Catalog Handlers
  const handleAddProduct = (p: Product) => setProducts([...products, p]);
  const handleUpdateProduct = (id: string, p: Partial<Product>) => setProducts(products.map(prod => prod.id === id ? { ...prod, ...p } : prod));
  const handleAddCoupon = (c: Coupon) => setCoupons([...coupons, c]);
  const handleUpdateCoupon = (id: string, c: Partial<Coupon>) => setCoupons(coupons.map(coup => coup.id === id ? { ...coup, ...c } : coup));

  const NavItem = ({ view, icon, label }: { view: ViewState, icon: React.ReactNode, label: string }) => (
    <button 
      onClick={() => setCurrentView(view)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
        currentView === view 
          ? 'bg-indigo-50 text-indigo-700' 
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex-shrink-0 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3 border-b border-slate-100">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">T</div>
          <span className="font-bold text-lg tracking-tight">TeleFlow AI</span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-2">Overview</div>
          <NavItem view={ViewState.DASHBOARD} icon={<LayoutDashboard size={18} />} label="Smart Dashboard" />
          <NavItem view={ViewState.ANALYTICS} icon={<BarChart3 size={18} />} label="Analytics & Reports" />

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">Campaigns</div>
          <NavItem view={ViewState.CAMPAIGN_CANVAS} icon={<Megaphone size={18} />} label="Campaign Canvas" />
          <NavItem view={ViewState.CONTENT_STUDIO} icon={<Palette size={18} />} label="Content Studio" />
          <NavItem view={ViewState.PRODUCT_CATALOG} icon={<ShoppingBag size={18} />} label="Offer Catalog" />

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-4 mt-6">Audience</div>
          <NavItem view={ViewState.CUSTOMER_360} icon={<Users size={18} />} label="Customer 360" />
          <NavItem view={ViewState.AUDIENCE} icon={<Database size={18} />} label="Audience Studio" />
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button className="flex items-center gap-3 px-4 py-3 text-slate-600 hover:text-slate-900 text-sm font-medium w-full">
            <Settings size={18} /> Settings
          </button>
          <div className="mt-4 flex items-center gap-3 px-4">
             <div className="w-8 h-8 rounded-full bg-slate-200"></div>
             <div>
               <p className="text-xs font-bold text-slate-900">Admin User</p>
               <p className="text-xs text-slate-500">MPT / Telenor / Ooredoo</p>
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen">
        <div className="max-w-7xl mx-auto h-full flex flex-col">
           {currentView === ViewState.DASHBOARD && <Dashboard />}
           {currentView === ViewState.CAMPAIGN_CANVAS && <CampaignCanvas products={products} coupons={coupons} />}
           {currentView === ViewState.CONTENT_STUDIO && <ContentStudio />}
           {currentView === ViewState.CUSTOMER_360 && <CustomerProfileOverview />}
           {currentView === ViewState.AUDIENCE && <AudienceStudio />}
           {currentView === ViewState.PRODUCT_CATALOG && (
             <ProductCatalog 
                products={products} 
                coupons={coupons}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onAddCoupon={handleAddCoupon}
                onUpdateCoupon={handleUpdateCoupon}
             />
           )}
           
           {currentView === ViewState.ANALYTICS && <Analytics />}
        </div>
      </main>

      {/* Global Chat Assistant */}
      <ChatAssistant />
    </div>
  );
};

export default App;