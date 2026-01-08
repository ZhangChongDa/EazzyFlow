import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Offer } from '../types';
import { dataService } from '../services/dataService';
import { supabase } from '../services/supabaseClient';
import { Zap, Clock, Gift, Check, Sparkles } from 'lucide-react';

const OfferLandingPage: React.FC = () => {
  const { offerId } = useParams<{ offerId: string }>();
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaignId');
  const userId = searchParams.get('userId');
  const productId = searchParams.get('productId');
  
  const [offer, setOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [claimed, setClaimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60); // 24 hours in seconds
  const [clickTracked, setClickTracked] = useState(false);

  useEffect(() => {
    loadOffer();
  }, [offerId]);
  
  // ✅ Fix-6: Track click event when page loads (only once)
  useEffect(() => {
    if (offerId && campaignId && userId && !clickTracked) {
      const trackClick = async () => {
        try {
          await supabase.from('campaign_logs').insert({
            campaign_id: campaignId,
            user_id: userId,
            action_type: 'click',
            status: 'Success',
            metadata: { 
              offer_id: offerId,
              product_id: productId,
              timestamp: new Date().toISOString() 
            }
          });
          setClickTracked(true);
        } catch (err) {
          console.error('Error tracking click:', err);
        }
      };
      trackClick();
    }
  }, [offerId, campaignId, userId, clickTracked]);

  // Countdown Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadOffer = async () => {
    if (!offerId) return;
    const offers = await dataService.getOffers();
    const found = offers.find(o => o.id === offerId);
    setOffer(found || null);
    setLoading(false);
  };

  const handleClaim = async () => {
    // ✅ Fix-6: Track purchase event
    if (campaignId && userId && offerId) {
      try {
        await supabase.from('campaign_logs').insert({
          campaign_id: campaignId,
          user_id: userId,
          action_type: 'purchase',
          status: 'Success',
          metadata: { 
            offer_id: offerId,
            product_id: productId,
            timestamp: new Date().toISOString() 
          }
        });
      } catch (err) {
        console.error('Error tracking purchase:', err);
      }
    }
    
    setClaimed(true);
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading offer...</div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Offer not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Grid */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMC41IiBvcGFjaXR5PSIwLjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-20"></div>
      
      {/* Neon Glows */}
      <div className="absolute top-20 left-20 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="relative z-10 max-w-md mx-auto px-4 py-8 pb-24">
        {/* Header Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-gradient-to-r from-purple-500 to-cyan-500 p-0.5 rounded-full mb-2">
            <div className="bg-slate-900 px-6 py-2 rounded-full">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 font-bold text-lg">
                TeleFlow
              </span>
            </div>
          </div>
          <p className="text-purple-300 text-sm font-medium">Exclusive Gamer Offer</p>
        </div>

        {/* Main Card */}
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-3xl border border-purple-500/30 shadow-2xl overflow-hidden">
          {/* Hero Image - Aspect 4:3 or 1:1 */}
          {offer.imageUrl ? (
            <div className="relative w-full aspect-[4/3] overflow-hidden bg-slate-800">
              <img 
                src={offer.imageUrl} 
                alt={offer.marketingName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
            </div>
          ) : (
            <div className="w-full aspect-[4/3] bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center">
              <Gift className="text-white" size={64} />
            </div>
          )}

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-black text-white mb-3 leading-tight">
                {offer.marketingName}
              </h1>
              {offer.product && (
                <p className="text-purple-300 text-sm">
                  {offer.product.description}
                </p>
              )}
            </div>

            {/* Price Section */}
            <div className="bg-gradient-to-r from-purple-900/50 to-cyan-900/50 rounded-2xl p-4 border border-purple-500/30">
              <div className="flex items-baseline justify-center gap-3">
                {offer.product && (
                  <span className="text-slate-400 line-through text-xl">
                    {offer.product.price.toLocaleString()} Ks
                  </span>
                )}
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
                  {offer.finalPrice.toLocaleString()} Ks
                </span>
              </div>
              {offer.discountPercent && (
                <div className="text-center mt-2">
                  <span className="inline-block bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    SAVE {offer.discountPercent}%
                  </span>
                </div>
              )}
            </div>

            {/* Marketing Copy */}
            {offer.marketingCopy && (
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <p className="text-slate-300 leading-relaxed text-base">
                  {offer.marketingCopy}
                </p>
              </div>
            )}

            {/* Countdown - Sticky Banner */}
            <div className="sticky top-0 z-20 bg-gradient-to-r from-red-600 to-orange-600 rounded-xl p-3 border border-red-400/50 shadow-lg">
              <div className="flex items-center justify-center gap-2">
                <Clock className="text-white" size={18} />
                <span className="text-white text-sm font-semibold">
                  Offer expires in:
                </span>
                <span className="text-white text-lg font-mono font-bold">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-2">
              {[
                'Unlimited 5G Speed',
                'Zero Latency Gaming',
                'Free Battle Pass Access',
                '24/7 Gamer Support'
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-3 text-slate-300">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-cyan-500 flex items-center justify-center flex-shrink-0">
                    <Check className="text-white" size={14} />
                  </div>
                  <span className="text-sm">{feature}</span>
                </div>
              ))}
            </div>

            {/* Footer Note */}
            <p className="text-center text-slate-500 text-xs">
              No hidden fees. Cancel anytime. Terms apply.
            </p>
          </div>
        </div>

        {/* Sticky CTA Bar */}
        {!claimed ? (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-purple-500/30 shadow-2xl p-4">
            <button
              onClick={handleClaim}
              className="w-full max-w-md mx-auto bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 flex items-center justify-center gap-2 group animate-pulse"
            >
              <Zap className="group-hover:rotate-12 transition-transform" size={20} />
              <span className="text-lg">Claim Offer Now</span>
              <Sparkles className="group-hover:scale-110 transition-transform" size={20} />
            </button>
          </div>
        ) : (
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-green-500/30 shadow-2xl p-4">
            <div className="w-full max-w-md mx-auto bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2">
              <Check size={24} />
              <span className="text-lg">CLAIMED!</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-xs">
          <p>Powered by TeleFlow AI • Secure Checkout</p>
        </div>
      </div>
    </div>
  );
};

export default OfferLandingPage;
