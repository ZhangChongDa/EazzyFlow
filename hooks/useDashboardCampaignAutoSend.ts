import { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabaseClient';
import { useCampaignSimulator } from './useCampaignSimulator';
import { SegmentCriteria } from './useAudienceEstimator';
import { emailService } from '../services/emailService';

/**
 * Hook for Dashboard Campaign Auto-Send and Realtime Updates
 * 
 * Features:
 * - Auto-send emails when campaign status changes from Off to On
 * - Realtime notifications for user conversions
 * - Dynamic conversion rate calculation
 */
export interface ConversionNotification {
  id: string;
  campaignId: string;
  campaignName: string;
  userId: string;
  userEmail?: string;
  timestamp: Date;
  type: 'conversion' | 'upsell_sent' | 'workflow_step';
  message?: string;
  revenue?: number;
}

export const useDashboardCampaignAutoSend = () => {
  const [notifications, setNotifications] = useState<ConversionNotification[]>([]);
  // ✅ Fix: Use useRef instead of useState to avoid async race conditions
  const notifiedUsers = useRef<Set<string>>(new Set()); // Track users we've already notified (synchronous)
  const executingWorkflows = useRef<Set<string>>(new Set()); // ✅ Fix: Track executing workflows to prevent duplicates
  const channelRefs = useRef<Map<string, any>>(new Map());
  const activeSubscriptionIds = useRef<Set<string>>(new Set()); // ✅ Task 1: Track active subscriptions
  const { simulateCampaign } = useCampaignSimulator();

  /**
   * Auto-send emails when campaign is activated
   */
  const handleCampaignActivated = async (campaignId: string) => {
    try {
      // Fetch campaign details including flow_definition
      const { data: campaign, error } = await supabase
        .from('campaigns')
        .select('id, name, flow_definition, status')
        .eq('id', campaignId)
        .single();

      if (error || !campaign) {
        console.error('Error fetching campaign:', error);
        return;
      }

      // Extract demo emails from flow_definition.metadata
      const flowDef = campaign.flow_definition as any;
      
      // ✅ Debug: Log the structure to understand the data format
      console.log(`[Dashboard Auto-Send] Campaign ${campaignId} flow_definition structure:`, {
        hasMetadata: !!flowDef?.metadata,
        metadataKeys: flowDef?.metadata ? Object.keys(flowDef.metadata) : [],
        demoEmails: flowDef?.metadata?.demoEmails,
        flowDefKeys: Object.keys(flowDef || {})
      });
      
      const demoEmails = flowDef?.metadata?.demoEmails || [];

      if (demoEmails.length === 0) {
        console.log(`[Dashboard Auto-Send] No demo emails found for campaign ${campaignId}. Flow definition:`, JSON.stringify(flowDef, null, 2));
        return;
      }

      // Extract campaign nodes to get segment criteria, offer info, etc.
      const nodes = flowDef?.nodes || [];
      const segmentNode = nodes.find((n: any) => n.type === 'segment');
      const actionNode = nodes.find((n: any) => n.type === 'action');
      const channelNode = nodes.find((n: any) => n.type === 'channel');

      if (!segmentNode || !actionNode) {
        console.warn('Campaign missing required nodes (Segment or Action)');
        return;
      }

      const segmentData = segmentNode.data;
      const actionData = actionNode.data;
      const channelData = channelNode?.data || {};

      const segmentCriteria = segmentData.segmentCriteria as SegmentCriteria;
      const offerName = actionData.productName || actionData.couponName || 'Campaign Offer';
      const productId = actionData.productId || '';
      const offerId = actionData.offerId;
      const marketingCopy = channelData.channelContent?.email?.text ||
        channelData.channelContent?.sms?.text ||
        `Don't miss out on this exclusive offer: ${offerName}!`;

      // Send emails to all demo email addresses
      console.log(`🚀 Auto-sending emails for campaign ${campaignId} to ${demoEmails.length} recipients`);
      
      for (const email of demoEmails) {
        if (!email || !email.trim()) continue;

        try {
          await simulateCampaign(
            campaignId,
            segmentCriteria,
            offerName,
            productId,
            offerId,
            email.trim(),
            marketingCopy
          );
        } catch (err) {
          console.error(`Failed to send email to ${email}:`, err);
        }
      }
    } catch (err) {
      console.error('Error in handleCampaignActivated:', err);
    }
  };

  /**
   * Subscribe to realtime updates for a campaign
   * ✅ FIXED: "Wide-in, Strict-out" strategy - Remove filter, filter client-side
   */
  const subscribeToCampaign = (campaignId: string, campaignName: string) => {
    // ✅ Task 1: Check if already subscribed
    if (activeSubscriptionIds.current.has(campaignId)) {
      console.log(`[Realtime] Already subscribed to campaign ${campaignId}, skipping...`);
      return;
    }

    // Unsubscribe from existing channel if any (safety check)
    const existingChannel = channelRefs.current.get(campaignId);
    if (existingChannel) {
      console.log(`[Realtime] Cleaning up existing channel for campaign ${campaignId}`);
      existingChannel.unsubscribe();
      channelRefs.current.delete(campaignId);
    }

    // ✅ Use unique channel name to avoid conflicts
    const uniqueChannelName = `dashboard-campaign-${campaignId}-${Date.now()}`;
    console.log(`[Realtime] Attempting to connect for campaign ${campaignId} (channel: ${uniqueChannelName})...`);
    
    // ✅ Task 1: Mark as active immediately to prevent race conditions
    activeSubscriptionIds.current.add(campaignId);
    
    const channel = supabase
      .channel(uniqueChannelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'campaign_logs'
          // ✅ REMOVED FILTER - Let all events through, filter client-side
        },
        async (payload: any) => {
          const log = payload.new;
          
          // ✅ Client-side filtering (Wide-in, Strict-out)
          if (!log) {
            console.warn(`[Realtime] ⚠️ No new data in payload:`, payload);
            return;
          }

          // Filter by campaign_id
          if (log.campaign_id !== campaignId) {
            // Silently ignore events for other campaigns
            return;
          }

          // Filter by action_type
          if (log.action_type !== 'purchase') {
            // Silently ignore non-purchase events
            return;
          }

          // ✅ MATCH! This is a purchase event for our campaign
          console.log(`[Realtime] 🎯 MATCH! Purchase detected for campaign ${campaignId}, user ${log.user_id}`);
          
          const userId = log.user_id;

          // ✅ Fix-2: Include product_id/offer_id in userKey to allow multiple purchases per user (initial + upsell)
          let productId = 'unknown';
          let metadata: any = {};
          try {
            metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
            productId = metadata?.product_id || metadata?.offer_id || 'unknown';
          } catch (e) {
            console.warn(`[Realtime] Failed to parse metadata for product_id:`, e);
          }
          
          // ✅ Fix: Check if this is an Upsell purchase - if so, skip workflow trigger
          const isUpsellPurchaseByMetadata = metadata?.workflow_stage === 'post_purchase_upsell' || 
                                            metadata?.is_upsell === true ||
                                            metadata?.purchase_type === 'upsell';
          
          // ✅ Fix: If metadata doesn't indicate upsell, check if user has already received upsell email
          let isUpsellPurchase = isUpsellPurchaseByMetadata;
          if (!isUpsellPurchase) {
            try {
              // Check if user has received upsell email (workflow_stage: 'post_purchase_upsell')
              // Query all send logs for this user in this campaign, then filter client-side
              const { data: sendLogs } = await supabase
                .from('campaign_logs')
                .select('id, metadata')
                .eq('campaign_id', campaignId)
                .eq('user_id', userId)
                .eq('action_type', 'send')
                .order('created_at', { ascending: false })
                .limit(10); // Get recent send logs
              
              if (sendLogs && sendLogs.length > 0) {
                // Check if any send log has workflow_stage: 'post_purchase_upsell'
                const hasUpsellEmail = sendLogs.some((log: any) => {
                  try {
                    const logMetadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
                    return logMetadata?.workflow_stage === 'post_purchase_upsell';
                  } catch (e) {
                    return false;
                  }
                });
                
                if (hasUpsellEmail) {
                  console.log(`[Realtime] 🔍 User has already received upsell email, treating this purchase as upsell`);
                  isUpsellPurchase = true;
                }
              }
            } catch (e) {
              // If query fails, continue with normal flow (defensive)
              console.warn(`[Realtime] Failed to check upsell email history:`, e);
            }
          }
          
          if (isUpsellPurchase) {
            console.log(`[Realtime] 🔍 Upsell purchase detected (workflow_stage: ${metadata?.workflow_stage}), skipping workflow trigger. Only adding notification.`);
            // Still add notification for Upsell purchase, but don't trigger workflow
            const upsellNotification: ConversionNotification = {
              id: `${campaignId}-${userId}-upsell-${Date.now()}`,
              campaignId,
              campaignName,
              userId,
              userEmail: metadata?.email_sent_to || metadata?.user_email,
              timestamp: new Date(),
              type: 'conversion',
              revenue: metadata?.revenue || metadata?.amount
            };
            setNotifications(prev => [...prev, upsellNotification]);
            console.log(`[Realtime] ✅ Upsell purchase notification added (no workflow trigger)`);
            
            // Update conversion rate
            await updateCampaignConversion(campaignId);
            return; // Don't trigger workflow for Upsell purchases
          }
          
          const userKey = `${campaignId}-${userId}-${productId}`;
          const workflowKeyForUser = `${campaignId}-${userId}-workflow`;
          
          // ✅ Fix: Check if already notified for this specific product (synchronous check with useRef)
          if (notifiedUsers.current.has(userKey)) {
            console.log(`[Realtime] User ${userId} already notified for campaign ${campaignId}, product ${productId}, skipping...`);
            return; // Already notified for this user + product combination
          }

          // ✅ Fix: Check if workflow is already executing
          if (executingWorkflows.current.has(workflowKeyForUser)) {
            console.log(`[Realtime] Workflow already executing for user ${userId} in campaign ${campaignId}, skipping...`);
            return; // Workflow already executing
          }

          console.log(`[Realtime] 🎉 New conversion detected: campaign=${campaignId}, user=${userId}`);

          // ✅ Fix: Mark as notified immediately (synchronous with useRef)
          notifiedUsers.current.add(userKey);
          // ✅ Fix: Don't add to executingWorkflows here - let the function itself manage it
          // This prevents the function from immediately returning due to the check inside

          // Get user email from metadata if available
          let userEmail: string | undefined;
          try {
            const metadata = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
            userEmail = metadata?.email_sent_to || metadata?.user_email;
          } catch (e) {
            console.warn(`[Realtime] Failed to parse metadata:`, e);
          }

          // Add notification
          const notification: ConversionNotification = {
            id: `${campaignId}-${userId}-${Date.now()}`,
            campaignId,
            campaignName,
            userId,
            userEmail,
            timestamp: new Date(),
            type: 'conversion'
          };

          setNotifications(prev => [...prev, notification]);
          console.log(`[Realtime] ✅ Notification added:`, notification);

          // ✅ Update conversion rate and reach when conversion happens
          await updateCampaignConversion(campaignId);

          // ✅ Task 2: Trigger Workflow Engine (Post-Purchase Upsell)
          // ✅ Fix: Add try-catch and ensure workflow executes even if email is missing
          // Note: workflowKeyForUser is already defined above, reuse it for cleanup
          console.log(`[Realtime] About to execute workflow for campaign ${campaignId}, userEmail: ${userEmail || 'MISSING'}`);
          console.log(`[Realtime] 🔵 Calling executePostPurchaseWorkflow with:`, {
            campaignId,
            userId,
            userEmail: userEmail || 'MISSING',
            campaignName
          });
          
          // ✅ Fix: Add defensive check to ensure function exists
          console.log(`[Realtime] 🔍 Checking function reference...`, {
            functionType: typeof executePostPurchaseWorkflow,
            functionExists: typeof executePostPurchaseWorkflow === 'function',
            functionName: executePostPurchaseWorkflow?.name || 'anonymous'
          });
          
          if (typeof executePostPurchaseWorkflow !== 'function') {
            console.error(`[Realtime] ❌ CRITICAL: executePostPurchaseWorkflow is not a function! Type: ${typeof executePostPurchaseWorkflow}`);
            console.error(`[Realtime] ❌ Available in scope:`, {
              hasUpdateCampaignConversion: typeof updateCampaignConversion === 'function',
              hasSimulateCampaign: typeof simulateCampaign === 'function',
              hasSetNotifications: typeof setNotifications === 'function'
            });
            return;
          }
          
          console.log(`[Realtime] ✅ Function reference verified, executing workflow...`);
          console.log(`[Realtime] 🔵 Function details:`, {
            name: executePostPurchaseWorkflow.name,
            length: executePostPurchaseWorkflow.length,
            toString: executePostPurchaseWorkflow.toString().substring(0, 100)
          });
          
          try {
            // ✅ Fix: Add log immediately before calling to confirm execution
            console.log(`[Realtime] 🔵 About to await executePostPurchaseWorkflow...`);
            console.log(`[Realtime] 🔵 Call stack at this point:`, new Error().stack?.split('\n').slice(0, 5));
            const workflowResult = await executePostPurchaseWorkflow(campaignId, userId, userEmail, campaignName);
            console.log(`[Realtime] 🔵 Workflow function returned:`, workflowResult);
          } catch (workflowError: any) {
            console.error(`[Realtime] ❌ Error executing workflow:`, workflowError);
            console.error(`[Realtime] ❌ Error message:`, workflowError?.message);
            console.error(`[Realtime] ❌ Error stack:`, workflowError?.stack);
            console.error(`[Realtime] ❌ Error name:`, workflowError?.name);
            // Don't throw - workflow failure shouldn't break the notification flow
          } finally {
            // ✅ Fix: Remove from executing set when workflow completes (success or error)
            executingWorkflows.current.delete(workflowKeyForUser);
            console.log(`[Realtime] Workflow execution completed for user ${userId} in campaign ${campaignId}`);
          }

          // Auto-remove notification after 10 seconds
          setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
          }, 10000);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`✅ [Realtime] CONNECTED! Campaign ${campaignId} (${campaignName})`);
          // ✅ Task 1: Ensure marked as active
          activeSubscriptionIds.current.add(campaignId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`❌ [Realtime] CHANNEL_ERROR for campaign ${campaignId}:`, err);
          console.error(`[Realtime] Error details:`, {
            status,
            error: err,
            campaignId,
            channelName: uniqueChannelName
          });
          // ✅ Task 1: Remove from active set on error
          activeSubscriptionIds.current.delete(campaignId);
        } else if (status === 'TIMED_OUT') {
          console.warn(`⏱️ [Realtime] TIMED_OUT for campaign ${campaignId}`);
          activeSubscriptionIds.current.delete(campaignId);
        } else if (status === 'CLOSED') {
          console.log(`🔒 [Realtime] CLOSED for campaign ${campaignId}`);
          activeSubscriptionIds.current.delete(campaignId);
        } else {
          console.log(`ℹ️ [Realtime] Status for campaign ${campaignId}:`, status, err);
        }
      });

    channelRefs.current.set(campaignId, channel);
  };

  /**
   * Unsubscribe from campaign updates
   * ✅ Task 1: Also remove from active subscriptions tracking
   */
  const unsubscribeFromCampaign = (campaignId: string) => {
    const channel = channelRefs.current.get(campaignId);
    if (channel) {
      console.log(`[Realtime] Unsubscribing from campaign ${campaignId}`);
      channel.unsubscribe();
      channelRefs.current.delete(campaignId);
    }
    // ✅ Task 1: Remove from active set
    activeSubscriptionIds.current.delete(campaignId);
  };

  /**
   * Update conversion rate and reach for a campaign
   */
  const updateCampaignConversion = async (campaignId: string) => {
    try {
      console.log(`[Dashboard Auto-Send] Updating conversion for campaign ${campaignId}`);
      
      // Count sent, clicked, and converted
      const { data: logs, error } = await supabase
        .from('campaign_logs')
        .select('action_type')
        .eq('campaign_id', campaignId);

      if (error) {
        console.error(`[Dashboard Auto-Send] Error fetching logs:`, error);
        throw error;
      }

      const sent = logs?.filter(l => l.action_type === 'send').length || 0;
      const clicked = logs?.filter(l => l.action_type === 'click').length || 0;
      const converted = logs?.filter(l => l.action_type === 'purchase').length || 0;
      const conversionRate = sent > 0 ? converted / sent : 0;

      console.log(`[Dashboard Auto-Send] Campaign ${campaignId} stats: sent=${sent}, clicked=${clicked}, converted=${converted}, rate=${conversionRate.toFixed(4)}`);

      // Update campaign with reach, conversion_rate, and stats
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({
          reach: sent, // ✅ Fix: Update reach field (equals sent count)
          conversion_rate: conversionRate,
          stats: {
            sent,
            clicked,
            converted
          }
        })
        .eq('id', campaignId);

      if (updateError) {
        console.error(`[Dashboard Auto-Send] Error updating campaign:`, updateError);
        throw updateError;
      }

      console.log(`[Dashboard Auto-Send] Successfully updated campaign ${campaignId}: reach=${sent}, conversion_rate=${conversionRate.toFixed(4)}`);
    } catch (err) {
      console.error('[Dashboard Auto-Send] Error updating campaign conversion:', err);
    }
  };

  /**
   * ✅ Task 2: Workflow Engine - Execute Post-Purchase Workflow
   * Finds Logic -> Wait -> Next Action/Channel -> Sends Upsell Email
   */
  const executePostPurchaseWorkflow = async (
    campaignId: string,
    userId: string,
    userEmail: string | undefined,
    campaignName: string
  ) => {
    // ✅ Fix: Add IMMEDIATE synchronous log at the very beginning (before any async operations)
    // This ensures we can see if the function is actually being called
    console.log(`[Workflow Engine] 🔵 Function entry point reached - SYNCHRONOUS LOG`, {
      campaignId,
      userId,
      userEmail: userEmail || 'UNDEFINED',
      timestamp: new Date().toISOString(),
      functionName: 'executePostPurchaseWorkflow',
      argsReceived: { campaignId, userId, userEmail, campaignName }
    });
    
    const workflowKey = `${campaignId}-${userId}-workflow`;
    console.log(`[Workflow Engine] 🔵 Workflow key: ${workflowKey}`);
    console.log(`[Workflow Engine] 🔵 Current executing workflows:`, Array.from(executingWorkflows.current));
    
    // ✅ Fix: Double-check if workflow is already executing (defense in depth)
    if (executingWorkflows.current.has(workflowKey)) {
      console.warn(`[Workflow Engine] ⚠️ Workflow already executing for ${workflowKey}, aborting duplicate execution`);
      return;
    }
    
    console.log(`[Workflow Engine] 🔵 Workflow key not found in executing set, proceeding...`);
    
    // ✅ Fix: Mark as executing immediately (synchronous with useRef)
    executingWorkflows.current.add(workflowKey);
    console.log(`[Workflow Engine] 🔵 Added workflow key to executing set`);
    
    // ✅ Fix: Add immediate log to confirm function is called
    console.log(`🚀 [Workflow Engine] FUNCTION CALLED - Starting Workflow for:`, {
      campaignId,
      userId,
      userEmail: userEmail || 'UNDEFINED - Will try to fetch from metadata',
      campaignName,
      timestamp: new Date().toISOString(),
      workflowKey
    });
    
    try {
      console.log(`🤖 [Workflow Engine] Purchase detected. Initiating Upsell sequence for campaign ${campaignId}...`);

      // 1. Fetch campaign flow_definition
      const { data: campaign, error: campaignError } = await supabase
        .from('campaigns')
        .select('flow_definition')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign?.flow_definition) {
        console.warn(`[Workflow Engine] No flow_definition found for campaign ${campaignId}`);
        return;
      }

      const flowDef = campaign.flow_definition as any;
      const nodes = flowDef?.nodes || [];
      const edges = flowDef?.edges || [];

      if (!nodes.length) {
        console.warn(`[Workflow Engine] No nodes found in flow_definition`);
        return;
      }

      // 2. Find the first Action Node (to identify the initial offer)
      const firstActionNode = nodes.find((n: any) => n.type === 'action');
      const firstActionId = firstActionNode?.id;
      
      console.log(`[Workflow Engine] First Action Node:`, {
        id: firstActionId,
        productName: firstActionNode?.data?.productName,
        offerName: firstActionNode?.data?.offerName
      });

      // 3. Find Wait Node
      const waitNode = nodes.find((n: any) => n.type === 'wait');
      console.log(`[Workflow Engine] Wait Node:`, {
        found: !!waitNode,
        id: waitNode?.id,
        durationValue: waitNode?.data?.durationValue,
        durationUnit: waitNode?.data?.durationUnit
      });
      
      // 4. Find the SECOND Action Node (Upsell Offer) - heuristic: find action node that isn't the first one
      const upsellActionNode = nodes.find((n: any) => 
        n.type === 'action' && n.id !== firstActionId
      );
      
      console.log(`[Workflow Engine] Upsell Action Node:`, {
        found: !!upsellActionNode,
        id: upsellActionNode?.id,
        productName: upsellActionNode?.data?.productName,
        offerName: upsellActionNode?.data?.offerName,
        productId: upsellActionNode?.data?.productId,
        offerId: upsellActionNode?.data?.offerId
      });

      // 5. Find the SECOND Channel Node (Upsell Channel) - heuristic: find channel node after wait
      let upsellChannelNode = null;
      if (waitNode) {
        // Find edges from wait node
        const waitEdges = edges.filter((e: any) => e.source === waitNode.id);
        for (const edge of waitEdges) {
          const nextNode = nodes.find((n: any) => n.id === edge.target);
          if (nextNode?.type === 'channel') {
            upsellChannelNode = nextNode;
            break;
          }
        }
      }

      // If no channel found after wait, try to find any channel that isn't the first one
      if (!upsellChannelNode) {
        const firstChannelNode = nodes.find((n: any) => n.type === 'channel');
        upsellChannelNode = nodes.find((n: any) => 
          n.type === 'channel' && n.id !== firstChannelNode?.id
        );
      }

      if (!upsellActionNode && !upsellChannelNode) {
        console.log(`[Workflow Engine] No upsell action/channel found. Workflow complete.`);
        return;
      }

      // 6. Execute Wait (Normal time scale)
      if (waitNode) {
        const waitDurationMs = convertWaitDurationToMilliseconds(
          waitNode.data?.durationValue,
          waitNode.data?.durationUnit
        );
        
        const waitDisplay = waitNode.data?.durationValue 
          ? `${waitNode.data.durationValue} ${waitNode.data.durationUnit || 'days'}`
          : '3 days';

        console.log(`⏳ [Workflow Engine] Wait Node found:`, {
          durationValue: waitNode.data?.durationValue,
          durationUnit: waitNode.data?.durationUnit,
          waitDisplay,
          waitDurationMs,
          waitDurationSeconds: Math.round(waitDurationMs / 1000)
        });
        console.log(`⏳ [Workflow Engine] Waiting ${waitDisplay}...`);
        
        // Add workflow step notification
        const waitNotification: ConversionNotification = {
          id: `workflow-wait-${campaignId}-${Date.now()}`,
          campaignId,
          campaignName,
          userId,
          userEmail,
          timestamp: new Date(),
          type: 'workflow_step',
          message: `⏳ Waiting ${waitDisplay} before sending upsell...`
        };
        setNotifications(prev => [...prev, waitNotification]);

        await new Promise(resolve => setTimeout(resolve, waitDurationMs));
        
        console.log(`✅ [Workflow Engine] Wait completed. Proceeding to upsell...`);
      }

      // 7. Execute Upsell Send
      const upsellOfferName = upsellActionNode?.data?.productName || 
                              upsellActionNode?.data?.offerName || 
                              'Exclusive Upsell Offer';
      const upsellProductId = upsellActionNode?.data?.productId || '';
      const upsellOfferId = upsellActionNode?.data?.offerId;
      const upsellMarketingCopy = upsellChannelNode?.data?.channelContent?.email?.text || 
        `Thanks for buying! Here is a special 50% OFF addon just for you: ${upsellOfferName}`;

      // ✅ Fix: Try to fetch userEmail from campaign_logs if not provided
      let finalUserEmail = userEmail;
      if (!finalUserEmail) {
        console.warn(`[Workflow Engine] No user email provided, attempting to fetch from campaign_logs...`);
        try {
          const { data: logs } = await supabase
            .from('campaign_logs')
            .select('metadata')
            .eq('campaign_id', campaignId)
            .eq('user_id', userId)
            .eq('action_type', 'send')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          if (logs?.metadata) {
            const metadata = typeof logs.metadata === 'string' ? JSON.parse(logs.metadata) : logs.metadata;
            finalUserEmail = metadata?.email_sent_to || metadata?.user_email;
            console.log(`[Workflow Engine] Found user email from logs: ${finalUserEmail}`);
          }
        } catch (e) {
          console.warn(`[Workflow Engine] Failed to fetch email from logs:`, e);
        }
      }
      
      if (!finalUserEmail) {
        console.error(`[Workflow Engine] ❌ No user email found, cannot send upsell. Workflow aborted.`);
        const errorNotification: ConversionNotification = {
          id: `workflow-error-email-${campaignId}-${Date.now()}`,
          campaignId,
          campaignName,
          userId,
          userEmail: undefined,
          timestamp: new Date(),
          type: 'workflow_step',
          message: `⚠️ Workflow error: No user email found, cannot send upsell`
        };
        setNotifications(prev => [...prev, errorNotification]);
        return;
      }
      
      // Use finalUserEmail for the rest of the workflow
      userEmail = finalUserEmail;

      console.log(`🚀 [Workflow Engine] Executing Upsell Send to ${userEmail}...`);

      // Generate magic link for upsell
      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173';
      const upsellMagicLink = upsellOfferId
        ? `${origin}/offer/${upsellOfferId}?campaignId=${campaignId}&userId=${userId}&productId=${upsellProductId}`
        : `${origin}/campaign/${campaignId}/${userId}/${upsellProductId}`;

      // Send upsell email
      const emailResult = await emailService.sendMarketingEmail(
        userEmail,
        `🎁 ${upsellOfferName} - Exclusive Upsell`,
        'Hi there!',
        upsellMarketingCopy,
        upsellMagicLink,
        'Claim Upsell Offer'
      ) as { success: boolean; messageId?: string; isMock?: boolean };

      if (emailResult?.success) {
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

        // Add upsell sent notification
        const upsellNotification: ConversionNotification = {
          id: `upsell-sent-${campaignId}-${Date.now()}`,
          campaignId,
          campaignName,
          userId,
          userEmail,
          timestamp: new Date(),
          type: 'upsell_sent',
          message: `📧 Upsell offer "${upsellOfferName}" sent to ${userEmail}`
        };
        setNotifications(prev => [...prev, upsellNotification]);

        console.log(`✅ [Workflow Engine] Upsell email sent successfully to ${userEmail}`);
        
        // Auto-remove upsell notification after 10 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== upsellNotification.id));
        }, 10000);
      } else {
        throw new Error('Failed to send upsell email');
      }

    } catch (err: any) {
      console.error('[Workflow Engine] Error in Post-Purchase Workflow:', err);
      const errorNotification: ConversionNotification = {
        id: `workflow-error-${campaignId}-${Date.now()}`,
        campaignId,
        campaignName,
        userId,
        userEmail,
        timestamp: new Date(),
        type: 'workflow_step',
        message: `⚠️ Workflow error: ${err.message}`
      };
      setNotifications(prev => [...prev, errorNotification]);
    } finally {
      // ✅ Fix: Ensure workflow key is removed even if error occurs
      // Note: This is a safety net, the caller's finally block should also handle this
      const workflowKey = `${campaignId}-${userId}-workflow`;
      executingWorkflows.current.delete(workflowKey);
      console.log(`[Workflow Engine] Workflow execution finished (success or error) for ${workflowKey}`);
    }
  };

  /**
   * ✅ Helper: Convert wait duration to milliseconds (Normal time scale)
   * ✅ Task 2: Ensure robust unit parsing with demo-friendly fallback
   */
  const convertWaitDurationToMilliseconds = (
    value: number | string | undefined,
    unit: string | undefined
  ): number => {
    const numValue = typeof value === 'string' ? parseFloat(value) : (value || 0);
    
    // ✅ Task 2: If unit is undefined or invalid, default to 10 seconds (demo-friendly)
    if (!unit || numValue <= 0) {
      console.warn(`[Workflow Engine] Invalid wait duration (value: ${value}, unit: ${unit}), defaulting to 10 seconds`);
      return 10000; // 10 seconds default
    }
    
    switch (unit.toLowerCase()) {
      case 'minutes':
        return numValue * 60 * 1000; // minutes to milliseconds
      case 'hours':
        return numValue * 60 * 60 * 1000; // hours to milliseconds
      case 'days':
        return numValue * 24 * 60 * 60 * 1000; // days to milliseconds
      case 'weeks':
        return numValue * 7 * 24 * 60 * 60 * 1000; // weeks to milliseconds
      default:
        console.warn(`[Workflow Engine] Unknown unit "${unit}", defaulting to 10 seconds`);
        return 10000; // Default 10 seconds for demo
    }
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      channelRefs.current.forEach(channel => channel.unsubscribe());
      channelRefs.current.clear();
    };
  }, []);

  /**
   * Remove a notification manually
   */
  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return {
    notifications,
    handleCampaignActivated,
    subscribeToCampaign,
    unsubscribeFromCampaign,
    updateCampaignConversion,
    removeNotification
  };
};

