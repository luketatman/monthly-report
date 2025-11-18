
import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";

const stageColors = {
  "Meeting Scheduled": "bg-blue-100 text-blue-800",
  "Waiting to Hear Back": "bg-amber-100 text-amber-800",
  "Out for Signature": "bg-green-100 text-green-800",
  "Lost": "bg-slate-200 text-slate-800",
};

export default function PitchesTable({ pitches, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'total_revenue_impact', direction: 'desc' });

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
    return sortConfig.direction === 'asc'
      ? <ArrowUp className="w-4 h-4 text-slate-600" />
      : <ArrowDown className="w-4 h-4 text-slate-600" />;
  };

  const sortedPitches = React.useMemo(() => {
    if (!sortConfig.key) return pitches;

    return [...pitches].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      // Handle number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      }

      // Handle mixed or null values
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [pitches, sortConfig]);

  const totalRevenue = sortedPitches.reduce((sum, item) => sum + (item.total_revenue_impact || 0), 0);
  const totalBudgetYearRevenue = sortedPitches.reduce((sum, item) => sum + (item.budget_year_revenue_impact || 0), 0);

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
                    onClick={() => handleSort('stage')}
                  >
                    <div className="flex items-center gap-1">
                      Stage
                      {getSortIcon('stage')}
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
              {sortedPitches.length > 0 ? (
                sortedPitches.map((pitch) => (
                  <React.Fragment key={pitch.id}>
                    <TableRow
                      className="hover:bg-slate-700 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === pitch.id ? null : pitch.id)}
                    >
                      <TableCell>
                        {expandedId === pitch.id ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />}
                      </TableCell>
                      <TableCell className="font-medium text-white">{pitch.client || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge className={`${stageColors[pitch.stage] || "bg-slate-100 text-slate-800"}`}>
                          {pitch.stage || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{pitch.transaction_type || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">{pitch.asset_type || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300 font-medium">${(pitch.budget_year_revenue_impact || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-slate-300 font-medium">${(pitch.total_revenue_impact || 0).toLocaleString()}</TableCell>
                      <TableCell className="text-slate-300">{pitch.lead_broker || 'N/A'}</TableCell>
                      <TableCell className="text-slate-300">{pitch.office_location || 'N/A'}</TableCell>
                    </TableRow>
                    {expandedId === pitch.id && (
                      <TableRow className="bg-slate-700">
                        <TableCell colSpan={9} className="p-4 text-sm">
                           <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div><strong className="text-slate-300">Region:</strong> <span className="text-white">{pitch.region || 'N/A'}</span></div>
                            <div><strong className="text-slate-300">SQFT:</strong> <span className="text-white">{pitch.square_footage ? pitch.square_footage.toLocaleString() : 'N/A'}</span></div>
                            <div><strong className="text-slate-300">Origination:</strong> <span className="text-white">{pitch.origination_source || 'N/A'}</span></div>
                            <div><strong className="text-slate-300">Budget Year Revenue:</strong> <span className="text-white">{(pitch.budget_year_revenue_impact || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span></div>
                            <div><strong className="text-slate-300">Engagement:</strong> <span className="text-white">{pitch.engagement_type || 'N/A'}</span></div>
                            {pitch.engagement_type === 'Multi-serviced' && pitch.services_involved?.length > 0 &&
                              <div className="col-span-2"><strong className="text-slate-300">Services:</strong> <span className="text-white">{pitch.services_involved.join(', ')}</span></div>
                            }
                          </div>
                          {pitch.summary && <div className="mt-4"><p className="font-semibold text-sm mb-1 text-slate-300">Summary:</p><p className="text-white text-sm whitespace-pre-wrap">{pitch.summary}</p></div>}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center h-24 text-slate-300">
                    No pitches recorded for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {sortedPitches.length > 0 && (
              <TableFooter>
                <TableRow className="bg-slate-700 border-t-2 border-slate-500">
                  <TableCell colSpan={5} className="font-bold text-white">Total Potential Revenue</TableCell>
                  <TableCell className="font-bold text-lg text-white">
                    ${totalBudgetYearRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="font-bold text-lg text-white">
                    ${totalRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
