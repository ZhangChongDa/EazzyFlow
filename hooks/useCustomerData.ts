import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { Profile } from '../types/database';

export const useCustomerOverview = () => {
    const [loading, setLoading] = useState(true);

    // State for Chart Data
    const [lifecycleData, setLifecycleData] = useState<any[]>([]);
    const [segmentDNA, setSegmentDNA] = useState<any[]>([]);
    const [heatmapData, setHeatmapData] = useState<any[]>([]);
    const [samples, setSamples] = useState<any[]>([]);
    const [totalCustomers, setTotalCustomers] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Fetch Profiles (accounts table doesn't exist, all data in profiles)
                const { data: rawData, error } = await supabase
                    .from('profiles')
                    .select('*');

                if (error) throw error;

                const profiles = (rawData || []) as Profile[];
                setTotalCustomers(profiles.length);

                processLifecycle(profiles);
                processSegmentDNA(profiles);
                processHeatmap(profiles);
                processSamples(profiles);

            } catch (err) {
                console.error('Error in useCustomerOverview:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // --- Processors ---

    const processLifecycle = (profiles: Profile[]) => {
        const now = new Date();
        let newUsers = 0, growing = 0, stable = 0, churnRisk = 0;

        profiles.forEach(p => {
            // Use created_at for tenure calculation
            const regDate = new Date(p.created_at || p.registration_date || now);
            const diffDays = Math.floor((now.getTime() - regDate.getTime()) / (1000 * 3600 * 24));

            const status = p.status || 'Inactive';

            if (status === 'Churned' || status === 'Inactive') {
                churnRisk++;
            } else if (diffDays < 30) {
                newUsers++;
            } else if (diffDays < 180) {
                growing++;
            } else {
                stable++;
            }
        });

        setLifecycleData([
            { name: 'New', value: newUsers, color: '#60a5fa' },
            { name: 'Growing', value: growing, color: '#34d399' },
            { name: 'Stable', value: stable, color: '#818cf8' },
            { name: 'Churn Risk', value: churnRisk, color: '#f87171' },
        ]);
    };

    const processSegmentDNA = (profiles: Profile[]) => {
        // Compare "Student/Youth" (Simulated by age < 25) vs Average
        // In a real app, you'd select the segment dynamically. 
        // Here we hardcode "Youth" criteria for the chart.

        let youthCount = 0;
        let totalCount = profiles.length || 1;

        const sums = {
            arpu: { youth: 0, all: 0 },
            data: { youth: 0, all: 0 },
            voice: { youth: 0, all: 0 },
        };

        profiles.forEach(p => {
            const arpu = p.arpu_30d || 0;
            // Get usage from telecom_usage table would require separate query
            // For now, use ARPU as proxy
            const data = arpu * 10; // Proxy calculation
            const voice = arpu * 2; // Proxy calculation
            const isYouth = (p.age || 30) < 25;

            // Accumulate
            sums.arpu.all += arpu;
            sums.data.all += data;
            sums.voice.all += voice;

            if (isYouth) {
                youthCount++;
                sums.arpu.youth += arpu;
                sums.data.youth += data;
                sums.voice.youth += voice;
            }
        });

        const avgs = {
            arpu: { youth: youthCount ? sums.arpu.youth / youthCount : 0, all: sums.arpu.all / totalCount },
            data: { youth: youthCount ? sums.data.youth / youthCount : 0, all: sums.data.all / totalCount },
            voice: { youth: youthCount ? sums.voice.youth / youthCount : 0, all: sums.voice.all / totalCount },
        };

        // Normalize for Radar Chart (0-150 scale)
        // Simple scaling for demo visualization
        const normalize = (val: number, max: number) => Math.min(Math.round((val / max) * 100) + 50, 150);

        setSegmentDNA([
            { subject: 'ARPU', A: normalize(avgs.arpu.youth, 20000), B: normalize(avgs.arpu.all, 20000), fullMark: 150 },
            { subject: 'Data Usage', A: normalize(avgs.data.youth, 5000), B: normalize(avgs.data.all, 5000), fullMark: 150 },
            { subject: 'Voice MOU', A: normalize(avgs.voice.youth, 200), B: normalize(avgs.voice.all, 200), fullMark: 150 },
            { subject: 'Digital', A: 130, B: 70, fullMark: 150 }, // Mock
            { subject: 'Tenure', A: 60, B: 110, fullMark: 150 }, // Youth usually lower tenure
            { subject: 'Loyalty', A: 90, B: 100, fullMark: 150 },
        ]);
    };

    const processHeatmap = (profiles: Profile[]) => {
        // Grid: Tenure (Rows) x Tier (Cols)
        // Tenure Groups: <6m, 6-12m, 1-3y, >3y

        const buckets = {
            '< 6mo': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
            '6-12mo': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
            '1-3yr': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
            '> 3yr': { Crown: 0, Diamond: 0, Gold: 0, Silver: 0, total: 0 },
        };

        const now = new Date();

        profiles.forEach(p => {
            const regDate = new Date(p.created_at || p.registration_date || now);
            const days = (now.getTime() - regDate.getTime()) / (1000 * 3600 * 24);
            let tenureKey: keyof typeof buckets = '> 3yr';

            if (days < 180) tenureKey = '< 6mo';
            else if (days < 365) tenureKey = '6-12mo';
            else if (days < 1095) tenureKey = '1-3yr';

            const tier = p.tier || 'Silver'; // Default
            // Handle unexpected tier values safely? Assuming exact match for now or map
            if (tier in buckets[tenureKey]) {
                // @ts-ignore
                buckets[tenureKey][tier]++;
                buckets[tenureKey].total++;
            }
        });

        // Convert to percentage
        const data = Object.entries(buckets).map(([tenure, counts]) => ({
            tenure,
            crown: counts.total ? Math.round((counts.Crown / counts.total) * 100) : 0,
            diamond: counts.total ? Math.round((counts.Diamond / counts.total) * 100) : 0,
            gold: counts.total ? Math.round((counts.Gold / counts.total) * 100) : 0,
            silver: counts.total ? Math.round((counts.Silver / counts.total) * 100) : 0,
        }));

        setHeatmapData(data);
    };

    const processSamples = (profiles: Profile[]) => {
        // Just take first 5 valid ones
        const subset = profiles.slice(0, 5).map(p => ({
            id: p.id,
            msisdn: p.msisdn,
            tier: p.tier,
            arpu: (p.arpu_30d || 0).toLocaleString(),
            device: p.device_type || 'Unknown'
        }));
        setSamples(subset);
    };


    return { loading, lifecycleData, segmentDNA, heatmapData, samples, totalCustomers };
};

export const useCustomerList = (page: number = 1, pageSize: number = 10) => {
    const [users, setUsers] = useState<any[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchList = async () => {
            setLoading(true);
            try {
                const start = (page - 1) * pageSize;
                const end = start + pageSize - 1;

                const { data, count: total, error } = await supabase
                    .from('profiles')
                    .select('*', { count: 'exact' })
                    .range(start, end);

                if (error) throw error;

                const mapped = (data || []).map((p: any) => ({
                    id: p.id,
                    msisdn: p.msisdn,
                    tier: p.tier,
                    arpu: (p.arpu_30d || 0).toLocaleString(),
                    device: p.device_type || 'Unknown'
                }));

                setUsers(mapped);
                setCount(total || 0);

            } catch (err) {
                console.error('Error fetching customer list:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchList();
    }, [page, pageSize]);

    return { users, count, loading };
};

export const useAudienceOpportunities = () => {
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOpportunities = async () => {
            setLoading(true);
            try {
                // Fetch profiles and usage data to analyze patterns
                const { data: profiles, error: profilesError } = await supabase
                    .from('profiles')
                    .select('*')
                    .limit(500);

                const { data: usageData, error: usageError } = await supabase
                    .from('telecom_usage')
                    .select('user_id, type, amount')
                    .gte('timestamp', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
                    .limit(1000);

                if (profilesError || usageError) {
                    console.error('Error fetching data for opportunities:', profilesError || usageError);
                    setOpportunities([]);
                    return;
                }

                if (!profiles || profiles.length === 0) {
                    setOpportunities([]);
                    return;
                }

                // Calculate usage per user
                const userUsage: Record<string, { data: number; voice: number; sms: number }> = {};
                (usageData || []).forEach((u: any) => {
                    if (!userUsage[u.user_id]) {
                        userUsage[u.user_id] = { data: 0, voice: 0, sms: 0 };
                    }
                    if (u.type === 'Data') userUsage[u.user_id].data += u.amount;
                    if (u.type === 'Voice') userUsage[u.user_id].voice += u.amount;
                    if (u.type === 'SMS') userUsage[u.user_id].sms += u.amount;
                });

                const newOpps = [];
                let oppId = 1;

                // 1. Gamer Pattern: High Data, Low Voice
                const gamers = profiles.filter((p: any) => {
                    const usage = userUsage[p.id] || { data: 0, voice: 0, sms: 0 };
                    return usage.data > 5000 && usage.voice < 50;
                });
                if (gamers.length > 0) {
                    newOpps.push({
                        id: oppId++,
                        title: "High Data / Low Voice Gamers",
                        description: `Detected ${gamers.length} users with high data usage (>5GB) and low voice usage, likely gaming traffic.`,
                        aiAnalysis: "High probability of active mobile gaming usage.",
                        suggestion: "Push 'Game Booster' or 'Esports Data Pack'.",
                        trendData: [
                            { time: '10am', users: Math.round(gamers.length * 0.2) },
                            { time: '12pm', users: Math.round(gamers.length * 0.5) },
                            { time: '2pm', users: Math.round(gamers.length * 0.8) },
                            { time: '4pm', users: gamers.length },
                        ],
                        growth: "+15%"
                    });
                }

                // 2. Churn Risk: High churn_score or low usage
                const churnRisks = profiles.filter((p: any) => {
                    const usage = userUsage[p.id] || { data: 0, voice: 0, sms: 0 };
                    return (p.churn_score > 0.5 || (usage.voice < 10 && usage.data < 100)) && p.status === 'Active';
                });
                if (churnRisks.length > 0) {
                    newOpps.push({
                        id: oppId++,
                        title: "Churn Risk Alert",
                        description: `Detected ${churnRisks.length} active users with high churn risk or very low usage.`,
                        aiAnalysis: "Likely to churn soon without intervention.",
                        suggestion: "Send 'We Miss You' bonus offer to re-activate.",
                        trendData: [
                            { time: 'Week 1', users: Math.round(churnRisks.length * 0.1) },
                            { time: 'Week 2', users: Math.round(churnRisks.length * 0.4) },
                            { time: 'Week 3', users: Math.round(churnRisks.length * 0.8) },
                            { time: 'Week 4', users: churnRisks.length },
                        ],
                        growth: "+45%"
                    });
                }

                // 3. High Value Users (High ARPU and Tier)
                const highValue = profiles.filter((p: any) => 
                    (p.tier === 'Crown' || p.tier === 'Diamond') && p.arpu_30d > 30
                );
                if (highValue.length > 0) {
                    newOpps.push({
                        id: oppId++,
                        title: "High Value User Opportunity",
                        description: `Identified ${highValue.length} high-value users (Crown/Diamond tier with ARPU > $30).`,
                        aiAnalysis: "Likely to purchase premium bundles or roaming packs.",
                        suggestion: "Offer 'Premium Upgrade' or 'Roaming Saver' packages.",
                        trendData: [
                            { time: 'Mon', users: highValue.length - 2 },
                            { time: 'Tue', users: highValue.length - 1 },
                            { time: 'Wed', users: highValue.length },
                        ],
                        growth: "+5%"
                    });
                }

                setOpportunities(newOpps);

            } catch (err) {
                console.error('Error fetching audience opportunities:', err);
                // Fallback to empty or keep mock in component if error
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunities();
    }, []);

    return { opportunities, loading };
};
