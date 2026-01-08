import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface CampaignFlightMetric {
    id: string;
    name: string;
    status: 'Active' | 'Inactive' | 'Scheduled' | 'Draft' | 'Completed';
    reach: number;
    conversion: number;
    spend: string;
    roas: string;
}

export const useCampaignFlightData = () => {
    const [campaigns, setCampaigns] = useState<CampaignFlightMetric[]>([]);
    const [loading, setLoading] = useState(true);

    // ✅ Extract fetch logic to reusable function
    const fetchCampaigns = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('campaigns')
                .select('id, name, status, stats, reach, conversion_rate, created_at')
                .order('created_at', { ascending: false });

            if (error) throw error;

            const formattedData: CampaignFlightMetric[] = (data || []).map((c: any) => {
                // Status Mapping
                let statusLabel: CampaignFlightMetric['status'] = 'Draft';
                if (c.status === 'active') statusLabel = 'Active';
                if (c.status === 'paused') statusLabel = 'Inactive';
                if (c.status === 'completed') statusLabel = 'Completed';

                // Reach & Conversion (Fallback to stats JSON if root columns empty)
                const reachVal = c.reach || c.stats?.sent || 0;
                const convVal = c.conversion_rate || (c.stats?.converted / (c.stats?.sent || 1)) || 0;

                // Mock Financials (since we don't track campaign cost in DB yet)
                // Assume $0.05 per user reached
                const estimatedSpend = reachVal * 0.05;
                // Assume $10 revenue per conversion
                const estimatedRevenue = (reachVal * convVal) * 10;
                const roasVal = estimatedSpend > 0 ? (estimatedRevenue / estimatedSpend).toFixed(1) + 'x' : '0.0x';

                return {
                    id: c.id,
                    name: c.name,
                    status: statusLabel,
                    reach: reachVal,
                    conversion: convVal, // Keep as decimal (e.g. 0.15)
                    spend: `$${estimatedSpend.toLocaleString()}`,
                    roas: roasVal
                };
            });

            setCampaigns(formattedData);
        } catch (err) {
            console.error('Error fetching campaign flight data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCampaigns();
    }, []);

    // ✅ Export refresh function
    return { campaigns, loading, refreshCampaigns: fetchCampaigns };
};
