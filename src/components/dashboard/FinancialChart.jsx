
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign } from 'lucide-react';

export default function FinancialChart({ financialData, submissions, filters, loading }) {
  const chartData = React.useMemo(() => {
    const dataByMarket = {};

    // Note: The financialData and submissions props are already pre-filtered by the parent dashboard component.
    
    financialData.forEach(item => {
      if (!dataByMarket[item.market]) {
        dataByMarket[item.market] = { market: item.market, revenue: 0, budget: 0, forecast: 0 };
      }
      dataByMarket[item.market].revenue += item.monthly_revenue;
      dataByMarket[item.market].budget += item.monthly_budget;
    });

    submissions.forEach(submission => {
      if (submission.year_end_forecasts) {
        Object.entries(submission.year_end_forecasts).forEach(([market, data]) => {
          if (!dataByMarket[market]) {
            dataByMarket[market] = { market, revenue: 0, budget: 0, forecast: 0 };
          }
          // Note: Forecast is a point-in-time value, not a sum. We'll just take the latest one if multiple submissions exist.
          if (data.forecast) {
             dataByMarket[market].forecast = data.forecast;
          }
        });
      }
    });

    return Object.values(dataByMarket);
  }, [financialData, submissions, filters]);

  const formatYAxis = (tick) => {
    return `$${(tick / 1000000).toFixed(0)}M`;
  };

  if (loading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Financial Performance by Market
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="market" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatYAxis} fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip
              formatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(4px)',
                border: '1px solid #e2e8f0',
                borderRadius: '0.5rem',
              }}
            />
            <Legend iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey="revenue" fill="#1e3a8a" name="Revenue" radius={[4, 4, 0, 0]} />
            <Bar dataKey="budget" fill="#3b82f6" name="Budget" radius={[4, 4, 0, 0]} />
            <Bar dataKey="forecast" fill="#94a3b8" name="Forecast" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
