import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { AiActionTask, StatCardProps } from '../types';
import { DASHBOARD_KPIS, DASHBOARD_AI_TASKS } from '../constants';
import { DollarSign, Users, Activity, TrendingUp } from 'lucide-react';

export const useBusinessOverview = () => {
    const [metrics, setMetrics] = useState<Partial<StatCardProps>[]>(DASHBOARD_KPIS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMetrics = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    setLoading(false);
                    return;
                }

                // 1. Fetch Profiles Stats (Active Users & Churn Risk)
                const { data: profiles, error: profileError } = await supabase
                    .from('profiles')
                    .select('id, status, churn_score');

                if (profileError) throw profileError;

                // 2. Fetch Billing (Last 30 Days) for ARPU & Revenue
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                const { data: transactions, error: billError } = await supabase
                    .from('billing_transactions')
                    .select('amount, user_id, type')
                    .gte('timestamp', thirtyDaysAgo.toISOString())
                    .limit(20000);

                if (billError) throw billError;

                // 3. (新) Fetch Campaigns for Cost Calculation
                const { data: allCampaigns, error: campError } = await supabase
                    .from('campaigns')
                    .select('reach');

                if (campError) throw campError;

                // --- Calculations ---

                // A. Active Users
                const totalProfiles = profiles?.length || 0;
                const activeUsers = profiles?.filter(p => p.status === 'Active').length || 0;

                // B. Churn Rate
                const highRiskUsers = profiles?.filter(p => (p.churn_score || 0) > 0.7).length || 0;
                const churnRate = totalProfiles > 0 ? (highRiskUsers / totalProfiles) * 100 : 0;

                // C. Revenue (Topup only, last 30d)
                const revenue = transactions
                    ?.filter(t => t.type === 'Topup')
                    .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

                // D. ARPU
                const arpu = activeUsers > 0 ? revenue / activeUsers : 0;

                // E. ROI Calculation (基于成本模型)
                // 逻辑：ROI = (收入 - 成本) / 成本
                // 成本 = 基础运营费 + (触达人数 * 单条发送成本)

                const totalReach = allCampaigns?.reduce((sum, c) => sum + (c.reach || 0), 0) || 0;

                const BASE_OPEX_COST = 1000000; // 基础运营成本 100万 Ks (调整以符合 Demo 预期)
                const COST_PER_MSG = 50;        // 单次触达成本 50 Ks (批量短信优惠价)

                const campaignCost = totalReach * COST_PER_MSG;
                const totalInvestment = BASE_OPEX_COST + campaignCost;

                const roi = totalInvestment > 0 ? ((revenue - totalInvestment) / totalInvestment) * 100 : 0;

                setMetrics([
                    {
                        title: 'Avg. Revenue (ARPU)',
                        value: `Ks ${arpu.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
                        trend: '+2.1%',
                        trendUp: true,
                        icon: DollarSign
                    },
                    {
                        title: 'Campaign ROI',
                        value: `${roi.toFixed(0)}%`,
                        trend: 'Revenue / Inv.',
                        trendUp: roi > 0,
                        icon: Activity
                    },
                    {
                        title: 'Churn Rate',
                        value: `${churnRate.toFixed(1)}%`,
                        trend: '+0.3%',
                        trendUp: false,
                        icon: TrendingUp
                    },
                    {
                        title: 'Total Active Users',
                        value: activeUsers.toLocaleString(),
                        trend: '+12.5%',
                        trendUp: true,
                        icon: Users
                    }
                ]);

            } catch (err) {
                console.error('❌ Error in useBusinessOverview:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchMetrics();
    }, []);

    return { metrics, loading };
};

export const useAiActionableTasks = () => {
    const [tasks, setTasks] = useState<AiActionTask[]>(DASHBOARD_AI_TASKS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const generateTasks = async () => {
            try {
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError || !session) {
                    setLoading(false);
                    return;
                }

                // 1. Detect High Churn Risk Users
                const { count: highChurnCount, error: highChurnError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .gt('churn_score', 0.5)
                    .eq('status', 'Active');

                if (highChurnError) console.error('❌ Error fetching churn users:', highChurnError);

                // 2. Detect Inactive Users
                const { count: inactiveCount, error: inactiveError } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact', head: true })
                    .in('status', ['Inactive', 'Churned']);

                if (inactiveError) console.error('❌ Error fetching inactive users:', inactiveError);

                const newTasks: AiActionTask[] = [];

                if (!highChurnError && highChurnCount && highChurnCount > 0) {
                    newTasks.push({
                        id: `gen-churn-${Date.now()}`,
                        type: 'churn_risk',
                        title: 'High Churn Risk Detected',
                        issue: `${highChurnCount} active users have churn risk > 50%.`,
                        analysis: 'These users show high churn probability based on behavior patterns.',
                        suggestion: 'Trigger "Retention Bonus" campaign immediately.',
                        impact: `Retain ~${Math.floor(highChurnCount * 0.3)} Users`
                    });
                }

                if (!inactiveError && inactiveCount && inactiveCount > 0) {
                    newTasks.push({
                        id: `gen-inactive-${Date.now()}`,
                        type: 'alert',
                        title: 'Inactive User Alert',
                        issue: `${inactiveCount} users are marked as Inactive or Churned.`,
                        analysis: 'These users have stopped using the service.',
                        suggestion: 'Launch "We Miss You" reactivation campaign.',
                        impact: `Recover ~${Math.floor(inactiveCount * 0.1)} Users`
                    });
                }

                if (newTasks.length > 0) {
                    setTasks([...newTasks, ...DASHBOARD_AI_TASKS.slice(0, 3 - newTasks.length)]);
                }

            } catch (e) {
                console.error("❌ Error generating AI tasks", e);
            } finally {
                setLoading(false);
            }
        };

        generateTasks();
    }, []);

    return { tasks, loading };
};

export const useUpcomingHoliday = () => {
    const [holiday, setHoliday] = useState<{ name: string; date: string; type: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHoliday = async () => {
            try {
                const today = new Date().toISOString().split('T')[0];

                const { data, error } = await supabase
                    .from('public_holidays')
                    .select('name, date, type')
                    .gte('date', today)
                    .order('date', { ascending: true })
                    .limit(1)
                    .single();

                if (error && error.code !== 'PGRST116') {
                    console.error('Error fetching holiday:', error);
                }

                if (data) {
                    setHoliday(data);
                }
            } catch (err) {
                console.error('Unexpected error fetching holiday:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHoliday();
    }, []);

    return { holiday, loading };
};
