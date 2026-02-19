import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { BookText, TrendingDown, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import _ from 'lodash';
import { format } from 'date-fns';

export default function FinancialCommentary({ submissions, financialData, allFinancialData, loading, filters }) {

    const ytdCommentaryByRegion = useMemo(() => {
        if (!submissions || submissions.length === 0) return {};

        // Find the latest submission for each region within the filtered data
        // Assuming 'month' in submissions is a string in 'YYYY-MM' format for correct comparison
        const latestSubmissionsByRegion = _.chain(submissions)
            .groupBy('region')
            .mapValues(regionSubmissions => _.maxBy(regionSubmissions, 'month'))
            .value();

        // Extract the YTD commentary from that latest submission
        return _.mapValues(latestSubmissionsByRegion, sub => sub?.rmd_ytd_year_end_commentary || null);
    }, [submissions]);

    const getHealthGradeBadge = (grade, isRegion = false) => {
        const prefix = isRegion ? "Region YTD Health Grade" : "Office YTD Health Grade";
        if (grade === 'N/A') {
            return <Badge className="bg-slate-200 text-slate-600 font-semibold border border-slate-300">{prefix}: N/A</Badge>;
        }

        const colorMap = {
            'A+': 'bg-green-100 text-green-800 border-green-200',
            'A': 'bg-green-100 text-green-800 border-green-200',
            'A-': 'bg-green-100 text-green-800 border-green-200',
            'B+': 'bg-blue-100 text-blue-800 border-blue-200',
            'B': 'bg-blue-100 text-blue-800 border-blue-200',
            'B-': 'bg-blue-100 text-blue-800 border-blue-200',
            'C+': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'C': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'C-': 'bg-yellow-100 text-yellow-800 border-yellow-200',
            'D+': 'bg-orange-100 text-orange-800 border-orange-200',
            'D': 'bg-orange-100 text-orange-800 border-orange-200',
            'D-': 'bg-orange-100 text-orange-800 border-orange-200',
            'F': 'bg-red-100 text-red-800 border-red-200'
        };

        return (
            <Badge className={`${colorMap[grade] || 'bg-slate-100 text-slate-800 border border-slate-200'} font-semibold`}>
                {prefix}: {grade}
            </Badge>
        );
    };

    const getTrendIndicator = (trend) => {
        if (!trend) return null;

        const Icon = trend.direction === 'up' ? TrendingUp : TrendingDown;
        const colorClass = trend.direction === 'up' ? 'text-green-600' : 'text-red-600';

        return (
            <div className={`flex items-center gap-1 ${colorClass} text-sm font-medium`}>
                <Icon className="w-4 h-4" />
                <span>{trend.text}</span>
            </div>
        );
    };

    const commentaryData = React.useMemo(() => {
        if (!filters || ((!submissions || submissions.length === 0) && (!financialData || financialData.length === 0))) return [];

        const calculateHealthGrade = (ytdRevenue, ytdBudget) => {
            if (ytdBudget === undefined || ytdRevenue === undefined || ytdBudget === null || ytdRevenue === null || ytdBudget === 0) {
                return 'N/A';
            }
            
            const percentage = (ytdRevenue / ytdBudget) * 100;

            if (percentage >= 126) return 'A+';
            if (percentage >= 118) return 'A';
            if (percentage >= 110) return 'A-';
            if (percentage >= 104) return 'B+';
            if (percentage >= 98) return 'B';
            if (percentage >= 92) return 'B-';
            if (percentage >= 86) return 'C+';
            if (percentage >= 80) return 'C';
            if (percentage >= 74) return 'C-';
            if (percentage >= 70) return 'D+';
            if (percentage >= 66) return 'D';
            if (percentage >= 60) return 'D-';
            return 'F';
        };

        // Helper function to determine market trend
        const calculateMarketTrend = (market, region) => {
            if (!financialData || financialData.length === 0) return null;

            // Filter financial data for this specific market
            const marketFinancialData = financialData.filter(fd =>
                fd.market === market && fd.region === region
            );

            if (marketFinancialData.length < 2) return null;

            // Sort by month to get current and previous
            const sortedData = _.orderBy(marketFinancialData, ['month'], ['desc']);
            const currentMonth = sortedData[0];
            const previousMonth = sortedData[1];

            if (!currentMonth || !previousMonth) return null;

            const currentRevenue = currentMonth.monthly_revenue || 0;
            const previousRevenue = previousMonth.monthly_revenue || 0;

            if (currentRevenue > previousRevenue) {
                return { direction: 'up', text: 'Trending up' };
            } else if (currentRevenue < previousRevenue) {
                return { direction: 'down', text: 'Trending down' };
            }
            return null;
        };
        
        // New helper function to determine region trend
        const calculateRegionTrend = (region) => {
            if (!allFinancialData || allFinancialData.length === 0 || !filters) return null;

            const { periodType, year, month, quarter } = filters;

            let currentPeriodMonths = [];
            let previousPeriodMonths = [];

            if (periodType === 'monthly') {
                currentPeriodMonths.push(`${year}-${String(month).padStart(2, '0')}`);
                const prevDate = new Date(year, month - 2, 1); // Get date for month before previous
                previousPeriodMonths.push(`${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`);
            } else if (periodType === 'quarterly') {
                const startMonth = (quarter - 1) * 3 + 1;
                for (let i = 0; i < 3; i++) currentPeriodMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
                
                const prevQuarter = quarter === 1 ? 4 : quarter - 1;
                const prevYear = quarter === 1 ? year - 1 : year;
                const prevStartMonth = (prevQuarter - 1) * 3 + 1;
                for (let i = 0; i < 3; i++) previousPeriodMonths.push(`${prevYear}-${String(prevStartMonth + i).padStart(2, '0')}`);
            } else { // yearly
                return null; // Trend is not applicable for yearly view in this context, or requires comparison to previous year's full data.
            }
            
            const getRevenueForPeriod = (months) => {
                return allFinancialData
                    .filter(fd => fd.region === region && months.includes(fd.month))
                    .reduce((sum, fd) => sum + (fd.monthly_revenue || 0), 0);
            };

            const currentRevenue = getRevenueForPeriod(currentPeriodMonths);
            const previousRevenue = getRevenueForPeriod(previousPeriodMonths);

            if (currentRevenue > previousRevenue) {
                return { direction: 'up', text: 'Trending up vs. previous period' };
            } else if (currentRevenue < previousRevenue) {
                return { direction: 'down', text: 'Trending down vs. previous period' };
            }
            return null;
        };

        // CRITICAL FIX: Include ALL commentary types and ensure no markets are filtered out
        const forecastCommentaries = (financialData || [])
            .filter(fd => fd.forecast_commentary)
            .map(fd => ({
                market: fd.market,
                region: fd.region,
                type: 'forecast',
                content: fd.forecast_commentary,
                outlook: fd.year_end_outlook,
                month: fd.month
            }));

        const financialDataCommentaries = (financialData || [])
            .filter(fd => fd.commentary)
            .map(fd => ({
                market: fd.market,
                region: fd.region,
                type: 'financial_data',
                content: fd.commentary,
                month: fd.month
            }));

        const allCommentaries = _.uniqWith([...financialDataCommentaries, ...forecastCommentaries], _.isEqual);

        // CRITICAL FIX: Also include markets that have financial data but no commentary
        // This ensures So Cal and Nor Cal show up even if they don't have commentary yet
        const marketsWithFinancialData = _.uniq(financialData.map(fd => `${fd.region}-${fd.market}`));
        
        marketsWithFinancialData.forEach(marketKey => {
            const [region, market] = marketKey.split('-');
            const hasCommentary = allCommentaries.some(c => c.market === market && c.region === region && c.content !== null); // Check for actual content
            
            // Only add placeholder if there's no actual commentary and we're looking at a specific region
            if (!hasCommentary && filters.region !== 'all' && region === filters.region) {
                // Add placeholder so market still shows up
                const latestData = _.orderBy(
                    financialData.filter(fd => fd.market === market && fd.region === region),
                    ['month'],
                    ['desc']
                )[0];
                
                if (latestData) {
                    allCommentaries.push({
                        market: market,
                        region: region,
                        type: 'financial_data',
                        content: null, // No commentary yet
                        month: latestData.month
                    });
                }
            }
        });

        // Helper to calculate YTD from monthly data if YTD fields are empty/0
        const calculateYTD = (market, region) => {
            const marketData = allFinancialData.filter(fd => 
                fd.market === market && 
                fd.region === region &&
                fd.month && fd.month.startsWith(filters.year.toString())
            );
            
            const ytdRevenue = marketData.reduce((sum, fd) => sum + (fd.monthly_revenue || 0), 0);
            const ytdBudget = marketData.reduce((sum, fd) => sum + (fd.monthly_budget || 0), 0);
            
            return { ytdRevenue, ytdBudget };
        };

        if (filters.region === 'all') {
            const groupedByRegion = _.groupBy(allCommentaries, 'region');
            return Object.entries(groupedByRegion).map(([region, regionComments]) => {
                const groupedByMarket = _.groupBy(regionComments, 'market');
                const markets = Object.entries(groupedByMarket).map(([market, marketComments]) => {
                        const marketFinancialData = financialData.filter(fd => fd.market === market && fd.region === region);
                        const latestData = _.orderBy(marketFinancialData, ['month'], ['desc'])[0];

                        // Use manual YTD if available and non-zero, otherwise calculate from monthly
                        let ytdRevenue = latestData?.ytd_revenue;
                        let ytdBudget = latestData?.ytd_budget;
                        
                        if (!ytdRevenue || !ytdBudget) {
                            const calculated = calculateYTD(market, region);
                            ytdRevenue = ytdRevenue || calculated.ytdRevenue;
                            ytdBudget = ytdBudget || calculated.ytdBudget;
                        }

                        return {
                            market,
                            commentaries: marketComments.filter(c => c.content),
                            healthGrade: calculateHealthGrade(ytdRevenue, ytdBudget),
                            trend: calculateMarketTrend(market, region),
                            ytdRevenue,
                            ytdBudget,
                        };
                    });

                const regionTotals = markets.reduce((acc, market) => {
                    acc.ytdRevenue += market.ytdRevenue || 0;
                    acc.ytdBudget += market.ytdBudget || 0;
                    return acc;
                }, { ytdRevenue: 0, ytdBudget: 0 });

                return {
                    region,
                    markets,
                    regionYtdRevenue: regionTotals.ytdRevenue,
                    regionYtdBudget: regionTotals.ytdBudget,
                    healthGrade: calculateHealthGrade(regionTotals.ytdRevenue, regionTotals.ytdBudget),
                    trend: calculateRegionTrend(region),
                };
            }).filter(regionGroup => regionGroup.markets.length > 0);
        } else {
            const groupedByMarket = _.groupBy(allCommentaries, 'market');
            return Object.entries(groupedByMarket).map(([market, comments]) => {
                const marketFinancialData = financialData.filter(fd => fd.market === market && fd.region === filters.region);
                const latestData = _.orderBy(marketFinancialData, ['month'], ['desc'])[0];

                // Use manual YTD if available and non-zero, otherwise calculate from monthly
                let ytdRevenue = latestData?.ytd_revenue;
                let ytdBudget = latestData?.ytd_budget;
                
                if (!ytdRevenue || !ytdBudget) {
                    const calculated = calculateYTD(market, filters.region);
                    ytdRevenue = ytdRevenue || calculated.ytdRevenue;
                    ytdBudget = ytdBudget || calculated.ytdBudget;
                }

                return {
                    market,
                    commentaries: comments.filter(c => c.content),
                    healthGrade: calculateHealthGrade(ytdRevenue, ytdBudget),
                    trend: calculateMarketTrend(market, filters.region),
                    ytdRevenue,
                    ytdBudget,
                };
            });
        }
    }, [submissions, financialData, allFinancialData, filters]);

    // Calculate summary totals - moved before early returns
    const summaryTotals = useMemo(() => {
        if (commentaryData.length === 0) return { totalRevenue: 0, totalBudget: 0, totalPercentage: 0 };

        let totalRevenue = 0;
        let totalBudget = 0;

        if (filters && filters.region === 'all') {
            // For "all regions" view, sum up regional totals
            commentaryData.forEach(({ regionYtdRevenue, regionYtdBudget }) => {
                totalRevenue += regionYtdRevenue || 0;
                totalBudget += regionYtdBudget || 0;
            });
        } else {
            // For single region view, sum up market totals
            commentaryData.forEach(({ ytdRevenue, ytdBudget }) => {
                totalRevenue += ytdRevenue || 0;
                totalBudget += ytdBudget || 0;
            });
        }

        const totalPercentage = totalBudget > 0 ? (totalRevenue / totalBudget) * 100 : 0;

        return { totalRevenue, totalBudget, totalPercentage };
    }, [commentaryData, filters]);


    if (loading) {
        return (
            <Card className="shadow-lg bg-slate-600">
                <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </CardContent>
            </Card>
        );
    }

    // Only render the component if there is commentary data to display (either actual or placeholder markets)
    // If no commentaryData and no financialData, return null, already handled by commentaryData useMemo.
    if (commentaryData.length === 0) {
      return null;
    }

    const getOutlookIcon = (outlook) => {
        if (outlook?.includes('Exceed')) return <TrendingUp className="w-4 h-4 text-green-500" />;
        if (outlook?.includes('Below') || outlook?.includes('Miss')) return <TrendingDown className="w-4 h-4 text-red-500" />;
        return null;
    };

    const getCommentaryTypeLabel = (type) => {
        switch(type) {
            case 'financial': return 'Financial Overview';
            case 'forecast': return 'Year End Forecast';
            case 'financial_data': return 'Monthly Performance Commentary';
            default: return 'Commentary';
        }
    };

    const formatCurrency = (value) => {
        if (value === undefined || value === null) return 'N/A';
        return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const renderCommentaryList = (commentaries) => {
        // If commentaries is empty after filtering out null content, display a message.
        if (commentaries.length === 0) {
            return (
                <div className="bg-slate-700 border border-slate-500 rounded-lg p-4 mt-4 first:mt-2">
                    <p className="text-sm text-slate-400 italic">No commentary available for this period.</p>
                </div>
            );
        }

        const groupedByMonth = _.groupBy(commentaries, 'month');
        // Sort months in descending order (e.g., "2025-12" before "2025-11")
        const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

        return sortedMonths.map((month, monthIndex) => {
            const monthCommentaries = groupedByMonth[month];
            return (
                <div key={monthIndex} className="bg-slate-700 border border-slate-500 rounded-lg p-4 mt-4 first:mt-2">
                    <h4 className="font-semibold text-slate-200 mb-3 border-b border-slate-500 pb-2">
                        {format(new Date(`${month}-01T12:00:00`), 'MMMM yyyy')} - Financial Overview & Forecast
                    </h4>
                    <div className="space-y-4">
                        {monthCommentaries.map((comment, commentIndex) => (
                            <div key={commentIndex} className="text-sm text-slate-200">
                                 <p className="font-semibold text-slate-400 text-xs uppercase mb-1">{getCommentaryTypeLabel(comment.type)}</p>
                                 {comment.type === 'forecast' && comment.outlook && (
                                     <div className="flex items-center gap-2 font-medium mb-1 text-slate-200">
                                         {getOutlookIcon(comment.outlook)}
                                         <span>{comment.outlook}</span>
                                     </div>
                                 )}
                                 <p className="leading-relaxed">{comment.content}</p>
                            </div>
                        ))}
                    </div>
                </div>
            );
        });
    };

    const getCommentaryTitle = () => {
        return "YTD Progress & Year-End Forecast";
    };

    return (
        <Card className="shadow-lg bg-slate-600">
            <CardHeader>
                <CardTitle className="text-white font-semibold leading-none tracking-tight flex items-center gap-2">
                    <BookText className="w-5 h-5 text-blue-400" />
                    {getCommentaryTitle()}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Accordion type="multiple" className="w-full">
                    {filters && filters.region === 'all'
                        ? commentaryData.map(({ region, markets, regionYtdRevenue, regionYtdBudget, healthGrade, trend }) => (
                            <AccordionItem value={region} key={region} className="border-slate-500">
                                <AccordionTrigger className="font-bold text-xl text-white hover:no-underline">
                                    <div className="flex items-center justify-between w-full pr-4">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span>{region}</span>
                                            {getHealthGradeBadge(healthGrade, true)}
                                            {getTrendIndicator(trend)}
                                        </div>
                                        <div className="hidden lg:flex items-center gap-4 text-right">
                                            {regionYtdBudget > 0 && (
                                                <div className="grid grid-cols-3 gap-x-4 text-center items-center">
                                                    <div>
                                                        <p className="text-xs text-slate-400 uppercase">YTD Revenue</p>
                                                        <p className="text-base font-bold text-white">{formatCurrency(regionYtdRevenue)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 uppercase">YTD Budget</p>
                                                        <p className="text-base font-bold text-white">{formatCurrency(regionYtdBudget)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-slate-400 uppercase">% of Budget</p>
                                                        <p className="text-base font-bold text-white">
                                                            {((regionYtdRevenue / regionYtdBudget) * 100).toFixed(1) + '%'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="pl-4 border-l-2 border-slate-500 ml-2">
                                    {/* RMD YTD Commentary - Show automatically from live data */}
                                    {ytdCommentaryByRegion[region] && (
                                        <div className="mb-6 bg-slate-700/70 rounded-lg p-4 border border-slate-500">
                                            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">RMD YTD Commentary and year end outlook</p>
                                            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                                                {ytdCommentaryByRegion[region]}
                                            </p>
                                        </div>
                                    )}
                                    
                                    <Accordion type="multiple" className="w-full">
                                        {markets.map(({ market, commentaries, healthGrade, trend, ytdRevenue, ytdBudget }) => (
                                            <AccordionItem value={`${region}-${market}`} key={`${region}-${market}`} className="border-slate-500">
                                                <AccordionTrigger className="font-semibold text-lg text-slate-200 hover:no-underline py-4">
                                                    <div className="flex items-center justify-between w-full pr-4">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                          <span>{market}</span>
                                                          {getHealthGradeBadge(healthGrade)}
                                                          {getTrendIndicator(trend)}
                                                        </div>
                                                        {ytdBudget !== undefined && ytdBudget > 0 && (
                                                            <div className="hidden md:grid grid-cols-3 gap-x-6 text-center items-center">
                                                                <div>
                                                                    <p className="text-xs text-slate-400 uppercase">YTD Revenue</p>
                                                                    <p className="text-sm font-bold text-white">{formatCurrency(ytdRevenue)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-slate-400 uppercase">YTD Budget</p>
                                                                    <p className="text-sm font-bold text-white">{formatCurrency(ytdBudget)}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs text-slate-400 uppercase">% of Budget</p>
                                                                    <p className="text-sm font-bold text-white">
                                                                        {((ytdRevenue / ytdBudget) * 100).toFixed(1) + '%'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className="space-y-4 pt-2">
                                                    {renderCommentaryList(commentaries)}
                                                </AccordionContent>
                                            </AccordionItem>
                                        ))}
                                    </Accordion>
                                </AccordionContent>
                            </AccordionItem>
                        ))
                        : commentaryData.map(({ market, commentaries, healthGrade, trend, ytdRevenue, ytdBudget }) => (
                            <AccordionItem value={market} key={market} className="border-slate-500">
                                <AccordionTrigger className="font-bold text-lg text-white hover:no-underline py-4">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full pr-4 gap-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <span>{market}</span>
                                            {getHealthGradeBadge(healthGrade)}
                                            {getTrendIndicator(trend)}
                                        </div>
                                         {ytdBudget !== undefined && ytdBudget > 0 && (
                                            <div className="grid grid-cols-3 gap-x-4 sm:gap-x-6 text-center items-center">
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase">YTD Revenue</p>
                                                    <p className="text-sm font-bold text-white">{formatCurrency(ytdRevenue)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase">YTD Budget</p>
                                                    <p className="text-sm font-bold text-white">{formatCurrency(ytdBudget)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-slate-400 uppercase">% of Budget</p>
                                                    <p className="text-sm font-bold text-white">
                                                        {((ytdRevenue / ytdBudget) * 100).toFixed(1) + '%'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pt-2">
                                    {renderCommentaryList(commentaries)}
                                </AccordionContent>
                            </AccordionItem>
                        ))
                    }
                </Accordion>
                
                {/* Summary Totals */}
                {commentaryData.length > 0 && summaryTotals.totalBudget > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-500">
                        <div className="bg-slate-700 rounded-lg p-4">
                            <h3 className="text-white font-bold text-lg mb-3 text-center">YTD Summary</h3>
                            <div className="grid grid-cols-3 gap-x-6 text-center">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase mb-1">Total YTD Revenue</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(summaryTotals.totalRevenue)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase mb-1">Total YTD Budget</p>
                                    <p className="text-lg font-bold text-white">{formatCurrency(summaryTotals.totalBudget)}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 uppercase mb-1">Overall % of Budget</p>
                                    <p className={`text-lg font-bold ${summaryTotals.totalPercentage >= 100 ? 'text-green-400' : summaryTotals.totalPercentage >= 85 ? 'text-yellow-400' : 'text-red-400'}`}>
                                        {summaryTotals.totalPercentage.toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}