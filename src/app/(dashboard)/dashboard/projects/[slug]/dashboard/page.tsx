'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';
import './dashboard.css';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function CampaignDashboard() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.slug as string;

    const [project, setProject] = useState<any>(null);
    const [campaignData, setCampaignData] = useState<any>(null);
    const [insights, setInsights] = useState<any>(null);
    const [insightsTimeSeries, setInsightsTimeSeries] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [adsControl, setAdsControl] = useState(true);
    const [showClicks, setShowClicks] = useState(true);
    const [showImpressions, setShowImpressions] = useState(true);
    const [hoveredPoint, setHoveredPoint] = useState<{ date: string; value: number; type: string } | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchProjectData();
    }, [projectId]);

    const fetchProjectData = async () => {
        try {
            setLoading(true);

            // Fetch project data
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('*')
                .eq('project_id', projectId)
                .eq('user_id', session.user.id)
                .single();

            if (projectError || !projectData) {
          
                setLoading(false);
                return;
            }

            setProject(projectData);

            // If project has meta_campaign_id, fetch campaign insights
            if (projectData.meta_campaign_id) {
                // Trigger server-side insights collection and logging
                try {
                    const insightsResponse = await fetch('/api/analytics/insights', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ project_id: projectId }),
                    });
                    
                    if (insightsResponse.ok) {
                        const insightsResult = await insightsResponse.json();
                    } else {
                        const error = await insightsResponse.json();
                       
                    }
                } catch (e) {
              
                }
                
                // Fetch campaign insights for display
                await fetchCampaignInsights(projectData.meta_campaign_id);
            }

            setLoading(false);
        } catch (error) {
      
            setLoading(false);
        }
    };

    const fetchCampaignInsights = async (campaignId: string) => {
        try {
          
            
            // Fetch user's Meta access token
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
 
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('meta_accounts')
                .eq('user_id', session.user.id)
                .single();

            if (!profile?.meta_accounts || profile.meta_accounts.length === 0) {
             
                return;
            }

            const metaAccount = Array.isArray(profile.meta_accounts)
                ? profile.meta_accounts[0]
                : profile.meta_accounts;

            const accessToken = metaAccount.access_token;
            if (!accessToken) {
       
                return;
            }

            // Fetch campaign details
            const campaignResponse = await fetch(
                `https://graph.facebook.com/v18.0/${campaignId}?fields=id,name,status,objective,start_time,stop_time,daily_budget&access_token=${accessToken}`
            );
            const campaign = await campaignResponse.json();
            setCampaignData(campaign);

            // Fetch campaign insights (aggregated)
            const insightsResponse = await fetch(
                `https://graph.facebook.com/v18.0/${campaignId}/insights?fields=impressions,clicks,spend,reach,ctr,cpc,cpm,cost_per_action_type,actions,frequency&access_token=${accessToken}`
            );
            const insightsData = await insightsResponse.json();

            if (insightsData.data && insightsData.data.length > 0) {
                setInsights(insightsData.data[0]);
            } else {
            }

            // Fetch time-series insights (daily breakdown for last 7 days)
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            const endDate = new Date();

            const timeRange = {
                since: startDate.toISOString().split('T')[0],
                until: endDate.toISOString().split('T')[0]
            };

            const timeSeriesResponse = await fetch(
                `https://graph.facebook.com/v18.0/${campaignId}/insights?` +
                new URLSearchParams({
                    fields: 'impressions,clicks,actions,date_start',
                    time_range: JSON.stringify(timeRange),
                    time_increment: '1',
                    access_token: accessToken
                })
            );
            const timeSeriesData = await timeSeriesResponse.json();

            if (timeSeriesData.data && timeSeriesData.data.length > 0) {
                setInsightsTimeSeries(timeSeriesData.data);
            } else {
                setInsightsTimeSeries([]);
            }
        } catch (error) {
        }
    };

    const formatCurrency = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
        }).format(num);
    };

    const formatNumber = (value: string | number) => {
        const num = typeof value === 'string' ? parseFloat(value) : value;
        return new Intl.NumberFormat('en-US').format(num);
    };

    const getResults = () => {
        if (!insights?.actions) return '0';
        const leadActions = insights.actions.find((a: any) => a.action_type === 'lead');
        return leadActions ? formatNumber(leadActions.value) : '0';
    };

    const getROAS = () => {
        if (!insights?.spend || !insights?.actions) return '-';
        const leadActions = insights.actions.find((a: any) => a.action_type === 'lead');
        if (!leadActions || parseFloat(insights.spend) === 0) return '-';
        // Simplified ROAS calculation
        return (parseFloat(leadActions.value) / parseFloat(insights.spend)).toFixed(2);
    };

    const getCostPerResult = () => {
        if (!insights?.spend || !insights?.actions) return '-';
        const leadActions = insights.actions.find((a: any) => a.action_type === 'lead');
        if (!leadActions || parseFloat(leadActions.value) === 0) return '-';
        return formatCurrency(parseFloat(insights.spend) / parseFloat(leadActions.value));
    };

    const getCampaignName = () => {
        return project?.meta_campaign_name ||
            project?.campaign_proposal?.campaignName ||
            project?.campaign_proposal?.project_name ||
            'Campaign';
    };

    const getObjective = () => {
        if (!campaignData?.objective) return 'LEADS';
        return campaignData.objective === 'OUTCOME_LEADS' ? 'LEADS' : 'TRAFFIC';
    };

    const getStartDate = () => {
        if (campaignData?.start_time) {
            return new Date(campaignData.start_time).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        return new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getEndDate = () => {
        if (campaignData?.stop_time) {
            return new Date(campaignData.stop_time).toLocaleString('en-US', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        }
        // Default to 3 days from start
        const start = campaignData?.start_time ? new Date(campaignData.start_time) : new Date();
        const end = new Date(start);
        end.setDate(end.getDate() + 3);
        return end.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getDailyBudget = () => {
        if (campaignData?.daily_budget) {
            const budget = parseFloat(campaignData.daily_budget) / 100; // Convert from cents
            return formatCurrency(budget);
        }
        // Get from published_ads
        return '$20 Per Day'; // Default
    };

    const getCampaignStartDate = () => {
        if (campaignData?.start_time) {
            return new Date(campaignData.start_time);
        }
        // Fallback to project updated_at when status changed to RUNNING
        if (project?.updated_at && project?.status === 'RUNNING') {
            return new Date(project.updated_at);
        }
        return new Date();
    };

    const getCampaignEndDate = () => {
        if (campaignData?.stop_time) {
            return new Date(campaignData.stop_time);
        }
        // Default to 3 days from start
        const start = getCampaignStartDate();
        const end = new Date(start);
        end.setDate(end.getDate() + 3);
        return end;
    };

    // Format performance data for chart - NO FALLBACK DATA
    const formatChartData = () => {
        if (!insightsTimeSeries || insightsTimeSeries.length === 0) {
            return []; // Return empty array - no fake data
        }

        const chartData = insightsTimeSeries.map((item: any) => {
            const date = new Date(item.date_start);
            const day = date.getDate().toString().padStart(2, '0');
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const leads = item.actions?.find((a: any) => a.action_type === 'lead')?.value || '0';

            return {
                day: `${day}-${month}`,
                Clicks: parseFloat(leads) || parseFloat(item.clicks || '0'),
                Impressions: parseFloat(item.impressions || '0'),
            };
        }).sort((a, b) => {
            // Sort by date
            const dateA = new Date(a.day.split('-').reverse().join('-'));
            const dateB = new Date(b.day.split('-').reverse().join('-'));
            return dateA.getTime() - dateB.getTime();
        });

        return chartData;
    };


    const renderCalendar = () => {
        const today = new Date();
        const campaignStartDate = getCampaignStartDate();
        const campaignEndDate = getCampaignEndDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        // Get first day of month and number of days
        const firstDay = new Date(currentYear, currentMonth, 1);
        const lastDay = new Date(currentYear, currentMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

        const calendarDays = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            calendarDays.push(null);
        }

        // Add all days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            calendarDays.push(day);
        }

        return (
            <div className="calendar-wrapper">
                <div className="calendar-header">
                    <h3 className="calendar-month-year">
                        {monthNames[currentMonth]} {currentYear}
                    </h3>
                </div>
                <div className="calendar-days-header">
                    {dayNames.map((day, index) => (
                        <div key={index} className="calendar-day-header">{day}</div>
                    ))}
                </div>
                <div className="calendar-grid">
                    {calendarDays.map((day, index) => {
                        if (day === null) {
                            return <div key={index} className="calendar-day empty"></div>;
                        }

                        const isToday = day === today.getDate() &&
                            currentMonth === today.getMonth() &&
                            currentYear === today.getFullYear();

                        const isCampaignStart = day === campaignStartDate.getDate() &&
                            currentMonth === campaignStartDate.getMonth() &&
                            currentYear === campaignStartDate.getFullYear();

                        const isCampaignEnd = day === campaignEndDate.getDate() &&
                            currentMonth === campaignEndDate.getMonth() &&
                            currentYear === campaignEndDate.getFullYear();

                        let tooltip = '';
                        if (isCampaignStart && isCampaignEnd) {
                            tooltip = 'Campaign Start & End Date';
                        } else if (isCampaignStart) {
                            tooltip = 'Campaign Start Date';
                        } else if (isCampaignEnd) {
                            tooltip = 'Campaign End Date';
                        }

                        return (
                            <div
                                key={index}
                                className={`calendar-day ${isToday ? 'today' : ''} ${isCampaignStart ? 'campaign-start' : ''} ${isCampaignEnd ? 'campaign-end' : ''}`}
                                title={tooltip || undefined}
                            >
                                {day}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner">Loading campaign dashboard...</div>
            </div>
        );
    }

    return (
        <div className="campaign-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <div className='flex gap-2'>
                    <button className="back-button" onClick={() => router.push('/dashboard/projects')}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M6 8L2 12L6 16" stroke="#343438" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M2 12H22" stroke="#343438" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>

                        Back
                    </button>
                    <div className="status-indicators">
                        <span className="status-badge running"><b className='dot'></b> RUNNING</span>
                        <span className="status-badge objective"><b className='dot'></b> {getObjective()}</span>
                    </div>
                    <button
                        className="back-button"
                        onClick={async () => {
                            if (!project) return;
                            try {
                                setRefreshing(true);

                                // Fetch campaign insights for display
                                if (project?.meta_campaign_id) {
                                    await fetchCampaignInsights(project.meta_campaign_id);
                                }
                                
                            } catch (e) {
                        
                            } finally {
                                setRefreshing(false);
                            }
                        }}
                        disabled={refreshing}
                        title="Fetch latest insights from Meta and save to database"
                    >
                        {refreshing ? 'Refreshing…' : 'Refresh insights'}
                    </button>
                </div>
                <div className='campaign-title-section-container'>
                    <div className="campaign-title-section">
                        <h1 className="campaign-title">{getCampaignName()}</h1>
                    </div>
                    <div className="ads-control-section">
                        <span className="ads-control-label">Ads Control</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={adsControl}
                                onChange={(e) => setAdsControl(e.target.checked)}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="dashboard-grid">
                {/* Lead - Performance Card */}
                <div className="dashboard-card performance-card">
                    <h2 className="card-title">Lead - Performance</h2>
                    <div className="metrics-row">
                        <div className="metric-item">
                            <div className="metric-label">RESULTS</div>
                            <div className="metric-value">{getResults()}</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label">ROAS</div>
                            <div className="metric-value">{getROAS()}</div>
                        </div>
                        <div className="metric-item">
                            <div className="metric-label br_word">AMOUNT <br /> SPENT</div>
                            <div className="metric-value">
                                {insights?.spend ? formatCurrency(insights.spend) : '$0'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Campaign Details Card */}
                <div className="dashboard-card details-card">

                    <div className="details-list">
                        <div className="detail-item">
                            <span className="detail-label">Start date:</span>
                            <span className="detail-value">{getStartDate()}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">End date:</span>
                            <span className="detail-value">{getEndDate()}</span>
                        </div>
                        <div className="detail-item">
                            <span className="detail-label">Budget:</span>
                            <span className="detail-value">{getDailyBudget()}</span>
                        </div>
                    </div>
                </div>

                {/* Performance Graph Card */}
                <div className="dashboard-card graph-card">
                    <div className="graph-header">
                        <h2 className="card-title">Performance</h2>
                        <div className="graph-legend">
                            <label className="legend-item">
                                <input
                                    type="checkbox"
                                    checked={showClicks}
                                    onChange={(e) => setShowClicks(e.target.checked)}
                                    className="legend-checkbox clicks"
                                />
                                <span>Clicks</span>
                            </label>
                            <label className="legend-item">
                                <input
                                    type="checkbox"
                                    checked={showImpressions}
                                    onChange={(e) => setShowImpressions(e.target.checked)}
                                    className="legend-checkbox impressions"
                                />
                                <span>Impressions</span>
                            </label>
                        </div>
                    </div>
                    <div className="graph-container">
                        {formatChartData().length === 0 ? (
                            <div style={{ 
                                height: '240px', 
                                width: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: '#9ca3af',
                                fontSize: '14px',
                                gap: '8px'
                            }}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                                <div>No performance data available yet</div>
                                <div style={{ fontSize: '12px', color: '#d1d5db' }}>
                                    Data will appear here once your ads start running
                                </div>
                            </div>
                        ) : (
                            <div style={{ height: '240px', width: '100%' }}>
                                <ResponsiveContainer width='100%' height='100%'>
                                    <LineChart
                                        data={formatChartData()}
                                        margin={{ top: 5, right: 30, left: 0, bottom: 25 }}
                                    >
                                        <CartesianGrid stroke='#F3F2F7' strokeDasharray='0' />
                                        <XAxis
                                            dataKey='day'
                                            fontSize={12}
                                            tick={{ fill: '#666', fontSize: 11 }}
                                            interval={0}
                                            tickLine={false}
                                            axisLine={false}
                                            height={40}
                                            tickMargin={5}
                                        />
                                        <YAxis hide={true} />
                                        <Tooltip
                                            formatter={(value: any) => [formatNumber(value), '']}
                                            labelFormatter={label => `${label}`}
                                        />
                                        {showClicks && (
                                            <Line
                                                type='monotone'
                                                dataKey='Clicks'
                                                stroke='#10b981'
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        )}
                                        {showImpressions && (
                                            <Line
                                                type='monotone'
                                                dataKey='Impressions'
                                                stroke='#7e52e0'
                                                strokeWidth={2}
                                                dot={false}
                                            />
                                        )}
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar Card */}
                <div className="dashboard-card calendar-card">
                    <h2 className="card-title">Calendar</h2>
                    <div className="calendar-container">
                        {renderCalendar()}
                    </div>
                </div>

                {/* Bottom Metrics Card */}
                <div className="dashboard-card metrics-card full-width">
                    <div className="metrics-grid">
                        <div className="metric-box">
                            <div className="metric-label-small">CPC</div>
                            <div className="metric-value-small">
                                {insights?.cpc ? formatCurrency(insights.cpc) : '$0'}
                            </div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">COST PER RESULTS</div>
                            <div className="metric-value-small">{getCostPerResult()}</div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">LINK CLICKS</div>
                            <div className="metric-value-small">
                                {insights?.clicks ? formatCurrency(insights.clicks) : '$0'}
                            </div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">CTR</div>
                            <div className="metric-value-small">
                                {insights?.ctr ? `${parseFloat(insights.ctr).toFixed(1)}%` : '0.0%'}
                            </div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">CPM</div>
                            <div className="metric-value-small">
                                {insights?.cpm ? formatCurrency(insights.cpm) : '$0.00'}
                            </div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">IMPRESSIONS</div>
                            <div className="metric-value-small">
                                {insights?.impressions ? formatNumber(insights.impressions) : '0'}
                            </div>
                        </div>
                        <div className="metric-box">
                            <div className="metric-label-small">FREQUENCY</div>
                            <div className="metric-value-small">
                                {insights?.frequency ? parseFloat(insights.frequency).toFixed(1) : '0.0'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

