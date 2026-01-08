import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { SegmentCriteria } from './useAudienceEstimator';

export interface FilteredUser {
  id: string;
  msisdn: string;
  name: string;
  age?: number;
  gender?: string;
  tier: string;
  status: string;
  device_type?: string;
  location_city?: string;
  arpu_30d: number;
  balance: number;
  tags?: string[];
}

/**
 * Hook for filtering users based on criteria
 * This builds and executes Supabase queries based on SegmentCriteria
 */
export const useAudienceFilter = (criteria: SegmentCriteria | undefined) => {
  const [users, setUsers] = useState<FilteredUser[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFilteredUsers = useCallback(async () => {
    if (!criteria) {
      setUsers([]);
      setCount(0);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Start building query
      let query = supabase
        .from('profiles')
        .select('*, user_tag_assignments(tag_id, user_tags(name))', { count: 'exact' });

      // Handle custom filters first (they may require async queries)
      const customFilters = (criteria as any)._customFilters || [];
      let userIdsFromCustomFilters: string[] | null = null;

      // Data Usage Level filter - requires aggregation from telecom_usage
      const dataUsageFilter = customFilters.find((f: any) => f.category === 'data_usage');
      if (dataUsageFilter) {
        // Get users with data usage matching the criteria
        // Aggregate data usage per user from telecom_usage table
        const { data: usageData, error: usageError } = await supabase
          .from('telecom_usage')
          .select('user_id, volume_mb, amount')
          .eq('type', 'Data')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (!usageError && usageData && usageData.length > 0) {
          // Aggregate usage per user
          const userUsage: Record<string, number> = {};
          usageData.forEach((u: any) => {
            const usage = parseFloat(u.volume_mb || u.amount || 0);
            userUsage[u.user_id] = (userUsage[u.user_id] || 0) + usage;
          });

          // Filter users based on usage threshold
          const threshold = parseFloat(dataUsageFilter.value as string);
          const matchingUserIds: string[] = [];
          
          Object.entries(userUsage).forEach(([userId, totalUsage]) => {
            let matches = false;
            switch (dataUsageFilter.operator) {
              case '>':
                matches = totalUsage > threshold;
                break;
              case '>=':
                matches = totalUsage >= threshold;
                break;
              case '<':
                matches = totalUsage < threshold;
                break;
              case '<=':
                matches = totalUsage <= threshold;
                break;
              case '=':
                matches = Math.abs(totalUsage - threshold) < 0.01; // Allow small floating point differences
                break;
            }
            if (matches) {
              matchingUserIds.push(userId);
            }
          });

          if (matchingUserIds.length > 0) {
            userIdsFromCustomFilters = matchingUserIds;
          } else {
            // No users match, return empty result
            setUsers([]);
            setCount(0);
            setLoading(false);
            return;
          }
        } else {
          // No usage data or error, return empty result
          setUsers([]);
          setCount(0);
          setLoading(false);
          return;
        }
      }

      // Voice MOU filter - requires aggregation from telecom_usage
      const voiceMouFilter = customFilters.find((f: any) => f.category === 'voice_mou');
      if (voiceMouFilter) {
        // Get users with voice usage matching the criteria
        const { data: usageData, error: usageError } = await supabase
          .from('telecom_usage')
          .select('user_id, duration_sec, amount')
          .eq('type', 'Voice')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (!usageError && usageData && usageData.length > 0) {
          // Aggregate voice usage per user (convert seconds to minutes)
          const userUsage: Record<string, number> = {};
          usageData.forEach((u: any) => {
            const usageMinutes = parseFloat(u.duration_sec || u.amount || 0) / 60; // Convert to minutes
            userUsage[u.user_id] = (userUsage[u.user_id] || 0) + usageMinutes;
          });

          // Filter users based on usage threshold
          const threshold = parseFloat(voiceMouFilter.value as string);
          const matchingUserIds: string[] = [];
          
          Object.entries(userUsage).forEach(([userId, totalUsage]) => {
            let matches = false;
            switch (voiceMouFilter.operator) {
              case '>':
                matches = totalUsage > threshold;
                break;
              case '>=':
                matches = totalUsage >= threshold;
                break;
              case '<':
                matches = totalUsage < threshold;
                break;
              case '<=':
                matches = totalUsage <= threshold;
                break;
              case '=':
                matches = Math.abs(totalUsage - threshold) < 0.01;
                break;
            }
            if (matches) {
              matchingUserIds.push(userId);
            }
          });

          if (matchingUserIds.length > 0) {
            // Intersect with existing filter results if any
            if (userIdsFromCustomFilters) {
              userIdsFromCustomFilters = userIdsFromCustomFilters.filter(id => matchingUserIds.includes(id));
            } else {
              userIdsFromCustomFilters = matchingUserIds;
            }
          } else {
            // No users match, return empty result
            setUsers([]);
            setCount(0);
            setLoading(false);
            return;
          }
        } else {
          // No usage data or error, return empty result
          setUsers([]);
          setCount(0);
          setLoading(false);
          return;
        }
      }

      // Recharge Freq filter - requires aggregation from billing_transactions
      const rechargeFreqFilter = customFilters.find((f: any) => f.category === 'recharge_freq');
      if (rechargeFreqFilter) {
        // Get users with recharge frequency matching the criteria
        const { data: transactionData, error: transactionError } = await supabase
          .from('billing_transactions')
          .select('user_id')
          .eq('type', 'Topup')
          .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

        if (!transactionError && transactionData && transactionData.length > 0) {
          // Count transactions per user
          const userTransactionCount: Record<string, number> = {};
          transactionData.forEach((t: any) => {
            userTransactionCount[t.user_id] = (userTransactionCount[t.user_id] || 0) + 1;
          });

          // Filter users based on transaction count threshold
          const threshold = parseFloat(rechargeFreqFilter.value as string);
          const matchingUserIds: string[] = [];
          
          Object.entries(userTransactionCount).forEach(([userId, count]) => {
            let matches = false;
            switch (rechargeFreqFilter.operator) {
              case '>':
                matches = count > threshold;
                break;
              case '>=':
                matches = count >= threshold;
                break;
              case '<':
                matches = count < threshold;
                break;
              case '<=':
                matches = count <= threshold;
                break;
              case '=':
                matches = count === threshold;
                break;
            }
            if (matches) {
              matchingUserIds.push(userId);
            }
          });

          if (matchingUserIds.length > 0) {
            // Intersect with existing filter results if any
            if (userIdsFromCustomFilters) {
              userIdsFromCustomFilters = userIdsFromCustomFilters.filter(id => matchingUserIds.includes(id));
            } else {
              userIdsFromCustomFilters = matchingUserIds;
            }
          } else {
            // No users match, return empty result
            setUsers([]);
            setCount(0);
            setLoading(false);
            return;
          }
        } else {
          // No transaction data or error, return empty result
          setUsers([]);
          setCount(0);
          setLoading(false);
          return;
        }
      }

      // Device Type filter (can be applied directly to query)
      const deviceTypeFilter = customFilters.find((f: any) => f.category === 'device_type');
      if (deviceTypeFilter) {
        if (deviceTypeFilter.operator === 'is') {
          query = query.ilike('device_type', `%${deviceTypeFilter.value}%`);
        }
      }

      // Apply user IDs from custom filters if any
      if (userIdsFromCustomFilters && userIdsFromCustomFilters.length > 0) {
        query = query.in('id', userIdsFromCustomFilters);
      } else if (userIdsFromCustomFilters && userIdsFromCustomFilters.length === 0) {
        // Custom filters returned empty result
        setUsers([]);
        setCount(0);
        setLoading(false);
        return;
      }

      // Apply basic filters from SegmentCriteria
      if (criteria.tier) {
        query = query.eq('tier', criteria.tier);
      }

      if (criteria.city) {
        query = query.eq('location_city', criteria.city);
      }

      if (criteria.gender && criteria.gender !== 'All') {
        query = query.eq('gender', criteria.gender);
      }

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

      if (criteria.arpu?.min) {
        const arpuMin = parseFloat(criteria.arpu.min);
        if (!isNaN(arpuMin)) {
          query = query.gte('arpu_30d', arpuMin);
        }
      }

      if (criteria.arpu?.max) {
        const arpuMax = parseFloat(criteria.arpu.max);
        if (!isNaN(arpuMax)) {
          query = query.lte('arpu_30d', arpuMax);
        }
      }

      if (criteria.balance?.min) {
        const balanceMin = parseFloat(criteria.balance.min);
        if (!isNaN(balanceMin)) {
          query = query.gte('balance', balanceMin);
        }
      }

      if (criteria.balance?.max) {
        const balanceMax = parseFloat(criteria.balance.max);
        if (!isNaN(balanceMax)) {
          query = query.lte('balance', balanceMax);
        }
      }

      // Status filter (from activityType)
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

      // Tags filter - requires joining with user_tag_assignments
      if (criteria.tags && criteria.tags.length > 0) {
        // Get tag IDs from tag names
        const { data: tagData } = await supabase
          .from('user_tags')
          .select('id')
          .in('name', criteria.tags);

        if (tagData && tagData.length > 0) {
          const tagIds = tagData.map(t => t.id);
          
          // Get user IDs that have these tags
          const { data: assignmentData } = await supabase
            .from('user_tag_assignments')
            .select('user_id')
            .in('tag_id', tagIds);

          if (assignmentData && assignmentData.length > 0) {
            const userIds = [...new Set(assignmentData.map(a => a.user_id))];
            query = query.in('id', userIds);
          } else {
            // No users have these tags, return empty result
            setUsers([]);
            setCount(0);
            setLoading(false);
            return;
          }
        }
      }

      // Execute query
      const { data, error: queryError, count: totalCount } = await query;

      if (queryError) throw queryError;

      // Transform data
      const transformedUsers: FilteredUser[] = (data || []).map((profile: any) => {
        const tags = (profile.user_tag_assignments || [])
          .map((assignment: any) => assignment.user_tags?.name)
          .filter(Boolean);

        return {
          id: profile.id,
          msisdn: profile.msisdn,
          name: profile.name,
          age: profile.age,
          gender: profile.gender,
          tier: profile.tier,
          status: profile.status,
          device_type: profile.device_type,
          location_city: profile.location_city,
          arpu_30d: profile.arpu_30d || 0,
          balance: parseFloat(profile.balance || 0),
          tags
        };
      });

      setUsers(transformedUsers);
      setCount(totalCount || 0);
    } catch (err: any) {
      console.error('Error filtering users:', err);
      setError(err.message || 'Failed to filter users');
      setUsers([]);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [criteria]);

  useEffect(() => {
    fetchFilteredUsers();
  }, [fetchFilteredUsers]);

  return {
    users,
    count,
    loading,
    error,
    refetch: fetchFilteredUsers
  };
};

