
export interface Account {
    user_id: string; // Foreign Key to profiles.id
    balance: number;
    data_balance_mb: number;
    voice_balance_min: number;
    arpu_30d: number;
    status: 'Inactive' | 'Active' | 'Sleep' | 'Registration' | 'Dormant';
    last_active_date: string;
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
    created_at?: string; // Optional timestamp field for compatibility
    status: 'Active' | 'Churned' | 'Inactive' | 'Sleep' | 'Registration' | 'Dormant'; // User status (matches database enum)
    subscription?: 'Prepaid' | 'Postpaid'; // User payment type: Prepaid (预付费) or Postpaid (后付费)
    arpu_30d?: number; // Average Revenue Per User (30 days)
    churn_score?: number; // Churn prediction score (0-1)
    balance?: number; // Live wallet balance
    accounts?: Account[]; // Join definition
}

export interface CampaignLog {
    id?: string;
    campaign_name: string;
    action_type: string;
    recipient_count: number;
    status: 'Success' | 'Failed';
    executed_at?: string;
    metadata?: any;
}

export interface Offer {
    id?: string;
    marketingCopy?: string;
    [key: string]: any; // Flexible extension for other offer properties
}
