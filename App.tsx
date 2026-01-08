
import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import Dashboard from './components/Dashboard.tsx';
import CampaignCanvas from './components/CampaignCanvas.tsx';
import ContentStudio from './components/ContentStudio.tsx';
import CustomerProfileOverview from './components/CustomerProfileOverview.tsx';
import AudienceStudio from './components/AudienceStudio.tsx';
import ProductCatalog from './components/ProductCatalog.tsx';
import Analytics from './components/Analytics.tsx';
import { Login } from './components/Login.tsx';
import { Product, Coupon } from './types.ts';
import { INITIAL_PRODUCTS, INITIAL_COUPONS } from './constants.ts';
import { dataService } from './services/dataService.ts';
import { supabase } from './services/supabaseClient';
import { Loader2 } from 'lucide-react';

// Wrapper components to pass props
const CampaignCanvasWrapper: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);

  useEffect(() => {
    const loadData = async () => {
      const dbProducts = await dataService.getProducts().catch(() => []);
      const dbCoupons = await dataService.getCoupons().catch(() => []);
      if (dbProducts.length > 0) setProducts(dbProducts);
      if (dbCoupons.length > 0) setCoupons(dbCoupons);
    };
    loadData();
  }, []);

  return <CampaignCanvas products={products} coupons={coupons} />;
};

const ProductCatalogWrapper: React.FC = () => {
  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [coupons, setCoupons] = useState<Coupon[]>(INITIAL_COUPONS);

  useEffect(() => {
    const loadData = async () => {
      const dbProducts = await dataService.getProducts().catch(() => []);
      const dbCoupons = await dataService.getCoupons().catch(() => []);
      if (dbProducts.length > 0) setProducts(dbProducts);
      if (dbCoupons.length > 0) setCoupons(dbCoupons);
    };
    loadData();
  }, []);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ProductCatalog
        products={products}
        coupons={coupons}
        onAddProduct={(p) => setProducts([...products, p])}
        onUpdateProduct={(id, p) => setProducts(products.map(it => it.id === id ? { ...it, ...p } : it))}
        onAddCoupon={(c) => setCoupons([...coupons, c])}
        onUpdateCoupon={(id, c) => setCoupons(coupons.map(it => it.id === id ? { ...it, ...c } : it))}
      />
    </div>
  );
};

const DashboardWrapper: React.FC = () => {
  return (
    <div className="h-full">
      <Dashboard />
    </div>
  );
};

const ContentStudioWrapper: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <ContentStudio />
    </div>
  );
};

const AnalyticsWrapper: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Analytics />
    </div>
  );
};

const Customer360Wrapper: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <CustomerProfileOverview />
    </div>
  );
};

const AudienceStudioWrapper: React.FC = () => {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <AudienceStudio />
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Show login screen if not authenticated (except for login page and landing pages)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Allow landing pages without auth
  if (location.pathname.startsWith('/offer/') || location.pathname.startsWith('/campaign/')) {
    return null; // These are handled by index.tsx routes
  }

  return (
    <Routes>
      {/* Login Route (outside Layout, no auth required) */}
      <Route 
        path="/login" 
        element={
          <Login onLoginSuccess={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
          }} />
        } 
      />
      
      {/* Protected Routes (require authentication) */}
      {!user && !location.pathname.startsWith('/login') && !location.pathname.startsWith('/offer/') && !location.pathname.startsWith('/campaign/') ? (
        <Route path="*" element={
          <Login onLoginSuccess={async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUser(session?.user ?? null);
          }} />
        } />
      ) : (
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardWrapper />} />
          <Route path="/campaign-canvas" element={<CampaignCanvasWrapper />} />
          <Route path="/content-studio" element={<ContentStudioWrapper />} />
          <Route path="/customer-360" element={<Customer360Wrapper />} />
          <Route path="/audience-studio" element={<AudienceStudioWrapper />} />
          <Route path="/product-catalog" element={<ProductCatalogWrapper />} />
          <Route path="/analytics" element={<AnalyticsWrapper />} />
        </Route>
      )}
    </Routes>
  );
};

export default App;
