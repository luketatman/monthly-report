import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, UserPlus, ChevronDown, ChevronRight, ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PersonnelTable({ personnelUpdates, loading }) {
  const [expandedId, setExpandedId] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'revenue_impact', direction: 'desc' });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'New Hire':
      case 'Hired':
        return <Badge className="bg-blue-100 text-blue-800"><UserPlus className="w-3 h-3 mr-1" />{status}</Badge>;
      case 'Terminated':
      case 'Resigned':
        return <Badge className="bg-slate-200 text-slate-800"><ArrowDown className="w-3 h-3 mr-1" />{status}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
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
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-4 h-4 text-slate-600" />
      : <ArrowDown className="w-4 h-4 text-slate-600" />;
  };

  const sortedPersonnelUpdates = React.useMemo(() => {
    if (!personnelUpdates) return []; // Handle case where personnelUpdates might be null or undefined initially

    if (!sortConfig.key) return personnelUpdates;

    return [...personnelUpdates].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      if (sortConfig.key === 'revenue_impact') {
        // Sort by absolute value (magnitude of impact)
        aVal = (a[sortConfig.key] === null || a[sortConfig.key] === undefined) ? 0 : Math.abs(Number(a[sortConfig.key]));
        bVal = (b[sortConfig.key] === null || b[sortConfig.key] === undefined) ? 0 : Math.abs(Number(b[sortConfig.key]));
      } else {
        aVal = typeof aVal === 'string' ? aVal.toLowerCase() : aVal;
        bVal = typeof bVal === 'string' ? bVal.toLowerCase() : bVal;

        if (aVal === null || aVal === undefined) aVal = '';
        if (bVal === null || bVal === undefined) bVal = '';
      }
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [personnelUpdates, sortConfig]);

  const netRevenueImpact = React.useMemo(() => {
    return sortedPersonnelUpdates.reduce((sum, update) => {
      const impact = update.revenue_impact || 0;
      const isDeparture = update.status === 'Terminated' || update.status === 'Resigned';
      return sum + (isDeparture ? -Math.abs(impact) : Math.abs(impact));
    }, 0);
  }, [sortedPersonnelUpdates]);

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

  const totalTableColumns = 7;

  return (
    <Card className="shadow-lg bg-slate-600">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-700">
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('name')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">
                    <div className="flex items-center gap-1">Name {getSortIcon('name')}</div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('title_specialty')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">
                    <div className="flex items-center gap-1">Title/Specialty {getSortIcon('title_specialty')}</div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('status')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">
                    <div className="flex items-center gap-1">Status {getSortIcon('status')}</div>
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" onClick={() => handleSort('revenue_impact')} className="p-0 h-auto font-semibold text-white hover:bg-transparent w-full justify-end">
                    <div className="flex items-center gap-1">Revenue Impact {getSortIcon('revenue_impact')}</div>
                  </Button>
                </TableHead>
                <TableHead>
                  <Button variant="ghost" onClick={() => handleSort('office_location')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">
                    <div className="flex items-center gap-1">Office {getSortIcon('office_location')}</div>
                  </Button>
                </TableHead>
                <TableHead>
                   <Button variant="ghost" onClick={() => handleSort('notes')} className="p-0 h-auto font-semibold text-white hover:bg-transparent">
                    <div className="flex items-center gap-1">Notes {getSortIcon('notes')}</div>
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPersonnelUpdates.length > 0 ? (
                sortedPersonnelUpdates.map((update) => (
                  <React.Fragment key={update.id}>
                    <TableRow className="hover:bg-slate-700" >
                      <TableCell className="cursor-pointer" onClick={() => update.notes && setExpandedId(expandedId === update.id ? null : update.id)}>
                        {update.notes && (expandedId === update.id ? <ChevronDown className="w-4 h-4 text-slate-300" /> : <ChevronRight className="w-4 h-4 text-slate-300" />)}
                      </TableCell>
                      <TableCell className="font-medium text-white">{update.name}</TableCell>
                      <TableCell className="text-slate-300">
                        {update.title_specialty || 'N/A'}
                      </TableCell>
                      <TableCell>{getStatusBadge(update.status)}</TableCell>
                      <TableCell className="text-right">
                        {update.revenue_impact !== null && update.revenue_impact !== undefined ? (
                          (() => {
                            const isDeparture = update.status === 'Terminated' || update.status === 'Resigned';
                            const impact = isDeparture ? -Math.abs(update.revenue_impact) : Math.abs(update.revenue_impact);
                            return (
                              <span className={
                                impact > 0
                                  ? 'text-blue-400 font-medium'
                                  : impact < 0
                                    ? 'text-slate-400 font-medium'
                                    : 'text-slate-300'
                              }>
                                {impact >= 0 ? '+' : ''}${impact.toLocaleString()}
                              </span>
                            );
                          })()
                        ) : <span className="text-slate-300">N/A</span>}
                      </TableCell>
                      <TableCell className="text-slate-300">{update.office_location || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs min-w-[150px] truncate text-slate-300">{update.notes}</TableCell>
                    </TableRow>
                    {expandedId === update.id && (
                       <TableRow className="bg-slate-700">
                        <TableCell colSpan={totalTableColumns} className="p-4">
                          <p className="font-semibold text-sm mb-1 text-slate-300">Full Notes:</p>
                          <p className="text-white text-sm whitespace-pre-wrap">{update.notes}</p>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={totalTableColumns} className="text-center h-24 text-slate-300">
                    No personnel updates recorded for this period.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {sortedPersonnelUpdates.length > 0 && (
                <TableFooter>
                    <TableRow className="bg-slate-700 border-t-2 border-slate-500">
                        <TableCell colSpan={4} className="font-bold text-white">Total Net Revenue Impact</TableCell>
                        <TableCell className="text-right font-bold text-lg">
                           <span className={
                                netRevenueImpact > 0
                                  ? 'text-blue-400'
                                  : netRevenueImpact < 0
                                    ? 'text-slate-400'
                                    : 'text-white'
                              }>
                                {netRevenueImpact >= 0 ? '+' : ''}${netRevenueImpact.toLocaleString()}
                           </span>
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