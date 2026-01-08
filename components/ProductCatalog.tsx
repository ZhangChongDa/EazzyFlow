
import React, { useState, useEffect } from 'react';
import { Product, Coupon, Offer } from '../types.ts';
import { 
  Package, Tag, Search, Plus, RefreshCw, Filter, MoreHorizontal, 
  Edit3, Trash2, Check, X, Image as ImageIcon, ShoppingBag, 
  Gift, Percent, CreditCard, DollarSign, Calendar, Layers, Sparkles, Loader2, Eye
} from 'lucide-react';
import { dataService } from '../services/dataService';
import { generateMarketingCopy, chatWithCopilot } from '../services/geminiService';
import { fal } from '@fal-ai/client';
import ChatAssistant from './ChatAssistant';

interface ProductCatalogProps {
  products: Product[];
  coupons: Coupon[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (id: string, p: Partial<Product>) => void;
  onAddCoupon: (c: Coupon) => void;
  onUpdateCoupon: (id: string, c: Partial<Coupon>) => void;
}

const ProductCatalog: React.FC<ProductCatalogProps> = ({
  products, coupons, onAddProduct, onUpdateProduct, onAddCoupon, onUpdateCoupon
}) => {
  const [activeTab, setActiveTab] = useState<'offers' | 'products' | 'coupons'>('offers');
  const [searchTerm, setSearchTerm] = useState('');
  
  // ✅ Phase 2: Offers State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);
  
  // Drawer/Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'coupon' | 'offer'>('product');
  
  // ✅ Create/Edit Offer Modal
  const [isCreateOfferOpen, setIsCreateOfferOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedBaseProduct, setSelectedBaseProduct] = useState<Product | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [offerFormData, setOfferFormData] = useState<any>({
    marketingName: '',
    discountPercent: 0,
    finalPrice: 0,
    imageUrl: '',
    marketingCopy: '',  // ✅ New: AI-generated marketing copy
    language: 'English' as 'English' | 'Burmese'  // ✅ New: Language selector
  });
  
  // ✅ AI Generation State
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  
  // ✅ Image Lightbox State
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  
  // ✅ AI Co-Creation State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [aiInitialPrompt, setAiInitialPrompt] = useState<string | undefined>(undefined);
  const [isAiWorking, setIsAiWorking] = useState(false);
  
  // Form State
  const [formData, setFormData] = useState<any>({});

  // ✅ Load Offers on Mount
  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    setIsLoadingOffers(true);
    const data = await dataService.getOffers();
    setOffers(data);
    setIsLoadingOffers(false);
  };

  const handleOpenDrawer = (type: 'product' | 'coupon', initialData?: any) => {
    setItemType(type);
    setFormData(initialData || (type === 'product' ? {
      technicalId: '', marketingName: '', type: 'Data', price: 0, description: '', category: 'General', status: 'active'
    } : {
      name: '', type: 'Discount', value: '', totalStock: 1000, validity: '', status: 'active', description: ''
    }));
    setIsDrawerOpen(true);
  };

  // ✅ Open "Create Offer" Modal
  const handleCreateOffer = (baseProduct: Product) => {
    setSelectedBaseProduct(baseProduct);
    setEditingOffer(null);
    setIsEditMode(false);
    setOfferFormData({
      marketingName: `Special: ${baseProduct.marketingName}`,
      discountPercent: 20,
      finalPrice: baseProduct.price * 0.8,
      imageUrl: '',
      marketingCopy: '',
      language: 'English'
    });
    setIsCreateOfferOpen(true);
  };

  // ✅ Open "Edit Offer" Modal
  const handleEditOffer = (offer: Offer) => {
    setEditingOffer(offer);
    setSelectedBaseProduct(offer.product || null);
    setIsEditMode(true);
    setOfferFormData({
      marketingName: offer.marketingName || '',
      discountPercent: offer.discountPercent || 0,
      finalPrice: offer.finalPrice || 0,
      imageUrl: offer.imageUrl || '',
      marketingCopy: (offer as any).marketingCopy || '',
      language: 'English'
    });
    setIsCreateOfferOpen(true);
  };

