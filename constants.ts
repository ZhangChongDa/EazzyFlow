import { Customer, Campaign, AiActionTask, StatCardProps, Product, Coupon } from './types';

export const MOCK_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Aung San',
    msisdn: '+95 9 1234 5678',
    segment: 'VVIP',
    arpu: 45.5,
    balance: 12.00,
    churnRisk: 12,
    nextBestAction: 'Offer 10GB Data Plan',
    tags: ['High Data User', 'Roamer', 'iPhone 15 Pro']
  },
  {
    id: 'c2',
    name: 'Kyaw Zin',
    msisdn: '+95 9 8765 4321',
    segment: 'Churn Risk',
    arpu: 8.2,
    balance: 0.50,
    churnRisk: 85,
    nextBestAction: 'Retention Bonus - $2 Credit',
    tags: ['Low Balance', 'Gamer', 'Android']
  },
  {
    id: 'c3',
    name: 'Thidar Win',
    msisdn: '+95 9 1111 2222',
    segment: 'Prepaid',
    arpu: 15.0,
    balance: 5.00,
    churnRisk: 25,
    nextBestAction: 'Social Pack Upsell',
    tags: ['Facebook Power User', 'Student']
  }
];

export const MOCK_CAMPAIGNS: Campaign[] = [
  { id: 'cmp1', name: 'Yangon Rainy Season Data', status: 'active', channel: 'Omni', reach: 150000, conversionRate: 4.2 },
  { id: 'cmp2', name: 'Win Back Inactive 30d', status: 'active', channel: 'SMS', reach: 45000, conversionRate: 1.1 },
  { id: 'cmp3', name: 'VVIP Birthday Surprise', status: 'paused', channel: 'Push', reach: 1200, conversionRate: 18.5 },
];

export const CAMPAIGN_NODES = [
  { id: '1', type: 'trigger', label: 'Trigger: Balance < $1', x: 50, y: 150 },
  { id: '2', type: 'condition', label: 'Check: ARPU > $10', x: 300, y: 150 },
  { id: '3', type: 'action', label: 'Action: Send SMS Offer', x: 550, y: 50 },
  { id: '4', type: 'action', label: 'Action: Send Push Notif', x: 550, y: 250 },
];

export const DASHBOARD_AI_TASKS: AiActionTask[] = [
  {
    id: 't1',
    type: 'optimization',
    title: 'Campaign #1024 Low Conversion',
    issue: 'Conversion rate is 1.2% (Target: 3.5%)',
    analysis: '60% of target audience uses feature phones (cannot open App links).',
    suggestion: 'Switch channel from App Push to SMS USSD Popup.',
    impact: 'Est. +15% Conversion'
  },
  {
    id: 't2',
    type: 'alert',
    title: 'Churn Spike in Yangon',
    issue: 'Daily churn increased by 0.2% in Yangon Region.',
    analysis: 'Competitor MPT launched a "Double Data" promo yesterday.',
    suggestion: 'Launch "Loyalty Bonus" retention campaign immediately.',
    impact: 'Retain ~2,000 Users'
  },
  {
    id: 't3',
    type: 'opportunity',
    title: 'High Data Usage detected',
    issue: '5,000 users approached 90% data usage this morning.',
    analysis: 'These users have high ARPU and balance > $2.',
    suggestion: 'Trigger "Top-up & Get 1GB" real-time offer.',
    impact: 'Est. Revenue $4,500'
  }
];

export const DASHBOARD_KPIS: Partial<StatCardProps>[] = [
  {
    title: 'Campaign Revenue',
    value: '$428,500',
    trend: 'Incremental lift from MCCM',
    trendUp: true,
  },
  {
    title: 'Total Investment',
    value: '$45,200',
    trend: 'SMS cost + Incentive burn',
    trendUp: false,
  },
  {
    title: 'Overall ROI',
    value: '9.4x',
    trend: 'Revenue / Investment',
    trendUp: true,
  },
  {
    title: 'Active Audience',
    value: '12.4M',
    trend: 'Unique users reached (7d)',
    trendUp: true,
  }
];

