
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  TrendingUp,
  Award,
  Users,
  DollarSign,
  ClipboardList,
  Scale,
  Target,
  TrendingDown,
  Minus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formatCurrency = (value) => {
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(2)}M`;
  if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
  return `${sign}$${absValue.toLocaleString()}`;
};

export default function KPICards({ submissions, sentimentSubmissions, sentimentAverages, winLosses, pitches, personnelUpdates, financialData, loading, filters, onCardClick }) {

  // Financial Data Calculations
  const totalRevenue = React.useMemo(() => {
    if (filters.periodType === 'yearly') {
      const latestByMarket = {};
      financialData.forEach(item => {
        const key = `${item.region}-${item.market}`;
        if (!latestByMarket[key] || item.month > latestByMarket[key].month) {
          latestByMarket[key] = item;
        }
      });
      return Object.values(latestByMarket).reduce((sum, item) => sum + (item.ytd_revenue || 0), 0);
    } else {
      return financialData.reduce((sum, item) => sum + (item.monthly_revenue || 0), 0);
    }
  }, [financialData, filters.periodType]);

  const totalBudget = React.useMemo(() => {
    if (filters.periodType === 'yearly') {
      const latestByMarket = {};
      financialData.forEach(item => {
        const key = `${item.region}-${item.market}`;
        if (!latestByMarket[key] || item.month > latestByMarket[key].month) {
          latestByMarket[key] = item;
        }
      });
      return Object.values(latestByMarket).reduce((sum, item) => sum + (item.ytd_budget || 0), 0);
    } else {
      return financialData.reduce((sum, item) => sum + (item.monthly_budget || 0), 0);
    }
  }, [financialData, filters.periodType]);

  const totalReforecast = React.useMemo(() => {
    // Reforecast is typically a monthly or quarterly value. For yearly, we can sum latest available reforecasts.
    if (filters.periodType === 'yearly') {
        const latestByMarket = {};
        financialData.forEach(item => {
            const key = `${item.region}-${item.market}`;
            if (!latestByMarket[key] || item.month > latestByMarket[key].month) {
                latestByMarket[key] = item;
            }
        });
        // This assumes reforecast is captured monthly and we sum them for a YTD view, which may need adjustment based on business logic.
        // Sticking to summing monthly reforecasts for now.
        return financialData.reduce((sum, item) => sum + (item.monthly_reforecast || 0), 0);
    }
    return financialData.reduce((sum, item) => sum + (item.monthly_reforecast || 0), 0);
  }, [financialData, filters.periodType]);

  // Operational Metrics
  const avgSentiment = sentimentAverages?.current || 0;
  const sentimentTrend = sentimentAverages?.trend || 0;

  const netWinLossValue = React.useMemo(() => {
    return winLosses.reduce((sum, item) => {
      const revenue = item.budget_year_revenue_impact || 0;
      return sum + (item.outcome === 'Win' ? revenue : -revenue);
    }, 0);
  }, [winLosses]);

  const netPersonnelChange = React.useMemo(() => {
    return personnelUpdates.reduce((sum, p) => (p.status === "New Hire" || p.status === "Hired") ? sum + 1 : (p.status === "Terminated" || p.status === "Resigned") ? sum - 1 : sum, 0);
  }, [personnelUpdates]);

  const netPersonnelRevenueImpact = React.useMemo(() => {
    return personnelUpdates.reduce((sum, p) => {
      const impact = p.revenue_impact || 0;
      const isDeparture = p.status === 'Terminated' || p.status === 'Resigned';
      return sum + (isDeparture ? -Math.abs(impact) : Math.abs(impact));
    }, 0);
  }, [personnelUpdates]);

  const totalPitchRevenue = React.useMemo(() => {
    return pitches.reduce((sum, pitch) => sum + (pitch.budget_year_revenue_impact || 0), 0);
  }, [pitches]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array(8).fill(0).map((_, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-xl" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const revenueDelta = totalRevenue - totalBudget;
  const reforecastDelta = totalRevenue - totalReforecast;
  const SentimentTrendIcon = sentimentTrend > 0 ? TrendingUp : sentimentTrend < 0 ? TrendingDown : Minus;
  const sentimentTrendColor = sentimentTrend > 0 ? 'text-green-600' : sentimentTrend < 0 ? 'text-red-600' : 'text-slate-500';

  const cards = [
    {
      title: "Revenue for Period",
      value: `$${totalRevenue >= 1000000 ? (totalRevenue / 1000000).toFixed(2) + 'M' : totalRevenue >= 1000 ? (totalRevenue / 1000).toFixed(0) + 'K' : totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      gradient: "from-blue-50 to-blue-100",
      iconColor: "text-blue-600",
      bgColor: "bg-blue-500",
      onClick: () => onCardClick && onCardClick('financial')
    },
    {
      title: "Period Budget",
      value: `$${totalBudget >= 1000000 ? (totalBudget / 1000000).toFixed(2) + 'M' : totalBudget >= 1000 ? (totalBudget / 1000).toFixed(0) + 'K' : totalBudget.toLocaleString()}`,
      icon: ClipboardList,
      gradient: "from-slate-100 to-slate-200",
      iconColor: "text-slate-600",
      bgColor: "bg-slate-500",
      onClick: () => onCardClick && onCardClick('financial')
    },
    {
      title: "Period Forecast",
      value: `$${totalReforecast >= 1000000 ? (totalReforecast / 1000000).toFixed(2) + 'M' : totalReforecast >= 1000 ? (totalReforecast / 1000).toFixed(0) + 'K' : totalReforecast.toLocaleString()}`,
      icon: ClipboardList,
      gradient: "from-amber-50 to-amber-100",
      iconColor: "text-amber-600",
      bgColor: "bg-amber-500",
      onClick: () => onCardClick && onCardClick('financial')
    },
    {
      type: 'delta',
      title: "Period Delta",
      budgetDelta: {
          label: "vs Budget",
          value: `${revenueDelta < 0 ? '-' : ''}${revenueDelta > 0 ? '+' : ''}$${Math.abs(revenueDelta) >= 1000000 ? (Math.abs(revenueDelta) / 1000000).toFixed(2) + 'M' : Math.abs(revenueDelta) >= 1000 ? (Math.abs(revenueDelta) / 1000).toFixed(0) + 'K' : Math.abs(revenueDelta).toLocaleString()}`
      },
      reforecastDelta: {
          label: "vs Forecast",
          value: `${reforecastDelta < 0 ? '-' : ''}${reforecastDelta > 0 ? '+' : ''}$${Math.abs(reforecastDelta) >= 1000000 ? (Math.abs(reforecastDelta) / 1000000).toFixed(2) + 'M' : Math.abs(reforecastDelta) >= 1000 ? (Math.abs(reforecastDelta) / 1000).toFixed(0) + 'K' : Math.abs(reforecastDelta).toLocaleString()}`
      },
      icon: Scale,
      gradient: "from-sky-50 to-sky-100",
      iconColor: "text-sky-600",
      bgColor: "bg-sky-500",
      onClick: () => onCardClick && onCardClick('financial')
    },
    {
      title: "New Forecasted 2025 Revenue from pitches this period",
      value: `+$${totalPitchRevenue >= 1000000 ? (totalPitchRevenue / 1000000).toFixed(2) + 'M' : totalPitchRevenue >= 1000 ? (totalPitchRevenue / 1000).toFixed(0) + 'K' : totalPitchRevenue.toLocaleString()}`,
      icon: Target,
      gradient: "from-purple-50 to-purple-100",
      iconColor: "text-purple-600",
      bgColor: "bg-purple-500",
      onClick: () => onCardClick && onCardClick('pitches')
    },
    {
      title: "2025 Revenue change associated with this periods Wins & Losses",
      value: `${netWinLossValue < 0 ? '-' : ''}${netWinLossValue > 0 ? '+' : ''}$${Math.abs(netWinLossValue) >= 1000000 ? (Math.abs(netWinLossValue) / 1000000).toFixed(2) + 'M' : Math.abs(netWinLossValue) >= 1000 ? (Math.abs(netWinLossValue) / 1000).toFixed(0) + 'K' : Math.abs(netWinLossValue).toLocaleString()}`,
      icon: Award,
      gradient: netWinLossValue >= 0 ? "from-indigo-50 to-indigo-100" : "from-red-50 to-red-100",
      iconColor: netWinLossValue >= 0 ? "text-indigo-600" : "text-red-600",
      bgColor: netWinLossValue >= 0 ? "bg-indigo-500" : "bg-red-500",
      onClick: () => onCardClick && onCardClick('wins')
    },
    {
      type: 'custom',
      title: "Average Sentiment this period",
      value: avgSentiment.toFixed(1),
      trend: {
        value: `${sentimentTrend > 0 ? '+' : ''}${sentimentTrend.toFixed(1)}`,
        label: "vs previous period",
        Icon: SentimentTrendIcon,
        color: sentimentTrendColor
      },
      icon: TrendingUp,
      gradient: "from-sky-50 to-sky-100",
      iconColor: "text-sky-600",
      bgColor: "bg-sky-500",
      onClick: () => onCardClick && onCardClick('sentiment')
    },
    {
      type: 'custom',
      title: "Net Personnel",
      value: netPersonnelChange > 0 ? `+${netPersonnelChange}` : netPersonnelChange,
      trend: {
          value: `${netPersonnelRevenueImpact < 0 ? '-' : ''}${netPersonnelRevenueImpact > 0 ? '+' : ''}$${Math.abs(netPersonnelRevenueImpact) >= 1000000 ? (Math.abs(netPersonnelRevenueImpact) / 1000000).toFixed(2) + 'M' : Math.abs(netPersonnelRevenueImpact) >= 1000 ? (Math.abs(netPersonnelRevenueImpact) / 1000).toFixed(0) + 'K' : Math.abs(netPersonnelRevenueImpact).toLocaleString()}`,
          label: "revenue impact"
      },
      icon: Users,
      gradient: "from-slate-100 to-slate-200",
      iconColor: "text-slate-600",
      bgColor: "bg-slate-500",
      onClick: () => onCardClick && onCardClick('personnel')
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        if (card.type === 'delta') {
          return (
            <Card
              key={index}
              className={`relative overflow-hidden border-slate-200 bg-gradient-to-r ${card.gradient} shadow-lg hover:shadow-xl transition-all duration-300 ${card.onClick ? 'cursor-pointer' : ''}`}
              onClick={card.onClick}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${card.bgColor} rounded-full opacity-10`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-600">{card.title}</p>
                    <div className="mt-2 space-y-2">
                      {/* Delta vs Forecast */}
                      <div className="flex items-baseline gap-2">
                         <p className={`text-xl font-bold ${reforecastDelta >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{card.reforecastDelta.value}</p>
                         <p className="text-xs text-slate-500">{card.reforecastDelta.label}</p>
                      </div>
                      {/* Delta vs Budget */}
                      <div className="flex items-baseline gap-2">
                        <p className={`text-xl font-bold ${revenueDelta >= 0 ? 'text-slate-900' : 'text-red-700'}`}>{card.budgetDelta.value}</p>
                        <p className="text-xs text-slate-500">{card.budgetDelta.label}</p>
                      </div>
                    </div>
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor} bg-opacity-20`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        if (card.type === 'custom') {
          return (
             <Card
              key={index}
              className={`relative overflow-hidden border-slate-200 bg-gradient-to-r ${card.gradient} shadow-lg hover:shadow-xl transition-all duration-300 ${card.onClick ? 'cursor-pointer' : ''}`}
              onClick={card.onClick}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${card.bgColor} rounded-full opacity-10`} />
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-slate-600">{card.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                     {card.trend && (
                        <div className="flex items-center gap-1 mt-1">
                          {card.trend.Icon && <card.trend.Icon className={`w-4 h-4 ${card.trend.color}`} />}
                          <span className={`text-sm font-medium ${card.trend.color || 'text-slate-500'}`}>{card.trend.value}</span>
                          <span className="text-xs text-slate-500">{card.trend.label}</span>
                        </div>
                      )}
                  </div>
                  <div className={`p-3 rounded-xl ${card.bgColor} bg-opacity-20`}>
                    <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        }
        return (
          <Card
            key={index}
            className={`relative overflow-hidden border-slate-200 bg-gradient-to-r ${card.gradient} shadow-lg hover:shadow-xl transition-all duration-300 ${card.onClick ? 'cursor-pointer' : ''}`}
            onClick={card.onClick}
          >
            <div className={`absolute top-0 right-0 w-32 h-32 transform translate-x-8 -translate-y-8 ${card.bgColor} rounded-full opacity-10`} />
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-600">{card.title}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{card.value}</p>
                </div>
                <div className={`p-3 rounded-xl ${card.bgColor} bg-opacity-20`}>
                  <card.icon className={`w-6 h-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
