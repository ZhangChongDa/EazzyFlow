import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { SegmentCriteria } from './useAudienceEstimator';

export interface UserSegment {
  id: string;
  name: string;
  description?: string;
  criteria: SegmentCriteria;
  estimated_size: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * Hook for managing user segments (saved audience groups)
 */
export const useUserSegments = () => {
  const [segments, setSegments] = useState<UserSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all segments
  const fetchSegments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_segments')
        .select('*')
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSegments(data || []);
    } catch (err: any) {
      console.error('Error fetching segments:', err);
      setError(err.message || 'Failed to fetch segments');
      setSegments([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new segment
  const createSegment = useCallback(async (
    name: string,
    criteria: SegmentCriteria,
    description?: string,
    estimatedSize: number = 0
  ): Promise<UserSegment | null> => {
    try {
      setError(null);
      const { data, error: createError } = await supabase
        .from('user_segments')
        .insert({
          name: name.trim(),
          description: description?.trim() || null,
          criteria: criteria as any,
          estimated_size: estimatedSize
        })
        .select()
        .single();

      if (createError) throw createError;
      
      if (data) {
        setSegments(prev => [data, ...prev]);
        return data;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating segment:', err);
      setError(err.message || 'Failed to create segment');
      return null;
    }
  }, []);

  // Update a segment
  const updateSegment = useCallback(async (
    id: string,
    updates: Partial<Pick<UserSegment, 'name' | 'description' | 'criteria' | 'estimated_size'>>
  ): Promise<boolean> => {
    try {
      setError(null);
      const updateData: any = {};
      if (updates.name !== undefined) updateData.name = updates.name.trim();
      if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
      if (updates.criteria !== undefined) updateData.criteria = updates.criteria as any;
      if (updates.estimated_size !== undefined) updateData.estimated_size = updates.estimated_size;

      const { error: updateError } = await supabase
        .from('user_segments')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setSegments(prev => prev.map(seg => 
        seg.id === id ? { ...seg, ...updates } : seg
      ));
      return true;
    } catch (err: any) {
      console.error('Error updating segment:', err);
      setError(err.message || 'Failed to update segment');
      return false;
    }
  }, []);

  // Delete a segment
  const deleteSegment = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('user_segments')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setSegments(prev => prev.filter(seg => seg.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting segment:', err);
      setError(err.message || 'Failed to delete segment');
      return false;
    }
  }, []);

  // Get a segment by ID
  const getSegmentById = useCallback(async (id: string): Promise<UserSegment | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_segments')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;
      return data;
    } catch (err: any) {
      console.error('Error fetching segment:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    fetchSegments();
  }, [fetchSegments]);

  return {
    segments,
    loading,
    error,
    fetchSegments,
    createSegment,
    updateSegment,
    deleteSegment,
    getSegmentById
  };
};

