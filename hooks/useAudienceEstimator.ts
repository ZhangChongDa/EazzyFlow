import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';

// ✅ Feature 1: Segment Condition for Advanced Logic Mode
export type SegmentCondition = {
  id: string;
  field: string; // 'age', 'city', 'tier', 'arpu_30d', 'churn_score', 'created_at', 'active_status', etc.
  operator: string; // '>', '<', '=', '>=', '<=', 'in', 'contains'
  value: string | number | string[]; // Support single value or array for 'in' operator
};

export type SegmentConditionGroup = {
  id: string;
  conditions: SegmentCondition[];
  operator: 'AND' | 'OR'; // Within group operator
  groupOperator?: 'AND' | 'OR'; // Between groups operator (for next group)
};

export type SegmentCriteria = {
  // Legacy fields (for backward compatibility)
  ageMin?: string;
  ageMax?: string;
  gender?: string;
  city?: string;
  simType?: string;
  tier?: string;
  activityType?: string;
  activityOperator?: string;
  activityValue?: string;
  arpu?: { min?: string; max?: string };
  balance?: { min?: string; max?: string };
  tags?: string[];
  
  // ✅ Feature 1: Advanced Logic Mode - Condition Groups
  conditionGroups?: SegmentConditionGroup[];
};

/**
 * Hook for real-time audience estimation
 * 
 * When segmentCriteria changes, this hook automatically queries Supabase
 * to get the actual count of matching users.
 * 
 * Features:
 * - Debounced queries (500ms) to prevent flickering
 * - Automatic query building from SegmentCriteria
 * - Loading state management
 * - Error handling
 */
