import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Product } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { Check, Sparkles, Shield, Headphones, Users } from 'lucide-react';

const CampaignSimulationLandingPage: React.FC = () => {
  const { campaignId, userId, productId } = useParams<{ campaignId: string; userId: string; productId: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchased, setPurchased] = useState(false);

  useEffect(() => {
    init();
  }, [campaignId, userId, productId]);

  const init = async () => {
    // ✅ Track "click" event
    if (campaignId && userId) {
      await supabase.from('campaign_logs').insert({
        campaign_id: campaignId,
        user_id: userId,
        action_type: 'click',
        status: 'Success',
        metadata: { product_id: productId, timestamp: new Date().toISOString() }
      });
    }

    // Load product details
    if (productId) {
      const products = await dataService.getProducts();
      const found = products.find(p => p.id === productId);
      setProduct(found || null);
    }

    setLoading(false);
  };

  const handleClaim = async () => {
    if (campaignId && userId && productId) {
      // ✅ Track "purchase" event
      await supabase.from('campaign_logs').insert({
        campaign_id: campaignId,
        user_id: userId,
        action_type: 'purchase',
        status: 'Success',
        metadata: { product_id: productId, timestamp: new Date().toISOString() }
      });

      setPurchased(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-emerald-100 to-indigo-100 flex items-center justify-center">
        <div className="text-slate-900 text-xl">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-emerald-100 to-indigo-100 flex items-center justify-center">
        <div className="text-slate-900 text-xl">Offer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-emerald-100 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">
            TeleFlow
          </h1>
          <p className="text-slate-600 text-sm mt-1">Exclusive Offer Just for You</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Gradient Header */}
          <div className="bg-gradient-to-r from-indigo-600 to-emerald-600 px-8 py-6 text-center">
            <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-1 rounded-full text-white text-xs font-semibold uppercase tracking-wider mb-3">
              Limited Time Offer
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">{product.marketingName}</h2>
            <p className="text-indigo-100 text-sm">{product.description}</p>
          </div>

          {/* Content */}
          <div className="p-8 space-y-6">
            {/* Price */}
            <div className="text-center">
              <div className="text-5xl font-black text-slate-900 mb-2">
                ${product.price}
                <span className="text-lg text-slate-500 font-normal">/month</span>
              </div>
              <p className="text-slate-500 text-sm">No hidden fees. Cancel anytime.</p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {[
                'Unlimited 5G Speed',
                'No Data Caps',
                'Free International Roaming',
                'Premium Customer Support'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                    <Check className="text-white" size={14} />
                  </div>
                  <span className="text-slate-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
              <div className="text-center">
                <Shield className="text-indigo-600 mx-auto mb-1" size={24} />
                <p className="text-[10px] text-slate-600 font-medium">100% Secure</p>
              </div>
              <div className="text-center">
                <Headphones className="text-emerald-600 mx-auto mb-1" size={24} />
                <p className="text-[10px] text-slate-600 font-medium">24/7 Support</p>
              </div>
              <div className="text-center">
                <Users className="text-purple-600 mx-auto mb-1" size={24} />
                <p className="text-[10px] text-slate-600 font-medium">5M+ Users</p>
              </div>
            </div>

            {/* CTA Button */}
            {!purchased ? (
              <button
                onClick={handleClaim}
                className="w-full bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Sparkles size={20} />
                <span className="text-lg">Claim 5GB Data Now</span>
              </button>
            ) : (
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl text-center">
                <Check size={24} className="inline mr-2" />
                Success! Data Added to Your Account
              </div>
            )}

            <p className="text-center text-slate-500 text-xs">
              Powered by TeleFlow AI • Terms & Conditions Apply
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignSimulationLandingPage;



