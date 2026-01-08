
import React from 'react';

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  CUSTOMER_360 = 'CUSTOMER_360',
  AUDIENCE = 'AUDIENCE',
  CAMPAIGN_CANVAS = 'CAMPAIGN_CANVAS',
  CONTENT_STUDIO = 'CONTENT_STUDIO',
  PRODUCT_CATALOG = 'PRODUCT_CATALOG',
  ANALYTICS = 'ANALYTICS',
}

// Added Customer interface for shared application state
export interface Customer {
  id: string;
  name: string;
  msisdn: string;
  segment: string;
  arpu: number;
  balance: number;
  churnRisk: number;
  nextBestAction: string;
  tags: string[];
}

// Added AiActionTask for Dashboard strategy center
export interface AiActionTask {
  id: string;
  type: 'optimization' | 'alert' | 'opportunity' | 'churn_risk';
  title: string;
  issue: string;
  analysis: string;
  suggestion: string;
  impact: string;
}

// Added StatCardProps for global KPI tracking
export interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon?: any;
}

export interface Profile {
  id: string;
  msisdn: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female';
  city: string;
  tier: 'Crown' | 'Diamond' | 'Platinum' | 'Gold' | 'Silver';
  device_type: string;
  registration_date: string;
}

export interface Account {
  user_id: string;
  balance: number;
  data_balance_mb: number;
  voice_balance_min: number;
  arpu_30d: number;
  status: 'Inactive' | 'Active' | 'Sleep' | 'Registration' | 'Dormant';
  last_active_date: string;
}

export interface Campaign {
  id: string;
  name: string;
  status: 'active' | 'draft' | 'completed' | 'paused';
  channel: 'SMS' | 'Push' | 'Email' | 'Omni';
  reach: number;
  conversionRate: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  groundingUrls?: string[];
}

export interface Product {
  id: string;
  technicalId: string;
  marketingName: string;
  type: 'Data' | 'Voice' | 'Bundle' | 'VAS' | 'Device';
  price: number;
  description: string;
  category: string;
  status: 'active' | 'archived';
  // Added syncedAt for OCS synchronization status
  syncedAt?: string;
}

export interface Coupon {
  id: string;
  name: string;
  type: 'Discount' | 'Voucher' | 'Points';
  value: string;
  totalStock: number;
  claimed: number;
  validity: string;
  status: 'active' | 'expired' | 'draft';
  // Added description for marketing copy
  description?: string;
}

// ✅ Marketing Offer (Secondary Packaging)
export interface Offer {
  id: string;
  productId: string; // FK to products
  marketingName: string;
  discountPercent?: number;
  finalPrice: number;
  imageUrl?: string;
  createdAt?: string;
  // Joined data
  product?: Product; // Base product details
}