export const useAudienceEstimator = (criteria: SegmentCriteria | undefined) => {
  const [audienceSize, setAudienceSize] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Feature 3: Helper to calculate Active Status from billing_transactions and telecom_usage
  const calculateActiveStatus = async (userId: string): Promise<'Active' | 'Inactive' | 'Dormant'> => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Check recent billing transactions (last 30 days)
    const { data: recentTransactions } = await supabase
      .from('billing_transactions')
      .select('timestamp')
      .eq('user_id', userId)
      .gte('timestamp', thirtyDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    // Check recent telecom usage (last 7 days)
    const { data: recentUsage } = await supabase
      .from('telecom_usage')
      .select('timestamp')
      .eq('user_id', userId)
      .gte('timestamp', sevenDaysAgo.toISOString())
      .order('timestamp', { ascending: false })
      .limit(1);

    const hasRecentTransaction = recentTransactions && recentTransactions.length > 0;
    const hasRecentUsage = recentUsage && recentUsage.length > 0;

    if (hasRecentTransaction || hasRecentUsage) {
      return 'Active';
    } else if (hasRecentTransaction && !hasRecentUsage) {
      // Has transaction but no usage in last 7 days
      return 'Inactive';
    } else {
      // No activity in last 30 days
      return 'Dormant';
    }
  };

  // ✅ Opt-2: Build query from condition groups (Advanced Logic Mode) - Support AND/OR between groups
  const buildQueryFromConditionGroups = useCallback((groups: SegmentConditionGroup[]) => {
    // ✅ Opt-2: Each group represents a target customer profile
    // Groups are combined with AND (intersection) by default
    // If groupOperator is 'OR', we need to fetch multiple queries and union them
    
    if (groups.length === 0) {
      return supabase.from('profiles').select('*', { count: 'exact', head: true });
    }

    // Helper function to build a query for a single group (returns query builder)
    const buildSingleGroupQuery = (group: SegmentConditionGroup) => {
      let query = supabase.from('profiles').select('id'); // ✅ Fix: Select 'id' for OR union calculation
      
      if (group.conditions.length === 0) return query;

      // Process conditions within the group
      // If operator is 'OR', we need to handle it differently (Supabase limitation)
      // For now, we'll use AND logic within a group (most common case)
      group.conditions.forEach((condition) => {
        if (!condition.field || condition.value === '' || condition.value === null) return;

        switch (condition.field) {
          case 'age':
            const ageVal = Number(condition.value);
            if (!isNaN(ageVal)) {
              if (condition.operator === '>') query = query.gt('age', ageVal);
              else if (condition.operator === '<') query = query.lt('age', ageVal);
              else if (condition.operator === '>=') query = query.gte('age', ageVal);
              else if (condition.operator === '<=') query = query.lte('age', ageVal);
              else if (condition.operator === '=') query = query.eq('age', ageVal);
            }
            break;
          case 'city':
            if (condition.operator === 'in' && Array.isArray(condition.value)) {
              query = query.in('location_city', condition.value);
            } else if (condition.operator === '=') {
              query = query.eq('location_city', condition.value);
            }
            break;
          case 'tier':
            if (condition.operator === 'in' && Array.isArray(condition.value)) {
              query = query.in('tier', condition.value);
            } else if (condition.operator === '=') {
              query = query.eq('tier', condition.value);
            }
            break;
          case 'arpu_30d':
            const arpuVal = Number(condition.value);
            if (!isNaN(arpuVal)) {
              if (condition.operator === '>') query = query.gt('arpu_30d', arpuVal);
              else if (condition.operator === '<') query = query.lt('arpu_30d', arpuVal);
              else if (condition.operator === '>=') query = query.gte('arpu_30d', arpuVal);
              else if (condition.operator === '<=') query = query.lte('arpu_30d', arpuVal);
              else if (condition.operator === '=') query = query.eq('arpu_30d', arpuVal);
            }
            break;
          case 'churn_score':
            const churnVal = Number(condition.value);
            if (!isNaN(churnVal)) {
              if (condition.operator === '>') query = query.gt('churn_score', churnVal);
              else if (condition.operator === '<') query = query.lt('churn_score', churnVal);
              else if (condition.operator === '>=') query = query.gte('churn_score', churnVal);
              else if (condition.operator === '<=') query = query.lte('churn_score', churnVal);
              else if (condition.operator === '=') query = query.eq('churn_score', churnVal);
            }
            break;
          case 'created_at':
            // Tenure: days since registration
            const tenureDays = Number(condition.value);
            if (!isNaN(tenureDays)) {
              const targetDate = new Date();
              targetDate.setDate(targetDate.getDate() - tenureDays);
              if (condition.operator === '>') query = query.lt('created_at', targetDate.toISOString());
              else if (condition.operator === '<') query = query.gt('created_at', targetDate.toISOString());
              else if (condition.operator === '>=') query = query.lte('created_at', targetDate.toISOString());
              else if (condition.operator === '<=') query = query.gte('created_at', targetDate.toISOString());
            }
            break;
          case 'active_status':
            // ✅ Feature 3: Active Status calculation
            // Active Status is calculated based on:
            // - Active: Has billing_transactions in last 30 days OR telecom_usage in last 7 days
            // - Inactive: Has billing_transactions but no telecom_usage in last 7 days
            // - Dormant: No activity in last 30 days
            // 
            // Note: For production, this should be implemented as a database view or computed column
            // For demo, we use the status field in profiles table as an approximation
            // Full implementation would require:
            // 1. Query billing_transactions for last 30 days
            // 2. Query telecom_usage for last 7 days
            // 3. Calculate status for each user
            // 4. Filter by calculated status
            if (condition.operator === '=') {
              // Map Active Status to profiles.status field
              const statusMap: Record<string, string> = {
                'Active': 'Active',
                'Inactive': 'Inactive',
                'Dormant': 'Inactive' // Dormant users are also marked as Inactive in profiles
              };
              const mappedStatus = statusMap[condition.value as string] || condition.value;
              query = query.eq('status', mappedStatus);
            }
            break;
          case 'gender':
            if (condition.operator === '=') {
              query = query.eq('gender', condition.value);
            }
            break;
          case 'balance':
            const balanceVal = Number(condition.value);
            if (!isNaN(balanceVal)) {
              if (condition.operator === '>') query = query.gt('balance', balanceVal);
              else if (condition.operator === '<') query = query.lt('balance', balanceVal);
              else if (condition.operator === '>=') query = query.gte('balance', balanceVal);
              else if (condition.operator === '<=') query = query.lte('balance', balanceVal);
              else if (condition.operator === '=') query = query.eq('balance', balanceVal);
            }
            break;
          case 'sim_type':
            // Note: sim_type might not exist in profiles table, may need to check schema
            if (condition.operator === '=') {
              // query = query.eq('sim_type', condition.value); // Uncomment if column exists
            }
            break;
          case 'app_usage':
            // ✅ Opt-7: App Usage filter from telecom_usage metadata
            // This requires a join or subquery, which Supabase supports
            // For now, we'll use a simplified approach: filter by checking if user has usage records
            // In production, this should be a proper join or database view
            if (condition.operator === '=') {
              // Note: This is a simplified implementation
              // Full implementation would require:
              // 1. Query telecom_usage for users with matching app_name in metadata
              // 2. Filter profiles by those user_ids
              // For demo, we'll skip this filter for now (TODO: Implement proper join)
            }
            break;
          case 'user_tags':
            // ✅ Opt-8: User Tags filter
            // This requires a tags table or JSONB column in profiles
            // For now, we'll skip this filter (TODO: Implement when tags system is ready)
            if (condition.operator === 'in' && Array.isArray(condition.value)) {
              // query = query.contains('tags', condition.value); // If tags is JSONB array
            }
            break;
        }
      });
      
      return query;
    };

    // ✅ Fix: Determine if we need OR logic (union) or AND logic (intersection)
    // Check if any group has groupOperator === 'OR'
    const hasOrLogic = groups.some((group, idx) => {
      if (idx === 0) return false; // First group has no previous groupOperator
      return group.groupOperator === 'OR';
    });

    // If all groups use AND logic (intersection), combine all conditions into one query
    if (!hasOrLogic) {
      let combinedQuery = supabase.from('profiles').select('*', { count: 'exact', head: true });
      
      // Process all groups with AND logic (intersection)
      for (const group of groups) {
        if (group.conditions.length === 0) continue;
        
        // Apply all conditions from this group to the combined query
        group.conditions.forEach((condition) => {
          if (!condition.field || condition.value === '' || condition.value === null) return;
          
          // Apply condition logic (same as in buildSingleGroupQuery)
          switch (condition.field) {
            case 'age':
              const ageVal = Number(condition.value);
              if (!isNaN(ageVal)) {
                if (condition.operator === '>') combinedQuery = combinedQuery.gt('age', ageVal);
                else if (condition.operator === '<') combinedQuery = combinedQuery.lt('age', ageVal);
                else if (condition.operator === '>=') combinedQuery = combinedQuery.gte('age', ageVal);
                else if (condition.operator === '<=') combinedQuery = combinedQuery.lte('age', ageVal);
                else if (condition.operator === '=') combinedQuery = combinedQuery.eq('age', ageVal);
              }
              break;
            case 'city':
              if (condition.operator === 'in' && Array.isArray(condition.value)) {
                combinedQuery = combinedQuery.in('location_city', condition.value);
              } else if (condition.operator === '=') {
                combinedQuery = combinedQuery.eq('location_city', condition.value);
              }
              break;
            case 'tier':
              if (condition.operator === 'in' && Array.isArray(condition.value)) {
                combinedQuery = combinedQuery.in('tier', condition.value);
              } else if (condition.operator === '=') {
                combinedQuery = combinedQuery.eq('tier', condition.value);
              }
              break;
            case 'arpu_30d':
              const arpuVal = Number(condition.value);
              if (!isNaN(arpuVal)) {
                if (condition.operator === '>') combinedQuery = combinedQuery.gt('arpu_30d', arpuVal);
                else if (condition.operator === '<') combinedQuery = combinedQuery.lt('arpu_30d', arpuVal);
                else if (condition.operator === '>=') combinedQuery = combinedQuery.gte('arpu_30d', arpuVal);
                else if (condition.operator === '<=') combinedQuery = combinedQuery.lte('arpu_30d', arpuVal);
                else if (condition.operator === '=') combinedQuery = combinedQuery.eq('arpu_30d', arpuVal);
              }
              break;
            case 'churn_score':
              const churnVal = Number(condition.value);
              if (!isNaN(churnVal)) {
                if (condition.operator === '>') combinedQuery = combinedQuery.gt('churn_score', churnVal);
                else if (condition.operator === '<') combinedQuery = combinedQuery.lt('churn_score', churnVal);
                else if (condition.operator === '>=') combinedQuery = combinedQuery.gte('churn_score', churnVal);
                else if (condition.operator === '<=') combinedQuery = combinedQuery.lte('churn_score', churnVal);
                else if (condition.operator === '=') combinedQuery = combinedQuery.eq('churn_score', churnVal);
              }
              break;
            case 'created_at':
              const tenureDays = Number(condition.value);
              if (!isNaN(tenureDays)) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - tenureDays);
                if (condition.operator === '>') combinedQuery = combinedQuery.lt('created_at', targetDate.toISOString());
                else if (condition.operator === '<') combinedQuery = combinedQuery.gt('created_at', targetDate.toISOString());
                else if (condition.operator === '>=') combinedQuery = combinedQuery.lte('created_at', targetDate.toISOString());
                else if (condition.operator === '<=') combinedQuery = combinedQuery.gte('created_at', targetDate.toISOString());
              }
              break;
            case 'active_status':
              if (condition.operator === '=') {
                const statusMap: Record<string, string> = {
                  'Active': 'Active',
                  'Inactive': 'Inactive',
                  'Dormant': 'Inactive'
                };
                const mappedStatus = statusMap[condition.value as string] || condition.value;
                combinedQuery = combinedQuery.eq('status', mappedStatus);
              }
              break;
            case 'gender':
              if (condition.operator === '=') {
                combinedQuery = combinedQuery.eq('gender', condition.value);
              }
              break;
            case 'balance':
              const balanceVal = Number(condition.value);
              if (!isNaN(balanceVal)) {
                if (condition.operator === '>') combinedQuery = combinedQuery.gt('balance', balanceVal);
                else if (condition.operator === '<') combinedQuery = combinedQuery.lt('balance', balanceVal);
                else if (condition.operator === '>=') combinedQuery = combinedQuery.gte('balance', balanceVal);
                else if (condition.operator === '<=') combinedQuery = combinedQuery.lte('balance', balanceVal);
                else if (condition.operator === '=') combinedQuery = combinedQuery.eq('balance', balanceVal);
              }
              break;
          }
        });
      }
      
      return combinedQuery;
    }

    // ✅ Fix: For OR logic, we need to return a special marker
    // The actual union calculation will be done in the useEffect
    // Return a query that will be handled specially
    return { _isOrLogic: true, groups } as any;
  }, []);

  // Build Supabase query from SegmentCriteria
  const buildQuery = useCallback((criteria: SegmentCriteria) => {
    // ✅ Feature 1: Use Advanced Logic Mode if conditionGroups exist
    if (criteria.conditionGroups && criteria.conditionGroups.length > 0) {
      // Return query builder for condition groups
      return buildQueryFromConditionGroups(criteria.conditionGroups);
    }

    // Legacy mode: Build query from simple criteria
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

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

    // Status filter (from activityType)
    if (criteria.activityType) {
      // Map activityType to status
      const statusMap: Record<string, string> = {
        'Active': 'Active',
        'Inactive': 'Inactive',
        'Dormant': 'Inactive',
        'Register': 'Active'
      };
      const status = statusMap[criteria.activityType] || criteria.activityType;
      query = query.eq('status', status);
    }

    // Tags filter - will be handled in useEffect with async query
    // For now, we'll handle it in the estimation effect

    return query;
  }, [buildQueryFromConditionGroups]);

  // Estimate audience with debounce
  useEffect(() => {
    if (!criteria) {
      setAudienceSize(null);
      return;
    }

    // Check if criteria has any meaningful values
    // ✅ Fix: Support both legacy format and conditionGroups format
    let hasCriteria = false;
    
    // Check for conditionGroups (Advanced Logic Mode)
    if (criteria.conditionGroups && Array.isArray(criteria.conditionGroups) && criteria.conditionGroups.length > 0) {
      // Check if any group has valid conditions
      hasCriteria = criteria.conditionGroups.some((group: any) => {
        return group.conditions && Array.isArray(group.conditions) && group.conditions.some((cond: any) => {
          return cond.field && cond.value !== undefined && cond.value !== '' && cond.value !== null;
        });
      });
    }
    
    // Check for legacy format fields
    if (!hasCriteria) {
      hasCriteria = Object.entries(criteria).some(([key, value]) => {
        // Skip conditionGroups as we already checked it
        if (key === 'conditionGroups') return false;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // For nested objects like arpu: { min: '100' }
          return Object.values(value).some(v => v !== undefined && v !== '');
        }
        if (Array.isArray(value)) {
          // For arrays like tags: ['tag1', 'tag2']
          return value.length > 0;
        }
        return value !== undefined && value !== '';
      });
    }

    if (!hasCriteria) {
      setAudienceSize(null);
      return;
    }

    setLoading(true);
    setError(null);

    // Debounce: wait 500ms before querying
    const timeoutId = setTimeout(async () => {
      try {
        // Check session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          throw new Error('User not authenticated');
        }

        // ✅ Handle tags filter first (async operation)
        let userIdsFromTags: string[] | null = null;
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
              userIdsFromTags = [...new Set(assignmentData.map(a => a.user_id))];
            } else {
              // No users have these tags, return 0
              setAudienceSize(0);
              setLoading(false);
              return;
            }
          } else {
            // Tags not found, return 0
            setAudienceSize(0);
            setLoading(false);
            return;
          }
        }

        const query = buildQuery(criteria);
        
        // ✅ Fix: Handle OR logic (union) for condition groups
        if (query && typeof query === 'object' && (query as any)._isOrLogic) {
          const groups = (query as any).groups as SegmentConditionGroup[];
          
          // Build queries for each group and fetch user IDs
          const groupUserIds: string[][] = [];
          
          for (const group of groups) {
            if (group.conditions.length === 0) continue;
            
            // Build query for this group
            let groupQuery = supabase.from('profiles').select('id');
            
            // Apply conditions from this group (reuse buildSingleGroupQuery logic)
            group.conditions.forEach((condition) => {
              if (!condition.field || condition.value === '' || condition.value === null) return;
              
              // Apply condition logic
              switch (condition.field) {
                case 'age':
                  const ageVal = Number(condition.value);
                  if (!isNaN(ageVal)) {
                    if (condition.operator === '>') groupQuery = groupQuery.gt('age', ageVal);
                    else if (condition.operator === '<') groupQuery = groupQuery.lt('age', ageVal);
                    else if (condition.operator === '>=') groupQuery = groupQuery.gte('age', ageVal);
                    else if (condition.operator === '<=') groupQuery = groupQuery.lte('age', ageVal);
                    else if (condition.operator === '=') groupQuery = groupQuery.eq('age', ageVal);
                  }
                  break;
                case 'city':
                  if (condition.operator === 'in' && Array.isArray(condition.value)) {
                    groupQuery = groupQuery.in('location_city', condition.value);
                  } else if (condition.operator === '=') {
                    groupQuery = groupQuery.eq('location_city', condition.value);
                  }
                  break;
                case 'tier':
                  if (condition.operator === 'in' && Array.isArray(condition.value)) {
                    groupQuery = groupQuery.in('tier', condition.value);
                  } else if (condition.operator === '=') {
                    groupQuery = groupQuery.eq('tier', condition.value);
                  }
                  break;
                case 'arpu_30d':
                  const arpuVal = Number(condition.value);
                  if (!isNaN(arpuVal)) {
                    if (condition.operator === '>') groupQuery = groupQuery.gt('arpu_30d', arpuVal);
                    else if (condition.operator === '<') groupQuery = groupQuery.lt('arpu_30d', arpuVal);
                    else if (condition.operator === '>=') groupQuery = groupQuery.gte('arpu_30d', arpuVal);
                    else if (condition.operator === '<=') groupQuery = groupQuery.lte('arpu_30d', arpuVal);
                    else if (condition.operator === '=') groupQuery = groupQuery.eq('arpu_30d', arpuVal);
                  }
                  break;
                case 'churn_score':
                  const churnVal = Number(condition.value);
                  if (!isNaN(churnVal)) {
                    if (condition.operator === '>') groupQuery = groupQuery.gt('churn_score', churnVal);
                    else if (condition.operator === '<') groupQuery = groupQuery.lt('churn_score', churnVal);
                    else if (condition.operator === '>=') groupQuery = groupQuery.gte('churn_score', churnVal);
                    else if (condition.operator === '<=') groupQuery = groupQuery.lte('churn_score', churnVal);
                    else if (condition.operator === '=') groupQuery = groupQuery.eq('churn_score', churnVal);
                  }
                  break;
                case 'created_at':
                  const tenureDays = Number(condition.value);
                  if (!isNaN(tenureDays)) {
                    const targetDate = new Date();
                    targetDate.setDate(targetDate.getDate() - tenureDays);
                    if (condition.operator === '>') groupQuery = groupQuery.lt('created_at', targetDate.toISOString());
                    else if (condition.operator === '<') groupQuery = groupQuery.gt('created_at', targetDate.toISOString());
                    else if (condition.operator === '>=') groupQuery = groupQuery.lte('created_at', targetDate.toISOString());
                    else if (condition.operator === '<=') groupQuery = groupQuery.gte('created_at', targetDate.toISOString());
                  }
                  break;
                case 'active_status':
                  if (condition.operator === '=') {
                    const statusMap: Record<string, string> = {
                      'Active': 'Active',
                      'Inactive': 'Inactive',
                      'Dormant': 'Inactive'
                    };
                    const mappedStatus = statusMap[condition.value as string] || condition.value;
                    groupQuery = groupQuery.eq('status', mappedStatus);
                  }
                  break;
                case 'gender':
                  if (condition.operator === '=') {
                    groupQuery = groupQuery.eq('gender', condition.value);
                  }
                  break;
                case 'balance':
                  const balanceVal = Number(condition.value);
                  if (!isNaN(balanceVal)) {
                    if (condition.operator === '>') groupQuery = groupQuery.gt('balance', balanceVal);
                    else if (condition.operator === '<') groupQuery = groupQuery.lt('balance', balanceVal);
                    else if (condition.operator === '>=') groupQuery = groupQuery.gte('balance', balanceVal);
                    else if (condition.operator === '<=') groupQuery = groupQuery.lte('balance', balanceVal);
                    else if (condition.operator === '=') groupQuery = groupQuery.eq('balance', balanceVal);
                  }
                  break;
              }
            });
            
            // Execute query and get user IDs
            const { data: users, error: groupError } = await groupQuery;
            if (groupError) throw groupError;
            
            const userIds = (users || []).map((u: any) => u.id);
            groupUserIds.push(userIds);
          }
          
          // ✅ Fix: Calculate union (OR logic) - 并集计算
          // Merge all user IDs and remove duplicates
          const allUserIds = new Set<string>();
          groupUserIds.forEach(ids => {
            ids.forEach(id => allUserIds.add(id));
          });
          
          // Count unique users (union size)
          const unionCount = allUserIds.size;
          setAudienceSize(unionCount);
          setError(null);
        } else {
          // Normal query (AND logic or legacy mode)
          // Apply tag filter if we have user IDs from tags
          let finalQuery = query;
          if (userIdsFromTags && userIdsFromTags.length > 0) {
            finalQuery = (query as any).in('id', userIdsFromTags);
          }
          
          const { count, error: queryError } = await finalQuery;

          if (queryError) {
            throw queryError;
          }

          setAudienceSize(count || 0);
          setError(null);
        }
      } catch (err: any) {
        console.error('Error estimating audience:', err);
        setError(err.message || 'Failed to estimate audience');
        setAudienceSize(null);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [criteria, buildQuery]);

  return {
    audienceSize,
    loading,
    error
  };
};


