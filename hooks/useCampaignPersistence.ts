import { useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { Node, Edge } from '@xyflow/react';

/**
 * Hook for campaign persistence (Save & Load)
 * 
 * Features:
 * - Load campaign from database by ID
 * - Save campaign flow_definition to database
 * - Handle new vs existing campaigns
 * - Error handling and user feedback
 */
export const useCampaignPersistence = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load campaign from database
   * @param campaignId - Campaign ID to load (if null, returns empty flow)
   */
  const loadCampaign = useCallback(async (campaignId: string | null): Promise<{ nodes: Node[]; edges: Edge[] } | null> => {
    if (!campaignId) {
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // Fetch campaign
      const { data, error: fetchError } = await supabase
        .from('campaigns')
        .select('flow_definition, name, status')
        .eq('id', campaignId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      if (!data || !data.flow_definition) {
        return null;
      }

      const flowDefinition = data.flow_definition as { nodes?: Node[]; edges?: Edge[] };

      return {
        nodes: flowDefinition.nodes || [],
        edges: flowDefinition.edges || []
      };
    } catch (err: any) {
      console.error('Error loading campaign:', err);
      setError(err.message || 'Failed to load campaign');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Generate a robust UUID on the client side
   */
  const generateUUID = (): string => {
    // Try crypto.randomUUID() first (modern browsers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  };

  /**
   * Save campaign to database
   * @param campaignId - Campaign ID (if null, creates new campaign with generated UUID)
   * @param nodes - Flow nodes
   * @param edges - Flow edges
   * @param campaignName - Campaign name (optional)
   * @param status - Campaign status (default: 'draft')
   */
  const saveCampaign = useCallback(async (
    campaignId: string | null,
    nodes: Node[],
    edges: Edge[],
    campaignName?: string,
    status: 'draft' | 'active' | 'paused' = 'draft',
    demoEmails?: string[] // ✅ Fix-5: Support saving demo emails
  ): Promise<{ success: boolean; campaignId?: string; error?: string }> => {
    setSaving(true);
    setError(null);

    try {
      // Check session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        throw new Error('User not authenticated');
      }

      // 1. 如果没有 ID，生成一个新的 UUID
      // ⚠️ 修复 400 Bad Request (null id) 错误
      const finalId = campaignId && !campaignId.startsWith('sim-')
        ? campaignId
        : generateUUID();

      // 2. 准备数据 (清理 icon 组件，只存字符串)
      const cleanNodes = nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          // 确保保存进去的是字符串 key，而不是组件对象
          icon: typeof n.data.icon === 'string' ? n.data.icon : 'zap'
        }
      }));

      // ✅ Fix: If updating existing campaign, preserve existing metadata
      let existingMetadata = {};
      if (campaignId) {
        const { data: existingCampaign } = await supabase
          .from('campaigns')
          .select('flow_definition')
          .eq('id', campaignId)
          .single();
        
        if (existingCampaign?.flow_definition) {
          const existingFlowDef = existingCampaign.flow_definition as any;
          existingMetadata = existingFlowDef.metadata || {};
        }
      }

      const flowDefinition: any = {
        nodes: cleanNodes,
        edges
      };
      
      // ✅ Fix-5: Save demo emails in flow_definition metadata
      // Preserve existing metadata and merge with new demoEmails
      if (demoEmails && demoEmails.length > 0) {
        flowDefinition.metadata = {
          ...existingMetadata,
          demoEmails: demoEmails.filter(email => email.trim().length > 0)
        };
      } else if (Object.keys(existingMetadata).length > 0) {
        // Preserve existing metadata even if no new demoEmails provided
        flowDefinition.metadata = existingMetadata;
      }

      const campaignData: any = {
        id: finalId, // ✅ Explicitly include ID in payload
        flow_definition: flowDefinition,
        status,
        name: campaignName || `Campaign ${new Date().toLocaleDateString()}`,
        updated_at: new Date().toISOString()
      };

      let result;

      if (campaignId) {
        // Update existing campaign
        const { data, error: updateError } = await supabase
          .from('campaigns')
          .update({
            flow_definition: campaignData.flow_definition,
            status: campaignData.status,
            updated_at: campaignData.updated_at,
            ...(campaignName && { name: campaignData.name })
          })
          .eq('id', campaignId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        result = { success: true, campaignId: data.id };
      } else {
        // ✅ Fix: Create new campaign with explicit ID
        campaignData.created_at = new Date().toISOString();

        const { data, error: insertError } = await supabase
          .from('campaigns')
          .insert(campaignData)
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        result = { success: true, campaignId: data.id };
      }

      setError(null);
      return result;
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      const errorMessage = err.message || 'Failed to save campaign';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setSaving(false);
    }
  }, []);

  /**
   * Get campaign ID from URL or return null
   */
  const getCampaignIdFromUrl = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;

    const params = new URLSearchParams(window.location.search);
    const campaignId = params.get('campaignId');
    return campaignId;
  }, []);

  /**
   * Update URL with campaign ID
   */
  const updateUrlWithCampaignId = useCallback((campaignId: string) => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    url.searchParams.set('campaignId', campaignId);
    window.history.replaceState({}, '', url.toString());
  }, []);

  return {
    loadCampaign,
    saveCampaign,
    getCampaignIdFromUrl,
    updateUrlWithCampaignId,
    loading,
    saving,
    error
  };
};

