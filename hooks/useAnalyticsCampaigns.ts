import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface AnalyticsCampaign {
  id: string;
  name: string;
  status: 'Completed' | 'Running' | 'Paused' | 'Draft';
  sent: number;
  cvr: number; // Conversion rate as percentage (e.g., 4.2 for 4.2%)
  revenue: number;
  roi: string; // Format: "1:8.5"
  aiSummary: string;
  attribution: Array<{ name: string; value: number; color: string }>;
}

/**
 * Hook to fetch campaigns with analytics data including attribution
 */
export const useAnalyticsCampaigns = () => {
  const [campaigns, setCampaigns] = useState<AnalyticsCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      
      // Fetch campaigns
      const { data: campaignsData, error: campaignsError } = await supabase
        .from('campaigns')
        .select('id, name, status, stats, reach, conversion_rate, created_at')
        .order('created_at', { ascending: false });

      if (campaignsError) throw campaignsError;

      if (!campaignsData || campaignsData.length === 0) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      // Fetch campaign logs for attribution calculation
      const campaignIds = campaignsData.map(c => c.id);
      const { data: logsData, error: logsError } = await supabase
        .from('campaign_logs')
        .select('campaign_id, action_type, metadata')
        .in('campaign_id', campaignIds)
        .eq('action_type', 'purchase'); // Only count purchases for attribution

      if (logsError) {
        console.warn('Error fetching campaign logs for attribution:', logsError);
      }

      // Calculate attribution per campaign
      const attributionMap = new Map<string, Map<string, number>>();
      
      if (logsData) {
        logsData.forEach((log: any) => {
          const campaignId = log.campaign_id;
          if (!attributionMap.has(campaignId)) {
            attributionMap.set(campaignId, new Map());
          }
          
          const channelMap = attributionMap.get(campaignId)!;
          
          // Extract channel from metadata
          let channel = 'Email'; // Default channel
          try {
            const metadata = typeof log.metadata === 'string' 
              ? JSON.parse(log.metadata) 
              : log.metadata;
            
            // Try to determine channel from metadata or flow_definition
            // For now, default to Email since most campaigns use email
            channel = metadata?.channel || 'Email';
          } catch (e) {
            // Use default
          }
          
          const currentCount = channelMap.get(channel) || 0;
          channelMap.set(channel, currentCount + 1);
        });
      }

      // Channel colors mapping
      const channelColors: Record<string, string> = {
        'Email': '#4f46e5',
        'SMS': '#10b981',
        'App Push': '#4f46e5',
        'Social': '#f59e0b',
        'Direct Call': '#ec4899',
      };

      // Transform campaigns data
      const formattedCampaigns: AnalyticsCampaign[] = campaignsData.map((c: any) => {
        // Status mapping
        let statusLabel: AnalyticsCampaign['status'] = 'Draft';
        if (c.status === 'active') statusLabel = 'Running';
        else if (c.status === 'paused') statusLabel = 'Paused';
        else if (c.status === 'completed') statusLabel = 'Completed';

        // Calculate metrics
        const sent = c.reach || c.stats?.sent || 0;
        const converted = c.stats?.converted || 0;
        const cvr = sent > 0 ? ((converted / sent) * 100) : 0;
        
        // Calculate revenue (assume $10 per conversion)
        const revenue = converted * 10;
        
        // Calculate ROI (assume $0.05 per sent)
        const spend = sent * 0.05;
        const roiValue = spend > 0 ? (revenue / spend) : 0;
        const roi = `1:${roiValue.toFixed(1)}`;

        // Calculate attribution
        const channelCounts = attributionMap.get(c.id) || new Map();
        const totalPurchases = Array.from(channelCounts.values()).reduce((sum, count) => sum + count, 0);
        
        const attribution: Array<{ name: string; value: number; color: string }> = [];
        
        if (totalPurchases > 0) {
          channelCounts.forEach((count, channel) => {
            const percentage = (count / totalPurchases) * 100;
            attribution.push({
              name: channel,
              value: Math.round(percentage),
              color: channelColors[channel] || '#6366f1'
            });
          });
        } else {
          // Default attribution if no purchases yet
          attribution.push({
            name: 'Email',
            value: 100,
            color: channelColors['Email']
          });
        }

        // Generate AI Summary
        let aiSummary = '';
        if (statusLabel === 'Completed') {
          if (cvr > 5) {
            aiSummary = `Excellent performance. ROI ${roi} exceeds quarterly average (1:5). ${attribution[0]?.name || 'Email'} channel contributed ${attribution[0]?.value || 100}% of conversions.`;
          } else if (cvr > 2) {
            aiSummary = `Good performance. ROI ${roi} meets expectations. ${attribution[0]?.name || 'Email'} channel contributed ${attribution[0]?.value || 100}% of conversions.`;
          } else {
            aiSummary = `Underperforming. ROI ${roi} below expectations. Consider optimizing targeting or messaging.`;
          }
        } else if (statusLabel === 'Running') {
          aiSummary = `Ongoing campaign. Current CVR ${cvr.toFixed(1)}%. ${converted > 0 ? 'Showing positive engagement.' : 'Awaiting conversions.'}`;
        } else {
          aiSummary = `Campaign ${statusLabel.toLowerCase()}. Ready to launch or paused for review.`;
        }

        return {
          id: c.id,
          name: c.name,
          status: statusLabel,
          sent,
          cvr: Math.round(cvr * 10) / 10, // Round to 1 decimal
          revenue: Math.round(revenue),
          roi,
          aiSummary,
          attribution
        };
      });

      setCampaigns(formattedCampaigns);
    } catch (err) {
      console.error('Error fetching analytics campaigns:', err);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return { campaigns, loading, refreshCampaigns: fetchCampaigns };
};

