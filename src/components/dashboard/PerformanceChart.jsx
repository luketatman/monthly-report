
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Target } from 'lucide-react';
import _ from 'lodash';

// Renamed from formatYAxis to formatCurrency as implied by outline
const formatCurrency = (value) => {
  return `$${(value / 1000000).toFixed(0)}M`;
};

export default function PerformanceChart({ financialData, submissions, filters, loading }) {
  const chartData = useMemo(() => {
    if (!financialData || financialData.length === 0) return [];

    const isAllRegionsView = filters.region === 'all';
    // Group by region for "All Regions" view, otherwise group by market for single-region views.
    const groupByKey = isAllRegionsView ? 'region' : 'market';
    const dataByGroup = _.groupBy(financialData, groupByKey);

    const result = Object.entries(dataByGroup).map(([groupName, records]) => {
      // Logic for YTD values when periodType is 'yearly'
      if (filters.periodType === 'yearly') {
        // Aggregate YTD values across all records in the group (region or market)
        const ytdRevenue = records.reduce((acc, record) => acc + (record.ytd_revenue || 0), 0);
        const ytdBudget = records.reduce((acc, record) => acc + (record.ytd_budget || 0), 0);
        
        // Aggregate reforecast across all records for the year for this group
        const yearlyReforecast = records.reduce((acc, record) => acc + (record.monthly_reforecast || 0), 0);

        return {
          name: groupName, // The XAxis dataKey will be region name or market name
          revenue: ytdRevenue,
          budget: ytdBudget,
          reforecast: yearlyReforecast,
        };
      } else { // Logic for monthly or quarterly sums
        const aggregated = records.reduce((acc, record) => {
          acc.revenue += record.monthly_revenue || 0;
          acc.budget += record.monthly_budget || 0;
          acc.reforecast += record.monthly_reforecast || 0;
          return acc;
        }, { revenue: 0, budget: 0, reforecast: 0 });

        return {
          name: groupName,
          ...aggregated
        };
      }
    });

    // Sorting the results by revenue descending
    return _.orderBy(result, ['revenue'], ['desc']);

  }, [financialData, filters]);

  if (loading) {
    return (
      <Card className="shadow-lg bg-slate-600">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isMonthlyView = filters.periodType === 'monthly';
  const isAllRegionsView = filters.region === 'all';

  return (
    <Card className="shadow-lg bg-slate-700">
      <CardHeader>
        <CardTitle className="text-white font-semibold leading-none tracking-tight flex items-center gap-2">
          {isMonthlyView ? <TrendingUp className="w-5 h-5" /> : <Target className="w-5 h-5" />}
          {isAllRegionsView
            ? (isMonthlyView ? 'Regional Performance vs Budget vs Re-forecast' : 'Regional Progress: YTD vs Budget vs Forecast')
            : (isMonthlyView ? 'Market Performance vs Budget vs Re-forecast' : 'Market Progress: YTD vs Budget vs Forecast')
          }
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }} barGap={-20}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={formatCurrency} fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(value, name) => {
                  return [`$${(value / 1000000).toFixed(2)}M`, name];
                }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(4px)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '0.5rem',
                }}
              />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
              
              {isAllRegionsView ? (
                <>
                  <Line dataKey="revenue" stroke="#1e3a8a" name={isMonthlyView ? "Actual Revenue" : "YTD Revenue"} strokeWidth={3} dot={{ r: 6 }} />
                  <Line dataKey="budget" stroke="#3b82f6" name={isMonthlyView ? "Budget" : "YTD Budget"} strokeWidth={2} strokeDasharray="5 5" dot={{ r: 4 }} />
                  <Line dataKey="reforecast" stroke="#dc2626" name={isMonthlyView ? "Monthly Re-forecast" : "Yearly Re-forecast"} strokeWidth={2} strokeDasharray="3 3" dot={{ r: 4 }} />
                </>
              ) : (
                <>
                  <Bar dataKey="revenue" fill="#1e3a8a" name={isMonthlyView ? "Actual Revenue" : "YTD Revenue"} />
                  <Bar dataKey="budget" fill="#3b82f6" name={isMonthlyView ? "Budget" : "YTD Budget"} />
                  <Bar dataKey="reforecast" fill="#dc2626" name={isMonthlyView ? "Monthly Re-forecast" : "Yearly Re-forecast"} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {chartData.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {chartData.map((item) => {
              let performance, reforecast_performance, budgetProgress, forecastProgress;

              if (isMonthlyView) {
                performance = item.budget > 0 ? ((item.revenue / item.budget) * 100) : 0;
                reforecast_performance = item.reforecast > 0 ? ((item.revenue / item.reforecast) * 100) : 0;
              } else {
                budgetProgress = item.budget > 0 ? ((item.revenue / item.budget) * 100) : 0;
                forecastProgress = item.reforecast > 0 ? ((item.revenue / item.reforecast) * 100) : 0;
              }

              return (
                <div key={item.name} className="bg-slate-700 rounded-lg p-3 text-center">
                  <p className="text-sm font-medium text-white">{item.name}</p>
                  <div className="space-y-1">
                    {isMonthlyView ? (
                      <>
                        <p className={`text-sm font-bold ${performance >= 100 ? 'text-green-400' : performance >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {performance.toFixed(1)}% of budget
                        </p>
                        <p className={`text-sm font-bold ${reforecast_performance >= 100 ? 'text-green-400' : reforecast_performance >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {reforecast_performance.toFixed(1)}% of re-forecast
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-sm font-bold ${budgetProgress >= 100 ? 'text-green-400' : budgetProgress >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {budgetProgress.toFixed(1)}% of the way to budget
                        </p>
                        <p className={`text-sm font-bold ${forecastProgress >= 100 ? 'text-green-400' : forecastProgress >= 75 ? 'text-blue-400' : 'text-amber-400'}`}>
                          {forecastProgress.toFixed(1)}% of the way to forecast
                        </p>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
