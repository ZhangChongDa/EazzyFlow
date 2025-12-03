import React, { useState } from 'react';
import { Product, Coupon } from '../types';
import { 
  Package, Tag, Search, Plus, RefreshCw, Filter, MoreHorizontal, 
  Edit3, Trash2, Check, X, Image as ImageIcon, ShoppingBag, 
  Gift, Percent, CreditCard, DollarSign, Calendar, Layers
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'products' | 'coupons'>('products');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Drawer/Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [itemType, setItemType] = useState<'product' | 'coupon'>('product');
  
  // Form State
  const [formData, setFormData] = useState<any>({});

  const handleOpenDrawer = (type: 'product' | 'coupon', initialData?: any) => {
    setItemType(type);
    setFormData(initialData || (type === 'product' ? {
      technicalId: '', marketingName: '', type: 'Data', price: 0, description: '', category: 'General', status: 'active'
    } : {
      name: '', type: 'Discount', value: '', totalStock: 1000, validity: '', status: 'active', description: ''
    }));
    setIsDrawerOpen(true);
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
    ? products.filter(p => p.marketingName.toLowerCase().includes(searchTerm.toLowerCase()) || p.technicalId.toLowerCase().includes(searchTerm.toLowerCase()))
    : coupons.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 pb-12 h-full flex flex-col relative">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Offer & Product Catalog</h2>
          <p className="text-slate-500 mt-1">Manage marketable products, bundles, and loyalty coupons.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => handleOpenDrawer('coupon')}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
          >
            <Gift size={18} /> New Coupon
          </button>
          <button 
            onClick={() => handleOpenDrawer('product')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-colors"
          >
            <Plus size={18} /> Sync Product
          </button>
        </div>
      </div>

      {/* Tabs & Filter */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              <button 
                onClick={() => setActiveTab('products')}
                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Products (OCS)
              </button>
              <button 
                 onClick={() => setActiveTab('coupons')}
                 className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${activeTab === 'coupons' ? 'bg-white text-pink-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                Coupons & Vouchers
              </button>
           </div>
           
           <div className="relative w-64">
              <input 
                type="text" 
                placeholder="Search catalog..." 
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-100 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
           </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-auto">
           <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
               <tr>
                 <th className="p-4">Name / ID</th>
                 <th className="p-4">{activeTab === 'products' ? 'Type' : 'Coupon Type'}</th>
                 <th className="p-4">{activeTab === 'products' ? 'Price' : 'Value / Stock'}</th>
                 <th className="p-4">Category</th>
                 <th className="p-4">Status</th>
                 <th className="p-4 text-right">Actions</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
               {filteredItems.map((item: any) => (
                 <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                   <td className="p-4">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${activeTab === 'products' ? 'bg-indigo-100 text-indigo-600' : 'bg-pink-100 text-pink-600'}`}>
                            {item.image ? <img src={item.image} alt="" className="w-full h-full object-cover rounded-lg" /> : (activeTab === 'products' ? <Package size={20} /> : <Gift size={20} />)}
                         </div>
                         <div>
                           <div className="font-bold text-slate-900">{item.marketingName || item.name}</div>
                           <div className="text-xs text-slate-500 font-mono">{item.technicalId || item.id}</div>
                         </div>
                      </div>
                   </td>
                   <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold border ${
                        (item.type === 'Data' || item.type === 'Discount') ? 'bg-blue-50 text-blue-700 border-blue-100' : 
                        (item.type === 'Voice' || item.type === 'Voucher') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                        'bg-amber-50 text-amber-700 border-amber-100'
                      }`}>
                        {item.type}
                      </span>
                   </td>
                   <td className="p-4">
                      {activeTab === 'products' ? (
                        <span className="font-mono text-slate-700">{item.price} MMK</span>
                      ) : (
                        <div>
                          <span className="font-bold text-slate-900">{item.value}</span>
                          <div className="text-xs text-slate-400">{item.totalStock - item.claimed} left</div>
                        </div>
                      )}
                   </td>
                   <td className="p-4 text-slate-600">
                      {item.category || item.description?.substring(0, 20) + '...'}
                   </td>
                   <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${item.status === 'active' ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                        <span className="capitalize text-slate-700">{item.status}</span>
                      </div>
                   </td>
                   <td className="p-4 text-right">
                      <button onClick={() => handleOpenDrawer(activeTab === 'products' ? 'product' : 'coupon', item)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                        <Edit3 size={16} />
                      </button>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
           
           {filteredItems.length === 0 && (
             <div className="text-center py-20">
               <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                 {activeTab === 'products' ? <Package size={32} /> : <Gift size={32} />}
               </div>
               <h3 className="text-lg font-bold text-slate-900">No items found</h3>
               <p className="text-slate-500">Try adjusting your search or add a new item.</p>
             </div>
           )}
        </div>
      </div>

      {/* --- Create/Edit Drawer --- */}
      {isDrawerOpen && (
        <div className="absolute inset-0 z-50 flex justify-end bg-black/20 backdrop-blur-sm transition-opacity">
          <div className="w-[600px] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
             
             {/* Drawer Header */}
             <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div>
                 <h3 className="text-lg font-bold text-slate-900">
                   {formData.id ? 'Edit' : 'Add New'} {itemType === 'product' ? 'Product' : 'Coupon'}
                 </h3>
                 <p className="text-xs text-slate-500">{itemType === 'product' ? 'Map OCS technical products to marketing assets' : 'Configure loyalty rewards and vouchers'}</p>
               </div>
               <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-white rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                 <X size={20} />
               </button>
             </div>

             {/* Drawer Body (Form) */}
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                
                {/* Section: Basic Info */}
                <div>
                   <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Basic Information</h4>
                   
                   {itemType === 'product' ? (
                     // PRODUCT FORM
                     <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-1">Marketing Name *</label>
                             <input type="text" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                               value={formData.marketingName} onChange={e => setFormData({...formData, marketingName: e.target.value})} placeholder="e.g. Weekend Data Blast" />
                           </div>
                           <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-1">Product ID (OCS) *</label>
                             <input type="text" className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50 font-mono" 
                               value={formData.technicalId} onChange={e => setFormData({...formData, technicalId: e.target.value})} placeholder="e.g. P_DATA_1024" />
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Type *</label>
                              <div className="flex gap-4">
                                 {['Data', 'Voice', 'Bundle', 'VAS'].map(t => (
                                   <label key={t} className="flex items-center gap-2 text-sm cursor-pointer">
                                      <input type="radio" name="prodType" checked={formData.type === t} onChange={() => setFormData({...formData, type: t})} className="text-indigo-600" />
                                      {t}
                                   </label>
                                 ))}
                              </div>
                           </div>
                           <div>
                             <label className="block text-sm font-semibold text-slate-700 mb-1">Price (MMK)</label>
                             <div className="relative">
                               <input type="number" className="w-full pl-8 p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 outline-none" 
                                 value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
                               <span className="absolute left-3 top-2 text-slate-400 text-xs">Ks</span>
                             </div>
                           </div>
                        </div>

                        <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-1">Category / Group</label>
                           <select className="w-full p-2 border border-slate-200 rounded text-sm bg-white" 
                             value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                             <option value="General">General</option>
                             <option value="Night Packs">Night Packs</option>
                             <option value="Weekend Specials">Weekend Specials</option>
                             <option value="Voice Bundles">Voice Bundles</option>
                             <option value="Gaming">Gaming</option>
                           </select>
                        </div>
                     </div>
                   ) : (
                     // COUPON FORM (Matches Screenshot 1)
                     <div className="space-y-4">
                        <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-1">Coupon Group</label>
                           <select className="w-full p-2 border border-slate-200 rounded text-sm bg-white text-slate-500">
                             <option>Please choose...</option>
                             <option>Loyalty Rewards</option>
                             <option>Retention Offers</option>
                           </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">Coupon Type *</label>
                          <div className="flex gap-6">
                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="cType" checked={formData.type === 'Discount'} onChange={() => setFormData({...formData, type: 'Discount'})} className="text-pink-600" />
                                <span className="font-medium">Discount coupon</span>
                             </label>
                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="cType" checked={formData.type === 'Voucher'} onChange={() => setFormData({...formData, type: 'Voucher'})} className="text-pink-600" />
                                <span className="font-medium">Product coupon</span>
                             </label>
                             <label className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" name="cType" checked={formData.type === 'Points'} onChange={() => setFormData({...formData, type: 'Points'})} className="text-pink-600" />
                                <span className="font-medium">Points coupon</span>
                             </label>
                          </div>
                        </div>

                        <div>
                           <label className="block text-sm font-semibold text-slate-700 mb-1">Coupon Name *</label>
                           <input type="text" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-pink-100 outline-none" 
                             value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. 50% Off Data Pack" />
                           <p className="text-xs text-right text-slate-400 mt-1">0/15</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Coupon Amount *</label>
                              <div className="flex gap-2">
                                <input type="text" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-pink-100 outline-none" 
                                  value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} placeholder="Number" />
                                <span className="p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-500 font-bold">% Off</span>
                              </div>
                           </div>
                           <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-1">Total Stock</label>
                              <input type="number" className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-pink-100 outline-none" 
                                value={formData.totalStock} onChange={e => setFormData({...formData, totalStock: e.target.value})} />
                           </div>
                        </div>
                     </div>
                   )}

                   {/* Common Fields */}
                   <div className="mt-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Description [EN]</label>
                      <textarea rows={3} className="w-full p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-indigo-100 outline-none resize-none" 
                        value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                      <p className="text-xs text-right text-slate-400 mt-1">0/100</p>
                   </div>
                   
                   <div className="mt-4">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">Display Picture</label>
                      <div className="w-24 h-24 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors">
                         <Plus size={24} />
                         <span className="text-[10px] mt-1">Upload</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-2">Recommended: 300x300 px, max 2MB</p>
                   </div>
                </div>

             </div>

             {/* Drawer Footer */}
             <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
               <button onClick={() => setIsDrawerOpen(false)} className="px-5 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg font-medium hover:bg-slate-100 transition-colors">
                 Cancel
               </button>
               <button onClick={handleSave} className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">
                 Save & Publish
               </button>
             </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default ProductCatalog;