  // ✅ AI Generate Marketing Name
  const handleGenerateMarketingName = async () => {
    if (!selectedBaseProduct) return;
    
    setIsGeneratingName(true);
    try {
      const language = offerFormData.language === 'Burmese' ? 'Burmese' : 'English';
      const prompt = `Create a catchy, engaging marketing name for a telecom data bundle offer. 
Base product: ${selectedBaseProduct.marketingName} (${selectedBaseProduct.type}).
Target audience: Gamers and heavy data users in Myanmar.
Language: ${language}
Requirements: 
- Short and memorable (max 5 words)
- ${language === 'Burmese' ? 'Use Burmese language and include local cultural references' : 'Include local cultural references if appropriate'}
- Sound exciting and premium
- Suitable for SMS/Email campaigns

Generate ONLY the marketing name in ${language}, no explanation:`;
      
      const generatedName = await generateMarketingCopy(prompt, 'Exciting');
      // Extract just the name (remove any quotes or extra text)
      const cleanName = generatedName.replace(/["']/g, '').split('\n')[0].trim();
      setOfferFormData({ ...offerFormData, marketingName: cleanName });
    } catch (error) {
      console.error('Failed to generate marketing name:', error);
      alert('Failed to generate marketing name. Please try again.');
    } finally {
      setIsGeneratingName(false);
    }
  };

  // ✅ AI Generate Marketing Copy (Multilingual)
  const handleGenerateMarketingCopy = async () => {
    if (!selectedBaseProduct) return;
    
    setIsGeneratingCopy(true);
    try {
      const finalPrice = offerFormData.finalPrice || selectedBaseProduct.price * 0.8;
      const topic = `${offerFormData.marketingName || selectedBaseProduct.marketingName} - ${selectedBaseProduct.type} bundle at ${finalPrice.toLocaleString()} Ks (${offerFormData.discountPercent || 20}% off)`;
      const language = offerFormData.language === 'Burmese' ? 'Burmese' : 'English';
      
      // Use chatWithCopilot to call generate_multilingual_copy tool
      const prompt = `Generate a short, catchy marketing copy (SMS/Email) in ${language} for: ${topic}. 
Tone: Exciting and urgent. 
Format: Keep it under 160 characters for SMS. 
Make it culturally relevant for Myanmar market.`;
      
      const response = await chatWithCopilot(
        prompt,
        [],
        `User wants to generate marketing copy in ${language} for product: ${selectedBaseProduct.marketingName}`
      );
      
      const generatedCopy = response.text.trim();
      setOfferFormData({ ...offerFormData, marketingCopy: generatedCopy });
    } catch (error) {
      console.error('Failed to generate marketing copy:', error);
      alert('Failed to generate marketing copy. Please try again.');
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // ✅ AI Generate Poster Image
  const handleGenerateImage = async () => {
    if (!selectedBaseProduct) return;
    
    setIsGeneratingImage(true);
    try {
      const imagePrompt = `Modern telecom marketing poster for ${offerFormData.marketingName || selectedBaseProduct.marketingName}. 
Style: Cyberpunk gaming aesthetic, neon lights, high-tech telecom theme, professional marketing design.
Include: Product name, discount percentage, vibrant colors (purple, cyan, indigo).
Format: Landscape orientation, suitable for SMS/Email campaigns, Myanmar market.`;
      
      // Use FAL Ideogram V3 for image generation
      const result = await fal.subscribe("fal-ai/ideogram/v3", {
        input: {
          prompt: imagePrompt,
          image_size: "landscape_4_3",
          style: "AUTO",
          rendering_speed: "BALANCED"
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log('[AI] Generating image...');
          }
        },
      });
      
      // @ts-ignore - FAL result structure
      const imageUrl = result.data?.images?.[0]?.url || result.images?.[0]?.url;
      
      if (imageUrl) {
        setOfferFormData({ ...offerFormData, imageUrl });
        console.log('[AI] Image generated:', imageUrl);
      } else {
        throw new Error('No image URL returned');
      }
    } catch (error: any) {
      console.error('Failed to generate image:', error);
      alert(`Failed to generate image: ${error.message || 'Please check FAL API Key configuration.'}`);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  // ✅ AI Co-Creation: Handle Auto-Create with AI
  const handleAutoCreateWithAI = () => {
    const baseProduct = selectedBaseProduct || editingOffer?.product;
    if (!baseProduct) return;
    
    const language = offerFormData.language === 'Burmese' ? 'Burmese' : 'English';
    const finalPrice = offerFormData.finalPrice || baseProduct.price * 0.8;
    const discount = offerFormData.discountPercent || 20;
    
    // ✅ Dynamic Style Detection based on Product
    const productName = baseProduct.marketingName.toLowerCase();
    const productType = baseProduct.type?.toLowerCase() || '';
    const productDesc = baseProduct.description?.toLowerCase() || '';
    
    let visualStyle = 'Modern Telecom style';
    let targetAudience = 'general users';
    
    // Analyze product to determine style
    if (productName.includes('game') || productName.includes('gamer') || productName.includes('data') || productType.includes('data')) {
      visualStyle = 'Cyberpunk/Neon/High-Tech with vibrant colors, futuristic elements, and gaming aesthetics';
      targetAudience = 'Gamers and heavy data users';
    } else if (productName.includes('business') || productName.includes('sme') || productName.includes('enterprise') || productType.includes('voice')) {
      visualStyle = 'Professional/Clean/Minimalist with corporate blue tones, trust-building elements, and business-focused imagery';
      targetAudience = 'Business professionals and enterprises';
    } else if (productName.includes('holiday') || productName.includes('festival') || productName.includes('thingyan') || productName.includes('new year')) {
      visualStyle = 'Festive/Cultural with traditional Myanmar elements, warm colors, and celebratory imagery';
      targetAudience = 'Festival celebrants and cultural events';
    } else if (productName.includes('family') || productName.includes('senior') || productName.includes('elder')) {
      visualStyle = 'Warm/Friendly with family-oriented imagery, soft colors, and approachable design';
      targetAudience = 'Families and senior users';
    }
    
    const prompt = `Help me create a marketing package for ${baseProduct.marketingName}. Language: ${language}. I need a Title, Persuasive Copy (SMS), and a Marketing Poster.

Product Details:
- Base Product: ${baseProduct.marketingName} (${baseProduct.type})
- Description: ${baseProduct.description || 'N/A'}
- Final Price: ${finalPrice.toLocaleString()} Ks
- Discount: ${discount}%
- Target Audience: ${targetAudience} in Myanmar
- Language: ${language}

Visual Style Instructions:
Analyze the Base Product Name and Description to determine the best visual style.
- Visual Style: ${visualStyle}
- The image should reflect the product's purpose and appeal to ${targetAudience}

Please generate in this order:
1. First, write the Marketing Copy (SMS/Email format) - engaging, culturally relevant for Myanmar market, in ${language}
2. Then, extract visual keywords from that copy to inform the image style
3. Generate a high-quality marketing poster image using the determined style
4. Finally, create a catchy marketing name (Title) - short and memorable, suitable for ${language}

After generating all three, please provide them in this JSON format:
\`\`\`json
{
  "title": "Marketing Name Here",
  "copy": "Marketing Copy Here",
  "imageUrl": "Image URL Here"
}
\`\`\`

Start by writing the marketing copy, then optimize the image prompt based on the copy's tone and keywords, then generate the image, then create the title.`;

    setAiInitialPrompt(prompt);
    setIsChatOpen(true);
    setIsAiWorking(true);
  };

  // ✅ Handle AI-generated artifacts
  const handleArtifactGenerated = (artifact: { title?: string; copy?: string; imageUrl?: string }) => {
    console.log('[ProductCatalog] Artifact received:', artifact);
    
    const updates: any = {};
    if (artifact.title) {
      updates.marketingName = artifact.title.trim();
    }
    if (artifact.copy) {
      updates.marketingCopy = artifact.copy.trim();
    }
    if (artifact.imageUrl) {
      // Extract URL from markdown format if needed (![alt](url))
      let imageUrl = artifact.imageUrl.trim();
      const urlMatch = imageUrl.match(/!\[.*?\]\((.*?)\)/);
      if (urlMatch) {
        imageUrl = urlMatch[1];
      }
      // Also check if it's just a URL (starts with http)
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        updates.imageUrl = imageUrl;
      }
    }
    
    if (Object.keys(updates).length > 0) {
      setOfferFormData({ ...offerFormData, ...updates });
      setIsAiWorking(false);
      // Show success feedback
      console.log('[ProductCatalog] Form updated with AI-generated content');
    }
  };

  // ✅ Save Offer to DB
  const handleSaveOffer = async () => {
    const baseProduct = selectedBaseProduct || editingOffer?.product;
    if (!baseProduct) return;

    const offerData: Partial<Offer> = {
      productId: baseProduct.id,
      marketingName: offerFormData.marketingName,
      discountPercent: Number(offerFormData.discountPercent),
      finalPrice: Number(offerFormData.finalPrice),
      imageUrl: offerFormData.imageUrl || undefined,
    };

    // Add marketing copy to metadata if available
    if (offerFormData.marketingCopy) {
      (offerData as any).marketingCopy = offerFormData.marketingCopy;
    }

    let error;
    if (isEditMode && editingOffer) {
      // Update existing offer
      const result = await dataService.updateOffer(editingOffer.id, offerData);
      error = result.error;
    } else {
      // Create new offer
      const result = await dataService.createOffer(offerData);
      error = result.error;
    }
    
    if (!error) {
      loadOffers(); // Refresh list
      setIsCreateOfferOpen(false);
      setIsEditMode(false);
      setSelectedBaseProduct(null);
      setEditingOffer(null);
      setOfferFormData({ 
        marketingName: '', 
        discountPercent: 0, 
        finalPrice: 0, 
        imageUrl: '',
        marketingCopy: '',
        language: 'English'
      });
      setLightboxImage(null);
    } else {
      alert(`Failed to ${isEditMode ? 'update' : 'create'} offer`);
    }
  };

  // ✅ Delete Offer
  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    const { error } = await dataService.deleteOffer(id);
    if (!error) loadOffers();
  };

  const handleSave = () => {
    if (itemType === 'product') {
      const newProduct: Product = {
        id: formData.id || `p-${Date.now()}`,
        technicalId: formData.technicalId,
        marketingName: formData.marketingName,
        type: formData.type,
        price: Number(formData.price),
        description: formData.description,
        category: formData.category,
        status: formData.status,
        syncedAt: new Date().toISOString().split('T')[0]
      };
      if (formData.id) {
        onUpdateProduct(formData.id, newProduct);
      } else {
        onAddProduct(newProduct);
      }
    } else {
      const newCoupon: Coupon = {
        id: formData.id || `cp-${Date.now()}`,
        name: formData.name,
        type: formData.type,
        value: formData.value,
        totalStock: Number(formData.totalStock),
        claimed: formData.claimed || 0,
        validity: formData.validity,
        status: formData.status,
        description: formData.description
      };
      if (formData.id) {
        onUpdateCoupon(formData.id, newCoupon);
      } else {
        onAddCoupon(newCoupon);
      }
    }
    setIsDrawerOpen(false);
  };

  const filteredItems = activeTab === 'products' 
    ? products.filter(p => {
        const marketingName = (p.marketingName || '').toLowerCase();
        const technicalId = (p.technicalId || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        return marketingName.includes(search) || technicalId.includes(search);
      })
    : activeTab === 'coupons' 
    ? coupons.filter(c => {
        const name = (c.name || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      })
    : offers.filter(o => {
        const name = (o.marketingName || '').toLowerCase();
        return name.includes(searchTerm.toLowerCase());
      });

  return (
    <div className="space-y-6 pb-12 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Offer & Product Catalog</h2>
          <p className="text-slate-500 mt-1">Package base products into marketing offers, manage coupons.</p>
        </div>
          <button 
          onClick={() => activeTab === 'products' ? handleOpenDrawer('product') : activeTab === 'coupons' ? handleOpenDrawer('coupon') : null}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          {activeTab === 'products' ? 'New Product' : activeTab === 'coupons' ? 'New Coupon' : 'Refresh Offers'}
          </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('offers')}
          className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
            activeTab === 'offers' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} />
            Marketing Offers
          </div>
        </button>
              <button 
                onClick={() => setActiveTab('products')}
          className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
            activeTab === 'products' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
              >
          <div className="flex items-center gap-2">
            <Package size={16} />
            OCS Base Products
          </div>
              </button>
              <button 
                 onClick={() => setActiveTab('coupons')}
          className={`px-6 py-3 font-semibold text-sm transition-colors relative ${
            activeTab === 'coupons' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'
          }`}
              >
          <div className="flex items-center gap-2">
            <Tag size={16} />
            Coupons
          </div>
              </button>
           </div>
           
      {/* Search & Filter */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
            placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
        </div>
        <button 
          onClick={() => activeTab === 'offers' && loadOffers()}
          className="px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-2 text-slate-600"
        >
          <RefreshCw size={18} />
          Refresh
                      </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {/* ✅ OFFERS TAB */}
        {activeTab === 'offers' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoadingOffers ? (
              <div className="col-span-3 text-center py-12 text-slate-500">Loading offers...</div>
            ) : filteredItems.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-500">
                No marketing offers yet. Create one from Base Products.
              </div>
            ) : (filteredItems as Offer[]).map((offer) => (
              <div 
                key={offer.id} 
                onClick={() => handleEditOffer(offer)}
                className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-lg transition-all bg-white cursor-pointer group"
              >
                {/* ✅ Image with aspect-video (16:9) */}
                {offer.imageUrl ? (
                  <div className="w-full aspect-video overflow-hidden bg-slate-100">
                    <img 
                      src={offer.imageUrl} 
                      alt={offer.marketingName} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
               </div>
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
                    <Gift className="text-indigo-300" size={32} />
             </div>
           )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 truncate">{offer.marketingName}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">Base: {offer.product?.marketingName || 'N/A'}</p>
               </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      {/* ✅ Preview Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/offer/${offer.id}`, '_blank');
                        }}
                        className="p-1.5 hover:bg-indigo-50 rounded text-indigo-600 transition-colors"
                        title="Preview Landing Page"
                      >
                        <Eye size={16} />
                      </button>
                      {/* Delete Button */}
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteOffer(offer.id);
                        }}
                        className="p-1.5 hover:bg-red-50 rounded text-red-600 transition-colors"
                        title="Delete Offer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
             </div>

                  <div className="flex items-center justify-between mt-3">
                <div>
                      {offer.discountPercent && (
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-semibold">
                          -{offer.discountPercent}%
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      {offer.product && (
                        <span className="text-slate-400 line-through text-xs block">
                          {offer.product.price.toLocaleString()} Ks
                        </span>
                      )}
                      <span className="text-lg font-bold text-indigo-600">
                        {offer.finalPrice.toLocaleString()} Ks
                      </span>
                    </div>
                           </div>
                           </div>
                        </div>
                                 ))}
                              </div>
        )}

        {/* ✅ PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-500">No products found</div>
            ) : (filteredItems as Product[]).map((product) => (
              <div key={product.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Package className="text-indigo-600" size={20} />
                           </div>
                           <div>
                      <h3 className="font-semibold text-slate-900">{product.marketingName}</h3>
                      <p className="text-xs text-slate-500 font-mono">{product.technicalId}</p>
                             </div>
                           </div>
                        </div>
                <p className="text-sm text-slate-600 mb-3 line-clamp-2">{product.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-slate-900">{product.price.toLocaleString()} Ks</span>
                  <button 
                    onClick={() => handleCreateOffer(product)}
                    className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium flex items-center gap-1"
                  >
                    <Sparkles size={14} />
                    Create Offer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* COUPONS TAB */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.length === 0 ? (
              <div className="col-span-3 text-center py-12 text-slate-500">No coupons found</div>
            ) : (filteredItems as Coupon[]).map((coupon) => (
              <div key={coupon.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Tag className="text-amber-600" size={20} />
                  </div>
                        <div>
                    <h3 className="font-semibold text-slate-900">{coupon.name}</h3>
                    <p className="text-xs text-slate-500">{coupon.type}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mb-2">{coupon.description}</p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">Stock: {coupon.totalStock - coupon.claimed}</span>
                  <span className="font-bold text-amber-600">{coupon.value}</span>
                        </div>
                     </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ CREATE/EDIT OFFER MODAL - Two-Column AI Creative Studio */}
      {isCreateOfferOpen && (selectedBaseProduct || editingOffer) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] my-8 p-6 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-bold text-slate-900">{isEditMode ? 'Edit Marketing Offer' : 'AI Creative Studio'}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Base Product: <span className="font-semibold text-slate-700">{selectedBaseProduct?.marketingName || editingOffer?.product?.marketingName || 'N/A'}</span> ({(selectedBaseProduct?.price || editingOffer?.product?.price || 0).toLocaleString()} Ks)
                </p>
              </div>
              <button
                onClick={() => {
                  setIsCreateOfferOpen(false);
                  setIsEditMode(false);
                  setEditingOffer(null);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Product Basics */}
                     <div className="space-y-4">
                        <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Marketing Name</label>
                  <input
                    type="text"
                    value={offerFormData.marketingName}
                    onChange={(e) => setOfferFormData({ ...offerFormData, marketingName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="e.g., Thingyan Cyber-Gamer Pass"
                  />
                        </div>
                        
                {/* Pricing */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Discount %</label>
                    <input
                      type="number"
                      value={offerFormData.discountPercent}
                      onChange={(e) => {
                        const discount = Number(e.target.value);
                        const basePrice = selectedBaseProduct?.price || editingOffer?.product?.price || 0;
                        setOfferFormData({ 
                          ...offerFormData, 
                          discountPercent: discount,
                          finalPrice: basePrice * (1 - discount / 100)
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                        <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Final Price</label>
                    <input
                      type="number"
                      value={offerFormData.finalPrice}
                      onChange={(e) => setOfferFormData({ ...offerFormData, finalPrice: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Right Column: AI Creative Studio */}
              <div className="bg-gradient-to-br from-indigo-50/50 to-purple-50/50 border border-indigo-200/50 rounded-xl p-6 backdrop-blur-sm">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Sparkles className="text-indigo-600" size={20} />
                      <h4 className="text-lg font-bold text-slate-900">AI Creative Studio</h4>
                          </div>
                        </div>

                  {/* ✅ Auto-Create with AI Assistant Button (The Only Button) */}
                  <button
                    onClick={handleAutoCreateWithAI}
                    disabled={isAiWorking}
                    className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg font-medium mb-4"
                  >
                    {isAiWorking ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        <span>AI Working...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>✨ Auto-Create with AI Assistant</span>
                      </>
                    )}
                  </button>
                        </div>

                {/* Language Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Content Language</label>
                              <div className="flex gap-2">
                    <button
                      onClick={() => setOfferFormData({ ...offerFormData, language: 'English' })}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                        offerFormData.language === 'English'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🇺🇸 English
                    </button>
                    <button
                      onClick={() => setOfferFormData({ ...offerFormData, language: 'Burmese' })}
                      className={`flex-1 px-4 py-2.5 rounded-lg font-medium transition-all ${
                        offerFormData.language === 'Burmese'
                          ? 'bg-indigo-600 text-white shadow-md'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      🇲🇲 Burmese
                    </button>
                              </div>
                           </div>

                {/* Marketing Copy (Large Textarea) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-slate-700 mb-2">Marketing Copy (SMS/Email)</label>
                  <textarea
                    value={offerFormData.marketingCopy}
                    onChange={(e) => setOfferFormData({ ...offerFormData, marketingCopy: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white"
                    placeholder="AI-generated marketing copy will appear here..."
                  />
                </div>

                {/* Poster Image (Large Preview) */}
                           <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Campaign Poster</label>
                  
                  {offerFormData.imageUrl ? (
                    <div className="space-y-2">
                      <div 
                        className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-slate-200 cursor-pointer hover:border-indigo-400 transition-colors group bg-slate-100"
                        onClick={() => setLightboxImage(offerFormData.imageUrl)}
                      >
                        <img 
                          src={offerFormData.imageUrl} 
                          alt="Generated poster" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700">
                            Click to enlarge
                           </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setOfferFormData({ ...offerFormData, imageUrl: '' })}
                        className="text-xs text-red-600 hover:text-red-700 font-medium"
                      >
                        Remove image
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg aspect-video flex items-center justify-center bg-white/50">
                      <div className="text-center">
                        <ImageIcon className="mx-auto text-slate-400 mb-2" size={32} />
                        <p className="text-sm text-slate-500">No poster yet</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex gap-3 mt-6 pt-6 border-t border-slate-200">
              <button
                onClick={() => {
                  setIsCreateOfferOpen(false);
                  setIsEditMode(false);
                  setEditingOffer(null);
                }}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveOffer}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors shadow-sm"
              >
                {isEditMode ? 'Update Offer' : 'Save Offer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Image Lightbox */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-[70] flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl w-full">
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
            >
              <X size={24} />
            </button>
            <img 
              src={lightboxImage} 
              alt="Poster preview" 
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
                        </div>
                     </div>
                   )}

      {/* ✅ AI Co-Creation ChatAssistant */}
      <ChatAssistant
        isOpen={isChatOpen}
        onClose={() => {
          setIsChatOpen(false);
          setAiInitialPrompt(undefined);
          setIsAiWorking(false);
        }}
        initialPrompt={aiInitialPrompt}
        onArtifactGenerated={handleArtifactGenerated}
      />

      {/* OLD DRAWER FOR PRODUCTS/COUPONS */}
      {isDrawerOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setIsDrawerOpen(false)}>
          <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-200 flex justify-between items-center sticky top-0 bg-white z-10">
              <h3 className="text-xl font-bold text-slate-900">
                {itemType === 'product' ? 'Product Details' : 'Coupon Details'}
              </h3>
              <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X size={20} />
              </button>
                   </div>
                   
            <div className="p-6 space-y-4">
              {itemType === 'product' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Technical ID *</label>
                    <input
                      type="text"
                      value={formData.technicalId || ''}
                      onChange={(e) => setFormData({...formData, technicalId: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Marketing Name *</label>
                    <input
                      type="text"
                      value={formData.marketingName || ''}
                      onChange={(e) => setFormData({...formData, marketingName: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Type *</label>
                    <select
                      value={formData.type || 'Data'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Data">Data</option>
                      <option value="Voice">Voice</option>
                      <option value="Bundle">Bundle</option>
                      <option value="VAS">VAS</option>
                      <option value="Device">Device</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Price *</label>
                    <input
                      type="number"
                      value={formData.price || 0}
                      onChange={(e) => setFormData({...formData, price: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Description</label>
                    <textarea
                      value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      rows={3}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Coupon Name *</label>
                    <input
                      type="text"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Type *</label>
                    <select
                      value={formData.type || 'Discount'}
                      onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                      <option value="Discount">Discount</option>
                      <option value="Voucher">Voucher</option>
                      <option value="Points">Points</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Value *</label>
                    <input
                      type="text"
                      placeholder="e.g. 20% or 5000 Ks"
                      value={formData.value || ''}
                      onChange={(e) => setFormData({...formData, value: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                      </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Total Stock *</label>
                    <input
                      type="number"
                      value={formData.totalStock || 1000}
                      onChange={(e) => setFormData({...formData, totalStock: Number(e.target.value)})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                   </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">Validity Date</label>
                    <input
                      type="date"
                      value={formData.validity || ''}
                      onChange={(e) => setFormData({...formData, validity: e.target.value})}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                </div>
                </>
              )}
             </div>

            <div className="p-6 border-t border-slate-200 flex gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 font-medium"
              >
                 Cancel
               </button>
              <button
                onClick={handleSave}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                <Check size={18} className="inline mr-1" />
                Save {itemType === 'product' ? 'Product' : 'Coupon'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductCatalog;
