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

export interface Customer {
  id: string;
  name: string;
  msisdn: string;
  segment: 'VVIP' | 'Prepaid' | 'Postpaid' | 'Churn Risk';
  arpu: number;
  balance: number;
  churnRisk: number; // 0-100
  nextBestAction: string;
  tags: string[];
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

export interface StatCardProps {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: React.ReactNode;
}

export interface AiActionTask {
  id: string;
  type: 'optimization' | 'opportunity' | 'alert';
  title: string;
  issue: string; // The Issue
  analysis: string; // The Why
  suggestion: string; // The Fix
  impact: string; // e.g. "Est. +$5k Revenue"
}

// --- Catalog Types ---

export interface Product {
  id: string;
  technicalId: string; // e.g., P_DATA_1024
  marketingName: string; // e.g., Weekend Data Blast
  type: 'Data' | 'Voice' | 'Bundle' | 'VAS';
  price: number;
  description: string;
  category: string;
  image?: string;
  status: 'active' | 'archived';
  syncedAt: string;
}

export interface Coupon {
  id: string;
  name: string;
  type: 'Discount' | 'Voucher' | 'Points';
  value: string; // e.g. "10%" or "1GB" or "500 Points"
  totalStock: number;
  claimed: number;
  validity: string;
  status: 'active' | 'expired' | 'draft';
  image?: string;
  description?: string;
}