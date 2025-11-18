
import { useState, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Award, Target, TrendingDown, Building2, FileText, Hash, DollarSign, TrendingUp, Briefcase } from "lucide-react"; // Added Briefcase
import _ from 'lodash';

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
  return `${sign}$${Math.round(absValue).toLocaleString()}`;
};

const BubbleCard = ({ item, type }) => {
  const isWin = type === 'win' && item.outcome === 'Win';
  const isLoss = type === 'win' && item.outcome === 'Loss';

  return (
    <Card className={`transition-all hover:shadow-lg cursor-pointer ${
    isWin ? 'border-l-4 border-l-green-500' :
    isLoss ? 'border-l-4 border-l-red-500' :
    'border-l-4 border-l-blue-500'}`
    }>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {type === 'win' ?
            item.outcome === 'Win' ?
            <Award className="w-5 h-5 text-green-600" /> :
            <TrendingDown className="w-5 h-5 text-red-600" /> :

            <Target className="w-5 h-5 text-blue-600" />
            }
            <h4 className="font-semibold text-slate-900">{item.client}</h4>
          </div>
          {type === 'win' &&
          <Badge className={item.outcome === 'Win' ?
          'bg-green-100 text-green-800' :
          'bg-red-100 text-red-800'
          }>
              {item.outcome}
            </Badge>
          }
          {type === 'pitch' &&
          <Badge className="bg-blue-100 text-blue-800">{item.stage}</Badge>
          }
        </div>
        
        <div className="space-y-1 text-sm text-slate-600">
          <div className="flex items-center gap-2">
            <Building2 className="w-3 h-3" />
            <span>{item.office_location || 'N/A'} • {item.asset_type || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-3 h-3" />
            <span>{item.transaction_type || 'N/A'}</span>
          </div>
        </div>
        
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="flex justify-between items-center">
            <span className="text-xs text-slate-500">Budget Year Revenue</span>
            <span className={`font-bold ${
            type === 'win' && item.outcome === 'Loss' ? 'text-red-600' : 'text-green-600'}`
            }>
              {formatCurrency(item.budget_year_revenue_impact || 0)}
            </span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-slate-500">Total Revenue</span>
            <span className="font-semibold text-slate-900">
              {formatCurrency(item.total_revenue_impact || 0)}
            </span>
          </div>
        </div>
        
        {item.lead_broker &&
        <div className="mt-2 text-xs text-slate-500">
            Lead: {item.lead_broker}
          </div>
        }
      </CardContent>
    </Card>);

};

const GroupSummaryBar = ({ metrics, type }) => {
  return (
    <div className="bg-slate-700 p-3 rounded-lg grid grid-cols-2 lg:grid-cols-4 gap-4">
      {type === 'wins' ?
      <>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Award className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Wins</p>
              <p className="text-lg font-bold text-green-600">{metrics.winCount}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Losses</p>
              <p className="text-lg font-bold text-red-600">{metrics.lossCount}</p>
            </div>
          </div>
        </> :

      <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Hash className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500 uppercase">Count of Items</p>
            <p className="text-lg font-bold text-slate-900">{metrics.count}</p>
          </div>
        </div>
      }
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-100 rounded-lg">
          <DollarSign className="w-4 h-4 text-green-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Budget Year Revenue</p>
          <p className="text-lg font-bold text-green-600">{formatCurrency(metrics.budgetYearRevenue)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <DollarSign className="w-4 h-4 text-purple-600" />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">Total Revenue</p>
          <p className="text-lg font-bold text-purple-600">{formatCurrency(metrics.totalRevenue)}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${metrics.countChange > 0 ? 'bg-green-100' : metrics.countChange < 0 ? 'bg-red-100' : 'bg-slate-100'}`}>
          <TrendingUp className={`w-4 h-4 ${metrics.countChange > 0 ? 'text-green-600' : metrics.countChange < 0 ? 'text-red-600 rotate-180' : 'text-slate-600'}`} />
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase">vs Last Period</p>
          <p className={`text-lg font-bold ${metrics.countChange > 0 ? 'text-green-600' : metrics.countChange < 0 ? 'text-red-600' : 'text-slate-600'}`}>
            {metrics.countChange > 0 ? '+' : ''}{metrics.countChange}
          </p>
        </div>
      </div>
    </div>);

};

export default function BusinessDevelopmentExpanded({ winLosses, pitches, previousWinLosses = [], previousPitches = [] }) {
  const [dataType, setDataType] = useState('wins');
  const [groupBy, setGroupBy] = useState('asset_class');

  const groupedDataWithMetrics = useMemo(() => {
    const data = dataType === 'wins' ? winLosses : pitches;
    const previousData = dataType === 'wins' ? previousWinLosses : previousPitches;
    // Ensure groupKey correctly maps 'transaction' state to 'transaction_type' property
    const groupKey = groupBy === 'asset_class' ? 'asset_type' : 'transaction_type';

    // Group current period data
    const grouped = _.groupBy(data, groupKey);

    // Group previous period data for comparison
    const previousGrouped = _.groupBy(previousData, groupKey);

    return Object.entries(grouped).map(([groupName, items]) => {
      const count = items.length;

      // For wins/losses, calculate separate counts
      const winCount = dataType === 'wins' ? items.filter(item => item.outcome === 'Win').length : 0;
      const lossCount = dataType === 'wins' ? items.filter(item => item.outcome === 'Loss').length : 0;
      
      // Calculate revenue with losses as negative (for wins/losses only)
      const budgetYearRevenue = items.reduce((sum, item) => {
        const revenue = item.budget_year_revenue_impact || 0;
        // If it's a win/loss and it's a loss, make it negative
        if (dataType === 'wins' && item.outcome === 'Loss') {
          return sum - revenue;
        }
        return sum + revenue;
      }, 0);
      
      const totalRevenue = items.reduce((sum, item) => {
        const revenue = item.total_revenue_impact || 0;
        // If it's a win/loss and it's a loss, make it negative
        if (dataType === 'wins' && item.outcome === 'Loss') {
          return sum - revenue;
        }
        return sum + revenue;
      }, 0);

      // Calculate count change vs previous period for this specific group
      // Get previous count for this group, default to 0 if group didn't exist in previous period
      const previousCount = previousGrouped[groupName]?.length || 0;
      const countChange = count - previousCount;

      return {
        groupName: groupName || 'Unspecified',
        items,
        metrics: {
          count,
          winCount,
          lossCount,
          budgetYearRevenue,
          totalRevenue,
          countChange
        }
      };
    }).sort((a, b) => b.metrics.budgetYearRevenue - a.metrics.budgetYearRevenue);
  }, [dataType, groupBy, winLosses, pitches, previousWinLosses, previousPitches]);

  return (
    <div className="space-y-6 mt-4"> {/* Changed space-y-4 to space-y-6 */}
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={dataType === 'wins' ? 'default' : 'outline'}
            onClick={() => setDataType('wins')}
            className={dataType === 'wins' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
          >
            <Award className="w-4 h-4 mr-2" />
            Wins & Losses
          </Button>
          <Button
            variant={dataType === 'pitches' ? 'default' : 'outline'}
            onClick={() => setDataType('pitches')}
            className={dataType === 'pitches' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
          >
            <Target className="w-4 h-4 mr-2" />
            Pitches
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            variant={groupBy === 'asset_class' ? 'default' : 'outline'}
            onClick={() => setGroupBy('asset_class')}
            size="sm"
            className={groupBy === 'asset_class' ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
          >
            <Building2 className="w-4 h-4 mr-2" />
            By Asset Class
          </Button>
          <Button
            variant={groupBy === 'transaction' ? 'default' : 'outline'}
            onClick={() => setGroupBy('transaction')}
            size="sm"
            className={groupBy === 'transaction' ? 'bg-slate-700 hover:bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}
          >
            <Briefcase className="w-4 h-4 mr-2" />
            By Transaction Type
          </Button>
        </div>
      </div>

      {/* Grouped Data Display with Accordion */}
      {groupedDataWithMetrics.length > 0 ?
      <Accordion type="multiple" className="w-full">
          {groupedDataWithMetrics.map(({ groupName, items, metrics }) =>
        <AccordionItem key={groupName} value={groupName} className="border border-slate-200 rounded-lg mb-4">
              <AccordionTrigger className="bg-slate-400 px-4 py-4 font-medium flex flex-1 items-center justify-between transition-all [&[data-state=open]>svg]:rotate-180 hover:no-underline">
                <div className="w-full">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-slate-900">{groupName}</h3>
                  </div>
                  <GroupSummaryBar metrics={metrics} type={dataType} />
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {items.map((item) =>
              <BubbleCard
                key={item.id}
                item={item}
                type={dataType === 'wins' ? 'win' : 'pitch'} />
              )}
                </div>
              </AccordionContent>
            </AccordionItem>
        )}
        </Accordion> :

      <div className="text-center py-12 text-slate-500">
          No {dataType === 'wins' ? 'wins or losses' : 'pitches'} recorded for this period.
        </div>
      }
    </div>);

}
