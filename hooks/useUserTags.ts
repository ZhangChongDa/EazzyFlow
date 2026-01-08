import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

export interface UserTag {
  id: string;
  name: string;
  category: string;
  color: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface UserTagAssignment {
  id: string;
  user_id: string;
  tag_id: string;
  assigned_at?: string;
}

/**
 * Hook for managing user tags
 * Provides CRUD operations for tags and tag assignments
 */
export const useUserTags = () => {
  const [tags, setTags] = useState<UserTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all tags
  const fetchTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('user_tags')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;
      setTags(data || []);
    } catch (err: any) {
      console.error('Error fetching tags:', err);
      setError(err.message || 'Failed to fetch tags');
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new tag
  const createTag = useCallback(async (
    name: string,
    category: string = 'Custom',
    color: string = '#6366f1',
    description?: string
  ): Promise<UserTag | null> => {
    try {
      setError(null);
      const { data, error: createError } = await supabase
        .from('user_tags')
        .insert({
          name: name.trim(),
          category,
          color,
          description: description?.trim() || null
        })
        .select()
        .single();

      if (createError) throw createError;
      
      if (data) {
        setTags(prev => [...prev, data].sort((a, b) => {
          if (a.category !== b.category) return a.category.localeCompare(b.category);
          return a.name.localeCompare(b.name);
        }));
        return data;
      }
      return null;
    } catch (err: any) {
      console.error('Error creating tag:', err);
      setError(err.message || 'Failed to create tag');
      return null;
    }
  }, []);

  // Update a tag
  const updateTag = useCallback(async (
    id: string,
    updates: Partial<Pick<UserTag, 'name' | 'category' | 'color' | 'description'>>
  ): Promise<boolean> => {
    try {
      setError(null);
      const { error: updateError } = await supabase
        .from('user_tags')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;
      
      setTags(prev => prev.map(tag => 
        tag.id === id ? { ...tag, ...updates } : tag
      ));
      return true;
    } catch (err: any) {
      console.error('Error updating tag:', err);
      setError(err.message || 'Failed to update tag');
      return false;
    }
  }, []);

  // Delete a tag
  const deleteTag = useCallback(async (id: string): Promise<boolean> => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('user_tags')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      setTags(prev => prev.filter(tag => tag.id !== id));
      return true;
    } catch (err: any) {
      console.error('Error deleting tag:', err);
      setError(err.message || 'Failed to delete tag');
      return false;
    }
  }, []);

  // Assign tag to user(s)
  const assignTagToUsers = useCallback(async (
    tagId: string,
    userIds: string[]
  ): Promise<boolean> => {
    try {
      setError(null);
      const assignments = userIds.map(userId => ({
        user_id: userId,
        tag_id: tagId
      }));

      const { error: assignError } = await supabase
        .from('user_tag_assignments')
        .upsert(assignments, { onConflict: 'user_id,tag_id' });

      if (assignError) throw assignError;
      return true;
    } catch (err: any) {
      console.error('Error assigning tag:', err);
      setError(err.message || 'Failed to assign tag');
      return false;
    }
  }, []);

  // Remove tag from user(s)
  const removeTagFromUsers = useCallback(async (
    tagId: string,
    userIds: string[]
  ): Promise<boolean> => {
    try {
      setError(null);
      const { error: removeError } = await supabase
        .from('user_tag_assignments')
        .delete()
        .eq('tag_id', tagId)
        .in('user_id', userIds);

      if (removeError) throw removeError;
      return true;
    } catch (err: any) {
      console.error('Error removing tag:', err);
      setError(err.message || 'Failed to remove tag');
      return false;
    }
  }, []);

  // Get tags for a specific user
  const getUserTags = useCallback(async (userId: string): Promise<UserTag[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_tag_assignments')
        .select(`
          tag_id,
          user_tags (*)
        `)
        .eq('user_id', userId);

      if (fetchError) throw fetchError;
      
      return (data || [])
        .map((item: any) => item.user_tags)
        .filter(Boolean) as UserTag[];
    } catch (err: any) {
      console.error('Error fetching user tags:', err);
      return [];
    }
  }, []);

  // Get users with a specific tag
  const getUsersWithTag = useCallback(async (tagId: string): Promise<string[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_tag_assignments')
        .select('user_id')
        .eq('tag_id', tagId);

      if (fetchError) throw fetchError;
      
      return (data || []).map((item: any) => item.user_id);
    } catch (err: any) {
      console.error('Error fetching users with tag:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    fetchTags,
    createTag,
    updateTag,
    deleteTag,
    assignTagToUsers,
    removeTagFromUsers,
    getUserTags,
    getUsersWithTag
  };
};

