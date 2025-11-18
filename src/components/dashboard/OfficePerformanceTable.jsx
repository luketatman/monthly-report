
import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, BarChartHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import _ from 'lodash';
import { format } from 'date-fns';

export default function OfficePerformanceTable({ financialData, submissions, loading, filters }) {
  const [expandedRegions, setExpandedRegions] = useState({});
  const [expandedMarkets, setExpandedMarkets] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'revenue', direction: 'desc' });

  const monthlyCommentaryByRegion = useMemo(() => {
    if (!submissions || filters.periodType !== 'monthly') return {};

    const commentaries = {};
    const currentMonthStr = `${filters.year}-${String(filters.month).padStart(2, '0')}`;

    submissions.forEach(sub => {
      // Ensure sub.month is in "YYYY-MM" format before comparison
      const submissionMonthStr = sub.month.length === 6 ? `${sub.month.substring(0,4)}-${sub.month.substring(4,6)}` : sub.month;
      
      if (submissionMonthStr === currentMonthStr && sub.rmd_regional_commentary) {
        // Find the latest submission for that region for that month, just in case
        if (!commentaries[sub.region] || new Date(sub.updated_date) > new Date(commentaries[sub.region].updated_date)) {
           commentaries[sub.region] = {
             commentary: sub.rmd_regional_commentary,
             updated_date: sub.updated_date
           };
        }
      }
    });

    return _.mapValues(commentaries, 'commentary');
  }, [submissions, filters]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedHierarchicalData = useMemo(() => {
    if (!financialData || financialData.length === 0) return [];

    const groupedByRegion = _.groupBy(financialData, 'region');

    let regions = Object.entries(groupedByRegion).map(([regionName, regionFinancials]) => {
      // Group financials by market to aggregate them for quarterly/yearly views
      const groupedByMarket = _.groupBy(regionFinancials, 'market');

      let markets = Object.entries(groupedByMarket).map(([marketName, marketFinancials]) => {
        // Aggregate the financials for the market over the period
        const aggregatedData = marketFinancials.reduce((acc, data) => {
          acc.revenue += data.monthly_revenue || 0;
          acc.budget += data.monthly_budget || 0;
          acc.reforecast += data.monthly_reforecast || 0;
          return acc;
        }, { revenue: 0, budget: 0, reforecast: 0 });
        
        // Combine commentaries from each month, sorted chronologically
        const sortedMarketFinancials = _.orderBy(marketFinancials, ['month'], ['asc']);
        const combinedCommentary = sortedMarketFinancials
          .map(d => d.commentary ? `--- ${format(new Date(`${d.month}-02`), 'MMMM yyyy')} ---\n${d.commentary}` : null)
          .filter(Boolean)
          .join('\n\n');

        const performance = aggregatedData.budget > 0 ? (aggregatedData.revenue / aggregatedData.budget) * 100 : 0;
        const reforecastPerformance = aggregatedData.reforecast > 0 ? (aggregatedData.revenue / aggregatedData.reforecast) * 100 : 0;
        
        return {
          market: marketName,
          revenue: aggregatedData.revenue,
          budget: aggregatedData.budget,
          reforecast: aggregatedData.reforecast,
          performance,
          reforecastPerformance,
          budgetVariance: aggregatedData.revenue - aggregatedData.budget,
          reforecastVariance: aggregatedData.revenue - aggregatedData.reforecast,
          commentary: combinedCommentary || null,
        };
      });

      // Sort markets within the region
      if (sortConfig.key === 'market') {
        markets = _.orderBy(markets, [m => m.market.toLowerCase()], [sortConfig.direction]);
      } else {
        markets = _.orderBy(markets, [sortConfig.key], [sortConfig.direction]);
      }

      const regionTotals = markets.reduce((acc, market) => {
        acc.revenue += market.revenue;
        acc.budget += market.budget;
        acc.reforecast += market.reforecast;
        return acc;
      }, { revenue: 0, budget: 0, reforecast: 0 });
      
      const totalPerformance = regionTotals.budget > 0 ? (regionTotals.revenue / regionTotals.budget) * 100 : 0;
      const totalReforecastPerformance = regionTotals.reforecast > 0 ? (regionTotals.revenue / regionTotals.reforecast) * 100 : 0;

      return {
        isRegion: true,
        name: regionName,
        revenue: regionTotals.revenue,
        budget: regionTotals.budget,
        reforecast: regionTotals.reforecast,
        performance: totalPerformance,
        reforecastPerformance: totalReforecastPerformance,
        budgetVariance: regionTotals.revenue - regionTotals.budget,
        reforecastVariance: regionTotals.revenue - regionTotals.reforecast,
        markets: markets,
      };
    });

    // Sort the regions themselves
    if (sortConfig.key === 'name') {
      regions = _.orderBy(regions, [r => r.name.toLowerCase()], [sortConfig.direction]);
    } else {
      regions = _.orderBy(regions, [sortConfig.key], [sortConfig.direction]);
    }

    return regions;

  }, [financialData, sortConfig]);

  const allTotals = useMemo(() => {
    const totals = sortedHierarchicalData.reduce((acc, region) => {
      acc.revenue += region.revenue;
      acc.budget += region.budget;
      acc.reforecast += region.reforecast;
      return acc;
    }, { revenue: 0, budget: 0, reforecast: 0 });
    
    totals.performance = totals.budget > 0 ? (totals.revenue / totals.budget) * 100 : 0;
    totals.reforecastPerformance = totals.reforecast > 0 ? (totals.revenue / totals.reforecast) * 100 : 0;
    totals.budgetVariance = totals.revenue - totals.budget;
    totals.reforecastVariance = totals.revenue - totals.reforecast;

    return totals;
  }, [sortedHierarchicalData]);
  
  if (loading) {
    return (
      <Card className="shadow-lg bg-slate-600">
        <CardHeader><Skeleton className="h-8 w-1/2 bg-slate-700" /></CardHeader>
        <CardContent><Skeleton className="h-64 w-full bg-slate-700" /></CardContent>
      </Card>
    );
  }

  const formatCurrency = (value) => value ? `$${Math.round(value).toLocaleString()}` : '$0';
  const formatPercentage = (value) => value ? `${value.toFixed(1)}%` : '0.0%';
  const getPerformanceColor = (p) => p >= 100 ? 'text-green-400' : p >= 85 ? 'text-yellow-400' : 'text-red-400';
  const getTrendIcon = (p) => p >= 100 ? <TrendingUp className="w-4 h-4" /> : p >= 85 ? <Minus className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />;
  
  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 ml-1 text-slate-400" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ArrowUp className="w-3 h-3 ml-1 text-white" />;
    }
    return <ArrowDown className="w-3 h-3 ml-1 text-white" />;
  };

  const toggleRegion = (regionName) => {
    setExpandedRegions(prev => ({ ...prev, [regionName]: !prev[regionName] }));
  };

  const toggleMarket = (marketKey) => {
    setExpandedMarkets(prev => ({ ...prev, [marketKey]: !prev[marketKey] }));
  };

  return (
    <Card className="shadow-lg bg-slate-600">
      <CardHeader>
        <CardTitle className="text-white font-semibold flex items-center gap-2">
          <BarChartHorizontal className="w-5 h-5 text-blue-400" />
          Monthly Finance Overview
        </CardTitle>
        <CardDescription className="text-slate-300 pt-1">
          Collapsible overview of financial performance by region and office. Commentary is attached where available.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                <TableHead className="text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('name')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">Region / Market {getSortIcon('name')}</Button>
                </TableHead>
                <TableHead className="text-right text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('revenue')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">Revenue {getSortIcon('revenue')}</Button>
                </TableHead>
                <TableHead className="text-right text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('budget')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">Budget {getSortIcon('budget')}</Button>
                </TableHead>
                <TableHead className="text-right text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('reforecast')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">Reforecast {getSortIcon('reforecast')}</Button>
                </TableHead>
                <TableHead className="text-center text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('performance')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-center">% to Budget {getSortIcon('performance')}</Button>
                </TableHead>
                <TableHead className="text-center text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('reforecastPerformance')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-center">% to Reforecast {getSortIcon('reforecastPerformance')}</Button>
                </TableHead>
                <TableHead className="text-right text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('budgetVariance')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">Var vs Budget {getSortIcon('budgetVariance')}</Button>
                </TableHead>
                <TableHead className="text-right text-white font-semibold">
                  <Button variant="ghost" onClick={() => handleSort('reforecastVariance')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">Var vs Reforecast {getSortIcon('reforecastVariance')}</Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedHierarchicalData.length > 0 ? (
                sortedHierarchicalData.map(region => (
                  <React.Fragment key={region.name}>
                    <TableRow className="bg-slate-800 border-t-2 border-b-slate-500 hover:bg-slate-700 cursor-pointer" onClick={() => toggleRegion(region.name)}>
                      <TableCell className="font-bold text-lg text-white flex items-center gap-2">
                        {expandedRegions[region.name] ? <ChevronDown /> : <ChevronRight />}
                        {region.name}
                      </TableCell>
                      <TableCell className="text-right font-bold text-lg text-white">{formatCurrency(region.revenue)}</TableCell>
                      <TableCell className="text-right font-bold text-lg text-slate-300">{formatCurrency(region.budget)}</TableCell>
                      <TableCell className="text-right font-bold text-lg text-slate-300">{formatCurrency(region.reforecast)}</TableCell>
                      <TableCell className={`text-center font-bold text-lg ${getPerformanceColor(region.performance)}`}>{formatPercentage(region.performance)}</TableCell>
                      <TableCell className={`text-center font-bold text-lg ${getPerformanceColor(region.reforecastPerformance)}`}>{formatPercentage(region.reforecastPerformance)}</TableCell>
                      <TableCell className={`text-right font-bold text-lg ${region.budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{region.budgetVariance >= 0 ? '+' : ''}{formatCurrency(region.budgetVariance)}</TableCell>
                      <TableCell className={`text-right font-bold text-lg ${region.reforecastVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{region.reforecastVariance >= 0 ? '+' : ''}{formatCurrency(region.reforecastVariance)}</TableCell>
                    </TableRow>
                    
                    {expandedRegions[region.name] && (
                      <>
                        {/* RMD Regional Commentary Row - Now shown automatically if available */}
                        {monthlyCommentaryByRegion[region.name] && (
                          <TableRow className="bg-slate-700/70">
                            <TableCell colSpan={8} className="py-4 px-10">
                              <div className="bg-slate-600 rounded-lg p-4 border border-slate-500">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">RMD Regional Commentary</p>
                                <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                                  {monthlyCommentaryByRegion[region.name]}
                                </p>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}

                        {/* Market Rows */}
                        {region.markets.map(market => {
                          const marketKey = `${region.name}-${market.market}`;
                          return (
                            <React.Fragment key={marketKey}>
                              <TableRow className="hover:bg-slate-700" onClick={() => market.commentary && toggleMarket(marketKey)}>
                                <TableCell className={`font-medium text-white pl-8 flex items-center gap-2 ${market.commentary ? 'cursor-pointer' : ''}`}>
                                   {market.commentary ? (expandedMarkets[marketKey] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>) : <div className="w-4 h-4" />}
                                   {market.market}
                                </TableCell>
                                <TableCell className="text-right text-slate-200">{formatCurrency(market.revenue)}</TableCell>
                                <TableCell className="text-right text-slate-300">{formatCurrency(market.budget)}</TableCell>
                                <TableCell className="text-right text-slate-300">{formatCurrency(market.reforecast)}</TableCell>
                                <TableCell className={`text-center font-medium ${getPerformanceColor(market.performance)}`}>{formatPercentage(market.performance)}</TableCell>
                                <TableCell className={`text-center font-medium ${getPerformanceColor(market.reforecastPerformance)}`}>{formatPercentage(market.reforecastPerformance)}</TableCell>
                                <TableCell className={`text-right font-medium ${market.budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{market.budgetVariance >= 0 ? '+' : ''}{formatCurrency(market.budgetVariance)}</TableCell>
                                <TableCell className={`text-right font-medium ${market.reforecastVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{market.reforecastVariance >= 0 ? '+' : ''}{formatCurrency(market.reforecastVariance)}</TableCell>
                              </TableRow>

                              {expandedMarkets[marketKey] && market.commentary && (
                                  <TableRow className="bg-slate-700/50">
                                      <TableCell colSpan={8} className="py-3 px-10">
                                          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">MD Commentary</p>
                                          <p className="text-sm text-slate-200 whitespace-pre-wrap">{market.commentary}</p>
                                      </TableCell>
                                  </TableRow>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow><TableCell colSpan={8} className="text-center h-24 text-slate-300">No financial data for this period.</TableCell></TableRow>
              )}
            </TableBody>
            <TableFooter>
                <TableRow className="bg-slate-800 border-t-2 border-slate-500">
                    <TableCell className="font-bold text-lg text-white">Total</TableCell>
                    <TableCell className="text-right font-bold text-lg text-white">{formatCurrency(allTotals.revenue)}</TableCell>
                    <TableCell className="text-right font-bold text-lg text-slate-300">{formatCurrency(allTotals.budget)}</TableCell>
                    <TableCell className="text-right font-bold text-lg text-slate-300">{formatCurrency(allTotals.reforecast)}</TableCell>
                    <TableCell className={`text-center font-bold text-lg ${getPerformanceColor(allTotals.performance)}`}>{formatPercentage(allTotals.performance)}</TableCell>
                    <TableCell className={`text-center font-bold text-lg ${getPerformanceColor(allTotals.reforecastPerformance)}`}>{formatPercentage(allTotals.reforecastPerformance)}</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${allTotals.budgetVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{allTotals.budgetVariance >= 0 ? '+' : ''}{formatCurrency(allTotals.budgetVariance)}</TableCell>
                    <TableCell className={`text-right font-bold text-lg ${allTotals.reforecastVariance >= 0 ? 'text-green-400' : 'text-red-400'}`}>{allTotals.reforecastVariance >= 0 ? '+' : ''}{formatCurrency(allTotals.reforecastVariance)}</TableCell>
                </TableRow>
            </TableFooter>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
