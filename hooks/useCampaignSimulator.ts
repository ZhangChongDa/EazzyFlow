import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { SegmentCriteria } from './useAudienceEstimator';
import { emailService } from '../services/emailService';

/**
 * Hook for campaign simulation with Real-time Interactive Closed Loop
 * 
 * Features:
 * - Find a random user matching segment criteria
 * - Send REAL email via Resend
 * - Subscribe to Supabase Realtime for click/purchase events
 * - Provide real-time feedback
 */
export const useCampaignSimulator = () => {
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<{
    stage: 'idle' | 'sending' | 'sent' | 'clicked' | 'converted';
    message: string;
  }>({ stage: 'idle', message: '' });
  
  const channelRef = useRef<any>(null);

  /**
   * Build Supabase query from SegmentCriteria (same logic as useAudienceEstimator)
   * ✅ Fix-4: Support Advanced Logic Mode with conditionGroups
   */
  const buildQuery = (criteria: SegmentCriteria) => {
    let query = supabase.from('profiles').select('*');

    // ✅ Fix-4: Support Advanced Logic Mode (conditionGroups)
    if (criteria.conditionGroups && criteria.conditionGroups.length > 0) {
      // Apply all conditions from all groups with AND logic (intersection)
      for (const group of criteria.conditionGroups) {
        for (const condition of group.conditions) {
          if (!condition.field || condition.value === '' || condition.value === null) continue;
          
          const val = condition.value;
          switch (condition.field) {
            case 'age':
              const ageVal = Number(val);
              if (!isNaN(ageVal)) {
                if (condition.operator === '>') query = query.gt('age', ageVal);
                else if (condition.operator === '<') query = query.lt('age', ageVal);
                else if (condition.operator === '>=') query = query.gte('age', ageVal);
                else if (condition.operator === '<=') query = query.lte('age', ageVal);
                else if (condition.operator === '=') query = query.eq('age', ageVal);
              }
              break;
            case 'city':
              if (condition.operator === 'in' && Array.isArray(val)) {
                query = query.in('location_city', val);
              } else if (condition.operator === '=') {
                query = query.eq('location_city', val);
              }
              break;
            case 'tier':
              if (condition.operator === 'in' && Array.isArray(val)) {
                query = query.in('tier', val);
              } else if (condition.operator === '=') {
                query = query.eq('tier', val);
              }
              break;
            case 'arpu_30d':
              const arpuVal = Number(val);
              if (!isNaN(arpuVal)) {
                if (condition.operator === '>') query = query.gt('arpu_30d', arpuVal);
                else if (condition.operator === '<') query = query.lt('arpu_30d', arpuVal);
                else if (condition.operator === '>=') query = query.gte('arpu_30d', arpuVal);
                else if (condition.operator === '<=') query = query.lte('arpu_30d', arpuVal);
                else if (condition.operator === '=') query = query.eq('arpu_30d', arpuVal);
              }
              break;
            case 'churn_score':
              const churnVal = Number(val);
              if (!isNaN(churnVal)) {
                if (condition.operator === '>') query = query.gt('churn_score', churnVal);
                else if (condition.operator === '<') query = query.lt('churn_score', churnVal);
                else if (condition.operator === '>=') query = query.gte('churn_score', churnVal);
                else if (condition.operator === '<=') query = query.lte('churn_score', churnVal);
                else if (condition.operator === '=') query = query.eq('churn_score', churnVal);
              }
              break;
            case 'gender':
              if (condition.operator === '=') query = query.eq('gender', val);
              break;
            case 'balance':
              const balanceVal = Number(val);
              if (!isNaN(balanceVal)) {
                if (condition.operator === '>') query = query.gt('balance', balanceVal);
                else if (condition.operator === '<') query = query.lt('balance', balanceVal);
                else if (condition.operator === '>=') query = query.gte('balance', balanceVal);
                else if (condition.operator === '<=') query = query.lte('balance', balanceVal);
                else if (condition.operator === '=') query = query.eq('balance', balanceVal);
              }
              break;
            case 'active_status':
              if (condition.operator === '=') {
                const statusMap: Record<string, string> = {
                  'Active': 'Active',
                  'Inactive': 'Inactive',
                  'Dormant': 'Inactive'
                };
                const mappedStatus = statusMap[val as string] || val;
                query = query.eq('status', mappedStatus);
              }
              break;
          }
        }
      }
      return query;
    }

    // Legacy mode: Build query from simple criteria
    // Tier filter
    if (criteria.tier) {
      query = query.eq('tier', criteria.tier);
    }

    // Age filters
    if (criteria.ageMin) {
      const ageMin = parseInt(criteria.ageMin);
      if (!isNaN(ageMin)) {
        query = query.gte('age', ageMin);
      }
    }
    if (criteria.ageMax) {
      const ageMax = parseInt(criteria.ageMax);
      if (!isNaN(ageMax)) {
        query = query.lte('age', ageMax);
      }
    }

    // Gender filter
    if (criteria.gender) {
      query = query.eq('gender', criteria.gender);
    }

    // City filter
    if (criteria.city) {
      query = query.eq('location_city', criteria.city);
    }

    // ARPU filters
    if (criteria.arpu?.min) {
      const arpuMin = parseFloat(criteria.arpu.min);
      if (!isNaN(arpuMin)) {
        query = query.gt('arpu_30d', arpuMin);
      }
    }
    if (criteria.arpu?.max) {
      const arpuMax = parseFloat(criteria.arpu.max);
      if (!isNaN(arpuMax)) {
        query = query.lt('arpu_30d', arpuMax);
      }
    }

    // Status filter
    if (criteria.activityType) {
      const statusMap: Record<string, string> = {
        'Active': 'Active',
        'Inactive': 'Inactive',
        'Dormant': 'Inactive',
        'Register': 'Active'
      };
      const status = statusMap[criteria.activityType] || criteria.activityType;
      query = query.eq('status', status);
    }

    return query;
  };

  /**
   * Cleanup Realtime subscription
   */
  useEffect(() => {
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, []);

  /**
   * Simulate campaign execution with Real Email & Realtime Tracking
   * @param campaignId - Campaign ID
   * @param segmentCriteria - Segment criteria to match users
   * @param offerName - Offer/product name
   * @param productId - Product ID for the offer
   * @param offerId - Offer ID from offers table (optional, preferred)
   * @param targetEmail - Email address to send to (presenter's email)
   * @param marketingCopy - AI-generated marketing copy
   * @param onStatusUpdate - Callback for status updates (click, purchase)
   */
  const simulateCampaign = async (
    campaignId: string,
    segmentCriteria: SegmentCriteria,
    offerName: string,
    productId: string,
    offerId?: string,
    targetEmail?: string,
    marketingCopy?: string,
    onStatusUpdate?: (status: { stage: string; message: string }) => void
  ): Promise<{ success: boolean; userId?: string; error?: string }> => {
    setSimulating(true);
    setError(null);
    setLiveStatus({ stage: 'sending', message: 'Sending email...' });

    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // ✅ Fix-4: Build query to find matching users
      // Use the same query building logic as useAudienceEstimator
      // buildQuery returns a query builder, we need to call it without head: true to get actual data
      let query = buildQuery(segmentCriteria);
      // Ensure we're selecting data (not just count) and limit results
      const { data: profiles, error: queryError } = await query.limit(100);

      if (queryError) {
        throw queryError;
      }

      if (!profiles || profiles.length === 0) {
        throw new Error('No users match the segment criteria');
      }

      // ✅ Impersonation: Pick a random user to attach this simulation to
      const randomIndex = Math.floor(Math.random() * profiles.length);
      const selectedUser = profiles[randomIndex];

      // ✅ Fix-1: Generate Magic Link - Use offerId if available, otherwise use campaign route
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      let magicLink: string;
      if (offerId) {
        // Use the marketing offer landing page route with campaignId and userId as query params
        magicLink = `${origin}/offer/${offerId}?campaignId=${campaignId}&userId=${selectedUser.id}&productId=${productId}`;
      } else {
        // Fallback to campaign simulation route (for backward compatibility)
        magicLink = `${origin}/campaign/${campaignId}/${selectedUser.id}/${productId}`;
      }

      // ✅ Send Real Email via Resend
      const greeting = `Hi ${selectedUser.name || 'Valued Customer'},`;
      const subject = `🎁 Exclusive Offer: ${offerName}`;
      
      const emailResult = await emailService.sendMarketingEmail(
        targetEmail,
        subject,
        greeting,
        marketingCopy,
        magicLink,
        'Claim Offer Now'
      );

      if (!emailResult.success) {
        throw new Error('Failed to send email');
      }

      setLiveStatus({ stage: 'sent', message: `Email sent to ${targetEmail}` });
      onStatusUpdate?.({ stage: 'sent', message: `Email sent to ${targetEmail}` });

      // ✅ Create initial 'send' log entry
      await supabase.from('campaign_logs').insert({
        campaign_id: campaignId,
        user_id: selectedUser.id,
        action_type: 'send',
        status: 'Success',
        metadata: {
          offer_name: offerName,
          product_id: productId,
          user_msisdn: selectedUser.msisdn,
          user_name: selectedUser.name,
          user_tier: selectedUser.tier,
          email_sent_to: targetEmail,
          magic_link: magicLink,
          sent_at: new Date().toISOString()
        }
      });

      // ✅ Subscribe to Realtime Updates (The "Loop")
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }

      // ✅ Task 3: Enhanced Realtime subscription with Post-Purchase Workflow
      const channel = supabase
        .channel(`campaign-${campaignId}-${selectedUser.id}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'campaign_logs',
            filter: `campaign_id=eq.${campaignId} AND user_id=eq.${selectedUser.id}`
          },
          async (payload: any) => {
            const log = payload.new;
            const actionType = log.action_type;

            if (actionType === 'click') {
              setLiveStatus({ stage: 'clicked', message: '🎯 User clicked the link!' });
              onStatusUpdate?.({ stage: 'clicked', message: 'User clicked the link!' });
            } else if (actionType === 'purchase') {
              console.log(`[Campaign Simulator] 🎉 Purchase verified for user ${selectedUser.id}`);
              setLiveStatus({ stage: 'converted', message: '💰 Conversion! User purchased offer.' });
              onStatusUpdate?.({ stage: 'converted', message: 'Conversion! User purchased offer.' });
              
              // ✅ Task 3: Execute Post-Purchase Workflow
              await executePostPurchaseWorkflow(campaignId, selectedUser.id, targetEmail);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      setError(null);
      return {
        success: true,
        userId: selectedUser.id
      };
    } catch (err: any) {
      console.error('Error simulating campaign:', err);
      const errorMessage = err.message || 'Failed to simulate campaign';
      setError(errorMessage);
      setLiveStatus({ stage: 'idle', message: '' });
      return { success: false, error: errorMessage };
    } finally {
      setSimulating(false);
    }
  };

  /**
   * ✅ Task 3: Execute Post-Purchase Workflow
   * Finds Wait Node -> Executes Wait -> Finds Next Channel Node -> Sends Upsell Email
   */
  const executePostPurchaseWorkflow = async (
    campaignId: string,
    userId: string,
    userEmail?: string
  ) => {
    try {
      console.log(`[Campaign Simulator] Starting Post-Purchase Workflow for campaign ${campaignId}`);
      
      // 1. Fetch campaign flow_definition
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('flow_definition')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign?.flow_definition) {
        console.error('[Campaign Simulator] Failed to fetch campaign flow:', campaignError);
        return;
      }

      const flowDef = campaign.flow_definition as any;
      const nodes = flowDef?.nodes || [];
      const edges = flowDef?.edges || [];

      if (!nodes.length || !edges.length) {
        console.warn('[Campaign Simulator] No nodes or edges found in flow_definition');
        return;
      }

      // 2. Find the current Channel Node (the one that sent the initial email)
      const channelNode = nodes.find((n: any) => n.type === 'channel');
      if (!channelNode) {
        console.warn('[Campaign Simulator] No Channel node found');
        return;
      }

      console.log(`[Campaign Simulator] Found Channel node: ${channelNode.id}`);

      // 3. Find the next Wait Node after the Channel node
      const waitNode = findNextNodeByType(nodes, edges, channelNode.id, 'wait');
      if (!waitNode) {
        console.log('[Campaign Simulator] No Wait node found after Channel node. Workflow complete.');
        return;
      }

      console.log(`[Campaign Simulator] Found Wait node: ${waitNode.id}, duration: ${waitNode.data?.durationValue} ${waitNode.data?.durationUnit}`);

      // 4. Execute Wait (Normal time scale)
      const waitDurationMs = convertWaitDurationToMilliseconds(
        waitNode.data?.durationValue,
        waitNode.data?.durationUnit
      );

      const waitDisplay = waitNode.data?.durationValue 
        ? `${waitNode.data.durationValue} ${waitNode.data.durationUnit || 'days'}`
        : '3 days';

      setLiveStatus({ stage: 'converted', message: `⏳ Waiting ${waitDisplay}...` });
      onStatusUpdate?.({ stage: 'converted', message: `Waiting ${waitDisplay} before next action...` });

      await new Promise(resolve => setTimeout(resolve, waitDurationMs));

      // 5. Find the next Channel Node after Wait
      const nextChannelNode = findNextNodeByType(nodes, edges, waitNode.id, 'channel');
      if (!nextChannelNode) {
        console.log('[Campaign Simulator] No Channel node found after Wait node. Workflow complete.');
        setLiveStatus({ stage: 'converted', message: '✅ Post-purchase workflow complete (no next action)' });
        return;
      }

      console.log(`[Campaign Simulator] Found next Channel node: ${nextChannelNode.id}`);

      // 6. Find the Action Node connected to this Channel node (for offer details)
      const actionNode = findUpstreamNodeByType(nodes, edges, nextChannelNode.id, 'action');
      
      // 7. Send Upsell Email
      setLiveStatus({ stage: 'converted', message: '📧 Sending upsell email...' });
      onStatusUpdate?.({ stage: 'converted', message: 'Sending upsell email...' });

      const upsellOfferName = actionNode?.data?.productName || actionNode?.data?.offerName || 'Exclusive Upsell Offer';
      const upsellProductId = actionNode?.data?.productId || '';
      const upsellOfferId = actionNode?.data?.offerId;
      const upsellMarketingCopy = nextChannelNode.data?.channelContent?.email?.text || 
        `Thank you for your purchase! We have an exclusive upsell offer just for you: ${upsellOfferName}`;

      // Generate magic link for upsell
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const upsellMagicLink = upsellOfferId
        ? `${origin}/offer/${upsellOfferId}?campaignId=${campaignId}&userId=${userId}&productId=${upsellProductId}`
        : `${origin}/campaign/${campaignId}/${userId}/${upsellProductId}`;

      const emailResult = await emailService.sendMarketingEmail(
        userEmail || 'demo@example.com',
        `🎁 ${upsellOfferName} - Exclusive Upsell`,
        'Hi there!',
        upsellMarketingCopy,
        upsellMagicLink,
        'Claim Upsell Offer'
      );

      if (emailResult.success) {
        // Log the upsell send event
        await supabase.from('campaign_logs').insert({
          campaign_id: campaignId,
          user_id: userId,
          action_type: 'send',
          status: 'Success',
          metadata: {
            offer_name: upsellOfferName,
            product_id: upsellProductId,
            email_sent_to: userEmail,
            magic_link: upsellMagicLink,
            sent_at: new Date().toISOString(),
            workflow_stage: 'post_purchase_upsell'
          }
        });

        setLiveStatus({ stage: 'converted', message: '✅ Upsell email sent successfully!' });
        onStatusUpdate?.({ stage: 'converted', message: 'Upsell email sent successfully!' });
        console.log(`[Campaign Simulator] ✅ Upsell email sent to ${userEmail}`);
      } else {
        throw new Error('Failed to send upsell email');
      }

    } catch (err: any) {
      console.error('[Campaign Simulator] Error in Post-Purchase Workflow:', err);
      setLiveStatus({ stage: 'converted', message: `⚠️ Workflow error: ${err.message}` });
    }
  };

  /**
   * ✅ Task 3: Helper function to find next node by type following edges
   */
  const findNextNodeByType = (
    nodes: any[],
    edges: any[],
    currentNodeId: string,
    targetType: string
  ): any | null => {
    // Find edges starting from current node
    const outgoingEdges = edges.filter((e: any) => e.source === currentNodeId);
    
    for (const edge of outgoingEdges) {
      const nextNode = nodes.find((n: any) => n.id === edge.target);
      if (nextNode?.type === targetType) {
        return nextNode;
      }
      // Recursively search if not found
      const found = findNextNodeByType(nodes, edges, edge.target, targetType);
      if (found) return found;
    }
    
    return null;
  };

  /**
   * ✅ Task 3: Helper function to find upstream node by type following edges backwards
   */
  const findUpstreamNodeByType = (
    nodes: any[],
    edges: any[],
    currentNodeId: string,
    targetType: string
  ): any | null => {
    // Find edges ending at current node
    const incomingEdges = edges.filter((e: any) => e.target === currentNodeId);
    
    for (const edge of incomingEdges) {
      const upstreamNode = nodes.find((n: any) => n.id === edge.source);
      if (upstreamNode?.type === targetType) {
        return upstreamNode;
      }
      // Recursively search if not found
      const found = findUpstreamNodeByType(nodes, edges, edge.source, targetType);
      if (found) return found;
    }
    
    return null;
  };

  /**
   * ✅ Convert wait duration to milliseconds (Normal time scale)
   */
  const convertWaitDurationToMilliseconds = (
    value: number | string | undefined,
    unit: string | undefined
  ): number => {
    const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
    
    switch (unit) {
      case 'minutes':
        return numValue * 60 * 1000; // minutes to milliseconds
      case 'hours':
        return numValue * 60 * 60 * 1000; // hours to milliseconds
      case 'days':
        return numValue * 24 * 60 * 60 * 1000; // days to milliseconds
      case 'weeks':
        return numValue * 7 * 24 * 60 * 60 * 1000; // weeks to milliseconds
      default:
        return 3 * 24 * 60 * 60 * 1000; // Default 3 days in milliseconds
    }
  };

  /**
   * Stop listening to realtime updates
   */
  const stopListening = () => {
    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }
    setLiveStatus({ stage: 'idle', message: '' });
  };

  return {
    simulateCampaign,
    simulating,
    error,
    liveStatus,
    stopListening
  };
};