export const FUNNEL_DATA = [
  { stage: 'Exposure', value: 1250000, label: 'Sent / Viewed', dropOff: '0%', color: '#818cf8' },
  { stage: 'Engagement', value: 450000, label: 'Clicked / Replied', dropOff: '64%', color: '#6366f1' },
  { stage: 'Conversion', value: 85000, label: 'Purchased', dropOff: '81%', color: '#4f46e5' },
  { stage: 'Revenue', value: 425000, label: 'Total Generated', dropOff: '-', color: '#10b981' },
];

export const HEALTH_ALERTS = [
  { id: 1, type: 'critical', message: 'Campaign #1024 SMS Gateway Timeout (Error 503)', time: '10m ago' },
  { id: 2, type: 'warning', message: 'VVIP Segment audience size dropped by 5%', time: '2h ago' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', technicalId: 'P_DATA_1GB_NIGHT', marketingName: '1GB Night Owl Pack', type: 'Data', price: 500, description: '1GB Data for use between 11PM - 7AM.', category: 'Night Packs', status: 'active', syncedAt: '2023-10-25' },
  { id: 'p2', technicalId: 'P_VOICE_100MIN', marketingName: '100 Mins Any-Net', type: 'Voice', price: 1000, description: '100 Minutes to any local network.', category: 'Voice Bundles', status: 'active', syncedAt: '2023-10-24' },
  { id: 'p3', technicalId: 'P_BUNDLE_SUPER', marketingName: 'Super Sunday Special', type: 'Bundle', price: 1500, description: '2GB Data + 50 Mins + 100 SMS', category: 'Weekend Specials', status: 'active', syncedAt: '2023-10-20' },
  { id: 'p4', technicalId: 'P_VAS_GAMING', marketingName: 'MLBB Game Booster', type: 'VAS', price: 300, description: 'Unlimited gaming data for Mobile Legends (24h).', category: 'Gaming', status: 'active', syncedAt: '2023-10-15' },
];

export const INITIAL_COUPONS: Coupon[] = [
  { id: 'cp1', name: 'Welcome Back 50% Off', type: 'Discount', value: '50%', totalStock: 10000, claimed: 450, validity: '2023-12-31', status: 'active', description: '50% Discount on next Data Pack purchase.' },
  { id: 'cp2', name: 'Free KFC Burger', type: 'Voucher', value: '1 Unit', totalStock: 500, claimed: 480, validity: '2023-11-15', status: 'active', description: 'Redeemable at any KFC Yangon branch.' },
  { id: 'cp3', name: 'Loyalty Bonus Points', type: 'Points', value: '500 Pts', totalStock: 100000, claimed: 12500, validity: '2024-01-01', status: 'active', description: 'Instant 500 points credit to user wallet.' },
  { id: 'cp4', name: 'Myanmar Plaza Flash Sale', type: 'Discount', value: '30%', totalStock: 5000, claimed: 120, validity: '2024-06-30', status: 'active', description: '30% off at participating stores in Myanmar Plaza.' },
  { id: 'cp5', name: 'City Mart Grocery Voucher', type: 'Voucher', value: '5,000 Ks', totalStock: 2000, claimed: 500, validity: '2024-05-15', status: 'active', description: '5,000 MMK discount on groceries.' },
  { id: 'cp6', name: 'JCGV Cinema Ticket BOGO', type: 'Voucher', value: '1 Ticket', totalStock: 1000, claimed: 850, validity: '2024-04-01', status: 'active', description: 'Buy 1 Get 1 Free for weekend movies.' },
  { id: 'cp7', name: 'Grab Ride 20% Off', type: 'Discount', value: '20%', totalStock: 10000, claimed: 3000, validity: '2024-12-31', status: 'active', description: 'Discount on next 5 Grab rides.' },
];