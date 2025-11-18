
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Award, TrendingDown, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';

export default function WinsLossesTable({ winLosses, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_revenue_impact', direction: 'desc' });

  const getOutcomeBadge = (outcome) => {
    if (outcome === 'Win') {
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200">
          <Award className="w-3 h-3 mr-1" />
          Win
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-200 text-slate-800 border-slate-300 hover:bg-slate-300">
        <TrendingDown className="w-3 h-3 mr-1" />
        Loss
      </Badge>
    );
  };

  // Calculate display revenue (negative for losses) and total
  const getDisplayRevenue = (item) => {
    const revenue = item.total_revenue_impact || 0;
    return item.outcome === 'Loss' ? -revenue : revenue;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-4 h-4 text-slate-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <ArrowUp className="w-4 h-4 text-slate-600" /> :
      <ArrowDown className="w-4 h-4 text-slate-600" />;
  };

  const sortedWinLosses = React.useMemo(() => {
    if (!sortConfig.key) return winLosses;

    return [...winLosses].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Special handling for revenue impact sorting
      if (sortConfig.key === 'total_revenue_impact') {
        aVal = getDisplayRevenue(a);
        bVal = getDisplayRevenue(b);
      } else if (sortConfig.key === 'date_won') {
        // Handle date sorting
        aVal = aVal ? new Date(aVal).getTime() : 0;
        bVal = bVal ? new Date(bVal).getTime() : 0;
      }

      // Handle string comparison (for client, outcome, lead_broker, office_location, transaction_type, asset_type, region)
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [winLosses, sortConfig]);

  const totalRevenue = sortedWinLosses.reduce((sum, item) => sum + getDisplayRevenue(item), 0);
  const totalBudgetYearRevenue = sortedWinLosses.reduce((sum, item) => {
    const revenue = item.budget_year_revenue_impact || 0;
    // CRITICAL FIX: Calculate NET (wins minus losses) for budget year revenue too
    return sum + (item.outcome === 'Win' ? revenue : -revenue);
  }, 0);

  if (loading) {
    return (
      <Card className="shadow-lg bg-slate-600">
        <CardContent className="p-6">
          <Skeleton className="h-8 w-1/4 mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg bg-slate-600">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('client')}
                  >
                    <div className="flex items-center gap-1">
                      Client
                      {getSortIcon('client')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('outcome')}
                  >
                    <div className="flex items-center gap-1">
                      Outcome
                      {getSortIcon('outcome')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('transaction_type')}
                  >
                    <div className="flex items-center gap-1">
                      Transaction Type
                      {getSortIcon('transaction_type')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('asset_type')}
                  >
                    <div className="flex items-center gap-1">
                      Asset Type
                      {getSortIcon('asset_type')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('budget_year_revenue_impact')}
                  >
                    <div className="flex items-center gap-1">
                      Budget Year Revenue
                      {getSortIcon('budget_year_revenue_impact')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('total_revenue_impact')}
                  >
                    <div className="flex items-center gap-1">
                      Total Revenue
                      {getSortIcon('total_revenue_impact')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('lead_broker')}
                  >
                    <div className="flex items-center gap-1">
                      Lead Broker
                      {getSortIcon('lead_broker')}
                    </div>
                  </Button>
                </TableHead>
                <TableHead className="text-white font-semibold">
                  <Button
                    variant="ghost"
                    className="h-auto p-0 font-semibold text-white hover:bg-transparent"
                    onClick={() => handleSort('office_location')}
                  >
                    <div className="flex items-center gap-1">
                      Office
                      {getSortIcon('office_location')}
                    </div>
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedWinLosses.length > 0 ?
                sortedWinLosses.map((item) =>
                  <React.Fragment key={item.id}>
                    <TableRow
                      className="hover:bg-slate-700 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    >
                      <TableCell className="bg-slate-300 p-4 align-middle [&:has([role=checkbox])]:pr-0">
                        {expandedId === item.id ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronRight className="w-4 h-4 text-slate-600" />}
                      </TableCell>
                      <TableCell className="font-medium text-white">{item.client || 'N/A'}</TableCell>
                      <TableCell>{getOutcomeBadge(item.outcome)}</TableCell>
                      <TableCell className="text-slate-300">{item.transaction_type || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">{item.asset_type || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300 font-medium">
                        ${(item.budget_year_revenue_impact || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`font-medium ${getDisplayRevenue(item) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {getDisplayRevenue(item) >= 0 ? '+' : ''}${getDisplayRevenue(item).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-slate-300">{item.lead_broker || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">{item.office_location || 'N/A'}</TableCell>
                    </TableRow>
                    {expandedId === item.id &&
                      <TableRow className="bg-slate-700 border-b border-slate-600">
                        <TableCell colSpan={9} className="bg-slate-700 p-4 text-sm align-middle [&:has([role=checkbox])]:pr-0">
                          <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong className="text-slate-300">Region:</strong> <span className="text-white">{item.region || 'N/A'}</span></div>
                            <div><strong className="text-slate-300">Date:</strong> <span className="text-white">{item.date_won ? format(new Date(item.date_won), 'PPP') : 'N/A'}</span></div>
                            <div><strong className="text-slate-300">SQFT:</strong> <span className="text-white">{item.square_footage ? item.square_footage.toLocaleString() : 'N/A'}</span></div>
                            <div><strong className="text-slate-300">Engagement:</strong> <span className="text-white">{item.engagement_type || 'N/A'}</span></div>
                            {item.engagement_type === 'Multi-serviced' && item.services_involved?.length > 0 &&
                              <div className="col-span-2"><strong className="text-slate-300">Services:</strong> <span className="text-white">{item.services_involved.join(', ')}</span></div>
                            }
                          </div>
                          {item.reason && <div className="mt-4"><p className="font-semibold text-sm mb-1 text-slate-300">Commentary:</p><p className="text-white text-sm whitespace-pre-wrap">{item.reason}</p></div>}
                        </TableCell>
                      </TableRow>
                    }
                  </React.Fragment>
                ) :
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-slate-300">
                    No wins or losses recorded for this period.
                  </TableCell>
                </TableRow>
              }
            </TableBody>
            {sortedWinLosses.length > 0 &&
              <TableFooter>
                <TableRow className="bg-slate-700 border-t-2 border-slate-500">
                  <TableCell colSpan={5} className="font-bold text-white">Total Revenue Impact</TableCell>
                  <TableCell className={`font-bold text-lg ${totalBudgetYearRevenue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalBudgetYearRevenue >= 0 ? '+' : ''}${totalBudgetYearRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell className={`font-bold text-lg ${totalRevenue >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {totalRevenue >= 0 ? '+' : ''}${totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            }
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
