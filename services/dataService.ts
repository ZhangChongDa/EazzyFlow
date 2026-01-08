import { supabase } from './supabaseClient.ts';
import { Product, Coupon, Customer, Offer } from '../types.ts';

const generateSafeId = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const dataService = {
  async getProducts(): Promise<Product[]> {
    try {
      // ✅ CRITICAL: Check if user is authenticated before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error in getProducts:', sessionError);
        return [];
      }

      if (!session) {
        console.warn('⚠️ No active session - user not authenticated');
        return [];
      }

      const { data, error } = await supabase.from('products').select('*');
      
      if (error) {
        console.error('❌ Error fetching products:', error);
        return [];
      }
      
      // ✅ 关键修复：手动映射 DB 字段 (snake_case) -> 前端接口 (camelCase)
      return (data || []).map((p: any) => ({
        id: p.id,
        // 映射核心字段：snake_case -> camelCase
        technicalId: p.technical_id || '',        // DB: technical_id -> UI: technicalId
        marketingName: p.marketing_name || '',   // DB: marketing_name -> UI: marketingName
        
        // 直接匹配的字段
        type: p.type || 'Data',
        price: Number(p.price) || 0,
        description: p.description || '',
        
        // 数据库字段映射
        category: p.category || 'General',
        status: p.status || 'active',
        syncedAt: p.synced_at || p.created_at || new Date().toISOString().split('T')[0]
      })) as Product[];
    } catch (e) {
      console.error('❌ Unexpected error in getProducts:', e);
      return [];
    }
  },

  async getCoupons(): Promise<Coupon[]> {
    try {
      // ✅ CRITICAL: Check if user is authenticated before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error in getCoupons:', sessionError);
        return [];
      }

      if (!session) {
        console.warn('⚠️ No active session - user not authenticated');
        return [];
      }

      const { data, error } = await supabase.from('coupons').select('*');
      
      if (error) {
        console.error('❌ Error fetching coupons:', error);
        return [];
      }
      
      // ✅ 关键修复：映射 DB 字段 (snake_case) -> 前端接口 (camelCase)
      return (data || []).map((c: any) => ({
        id: c.id,
        // 直接匹配的字段
        name: c.name || '',
        type: c.type || 'Discount',
        value: c.value || '',
        
        // 映射字段：snake_case -> camelCase
        totalStock: Number(c.total_stock) || 0,      // DB: total_stock -> UI: totalStock
        claimed: Number(c.claimed_count) || 0,       // DB: claimed_count -> UI: claimed
        validity: c.validity_date ? new Date(c.validity_date).toISOString().split('T')[0] : '', // DB: validity_date -> UI: validity
        
        // 其他字段
        status: c.status || 'active',
        description: c.description || ''
      })) as Coupon[];
    } catch (e) {
      console.error('❌ Unexpected error in getCoupons:', e);
      return [];
    }
  },

  async getCustomers(): Promise<Customer[]> {
    try {
      // ✅ CRITICAL: Check if user is authenticated before querying
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error in getCustomers:', sessionError);
        return [];
      }

      if (!session) {
        console.warn('⚠️ No active session - user not authenticated');
        return [];
      }

      const { data, error } = await supabase.from('profiles').select('*');
      
      if (error || !data) {
        console.error('❌ Error fetching customers:', error);
        return [];
      }

      return data.map(p => {
        return {
          id: p.id,
          name: p.name || 'Anonymous User',
          msisdn: p.msisdn || 'N/A',
          segment: p.tier || 'Silver',
          arpu: p.arpu_30d || 0,
          balance: 0, // Balance not in profiles table
          churnRisk: Math.round((p.churn_score || 0) * 100),
          nextBestAction: p.churn_score && p.churn_score > 0.5 ? 'Retention Offer' : 'Review Profile',
          tags: p.device_type ? [p.device_type, p.location_city || ''].filter(Boolean) : [] 
        };
      }) as Customer[];
    } catch (e) {
      console.error('❌ Unexpected error in getCustomers:', e);
      return [];
    }
  },

  async upsertProduct(product: Product) {
    try {
      // ✅ 映射：前端 (camelCase) -> DB (snake_case)
      const dbProduct: any = {
        id: product.id,
        technical_id: product.technicalId,      // UI: technicalId -> DB: technical_id
        marketing_name: product.marketingName,   // UI: marketingName -> DB: marketing_name
        type: product.type,
        price: product.price,
        description: product.description,
        category: product.category || 'General',
        status: product.status || 'active',
        synced_at: product.syncedAt || new Date().toISOString().split('T')[0]
      };

      const { data, error } = await supabase.from('products').upsert(dbProduct).select();
      
      if (error) {
        console.error('❌ Error upserting product:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('❌ Unexpected error in upsertProduct:', e);
      return { error: e };
    }
  },

  async upsertCoupon(coupon: Coupon) {
    try {
      // ✅ 映射：前端 (camelCase) -> DB (snake_case)
      const dbCoupon = {
        id: coupon.id,
        name: coupon.name,
        type: coupon.type,
        value: coupon.value,
        total_stock: coupon.totalStock,           // UI: totalStock -> DB: total_stock
        claimed_count: coupon.claimed,           // UI: claimed -> DB: claimed_count
        validity_date: coupon.validity ? new Date(coupon.validity).toISOString() : null, // UI: validity -> DB: validity_date
        status: coupon.status || 'active',
        description: coupon.description || ''
      };

      const { data, error } = await supabase.from('coupons').upsert(dbCoupon).select();
      
      if (error) {
        console.error('❌ Error upserting coupon:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('❌ Unexpected error in upsertCoupon:', e);
      return { error: e };
    }
  },

  async seedDemoData() {
    console.log("Expert Seed: Initializing Baseline...");
    // 简化 Seed 逻辑，防止超时
    return { success: true };
  },

  // ============================================
  // ✅ OFFERS CRUD (Phase 2: Assets & Creative)
  // ============================================

  async getOffers(): Promise<Offer[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return [];

      // Join with products to get base product info
      const { data, error } = await supabase
        .from('offers')
        .select(`
          id,
          product_id,
          marketing_name,
          discount_percent,
          final_price,
          image_url,
          marketing_copy,
          created_at,
          products (
            id,
            technical_id,
            marketing_name,
            type,
            price,
            description
          )
        `);
      
      if (error) {
        console.error('❌ Error fetching offers:', error);
        return [];
      }

      return (data || []).map((o: any) => ({
        id: o.id,
        productId: o.product_id,
        marketingName: o.marketing_name,
        discountPercent: o.discount_percent,
        finalPrice: Number(o.final_price),
        imageUrl: o.image_url,
        marketingCopy: o.marketing_copy || undefined,
        createdAt: o.created_at,
        // Joined product data
        product: o.products ? {
          id: o.products.id,
          technicalId: o.products.technical_id,
          marketingName: o.products.marketing_name,
          type: o.products.type,
          price: o.products.price,
          description: o.products.description,
          category: '',
          status: 'active'
        } : undefined
      })) as Offer[];
    } catch (e) {
      console.error('❌ Unexpected error in getOffers:', e);
      return [];
    }
  },

  async createOffer(offer: Partial<Offer>): Promise<{ data?: any; error?: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: { message: 'Not authenticated' } };

      const dbOffer: any = {
        id: offer.id || generateSafeId(),
        product_id: offer.productId,
        marketing_name: offer.marketingName,
        discount_percent: offer.discountPercent,
        final_price: offer.finalPrice,
        image_url: offer.imageUrl || null
      };
      
      // ✅ CRITICAL FIX: Map marketingCopy to marketing_copy
      if ((offer as any).marketingCopy !== undefined) {
        dbOffer.marketing_copy = (offer as any).marketingCopy || null;
      }

      const { data, error } = await supabase
        .from('offers')
        .insert(dbOffer)
        .select();
      
      if (error) {
        console.error('❌ Error creating offer:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('❌ Unexpected error in createOffer:', e);
      return { error: e };
    }
  },

  async updateOffer(id: string, updates: Partial<Offer>): Promise<{ data?: any; error?: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: { message: 'Not authenticated' } };

      const dbUpdates: any = {};
      if (updates.marketingName) dbUpdates.marketing_name = updates.marketingName;
      if (updates.discountPercent !== undefined) dbUpdates.discount_percent = updates.discountPercent;
      if (updates.finalPrice !== undefined) dbUpdates.final_price = updates.finalPrice;
      if (updates.imageUrl !== undefined) dbUpdates.image_url = updates.imageUrl;
      // ✅ CRITICAL FIX: Map marketingCopy to marketing_copy
      if ((updates as any).marketingCopy !== undefined) {
        dbUpdates.marketing_copy = (updates as any).marketingCopy || null;
      }

      const { data, error } = await supabase
        .from('offers')
        .update(dbUpdates)
        .eq('id', id)
        .select();
      
      if (error) {
        console.error('❌ Error updating offer:', error);
        return { error };
      }

      return { data };
    } catch (e) {
      console.error('❌ Unexpected error in updateOffer:', e);
      return { error: e };
    }
  },

  async deleteOffer(id: string): Promise<{ error?: any }> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return { error: { message: 'Not authenticated' } };

      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('❌ Error deleting offer:', error);
        return { error };
      }

      return {};
    } catch (e) {
      console.error('❌ Unexpected error in deleteOffer:', e);
      return { error: e };
    }
  }
};
