import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Filter, Calendar, Building2, Clock } from "lucide-react";

export default function RegionFilters({ filters, onFiltersChange, hideRegionSelector = false }) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  const quarters = [1, 2, 3, 4];
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: new Date(0, i).toLocaleString('default', { month: 'long' }) }));

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    
    // CRITICAL FIX: When switching to quarterly, calculate the correct quarter based on the selected month
    if (field === 'periodType' && value === 'quarterly') {
      // Calculate which quarter the currently selected month belongs to
      const monthNumber = filters.month || new Date().getMonth() + 1; // Use current month if no month is selected
      const correctQuarter = Math.floor((monthNumber - 1) / 3) + 1;
      newFilters.quarter = correctQuarter;
    }
    
    // When switching to monthly, keep the month if it's within the selected quarter
    if (field === 'periodType' && value === 'monthly') {
      // Keep current month, it's fine (no explicit action needed as newFilters already carries existing month)
    }
    
    onFiltersChange(newFilters);
  };

  const regions = [
    { value: "all", label: "All Regions" },
    { value: "Northeast", label: "Northeast" },
    { value: "Central", label: "Central" },
    { value: "South", label: "South" },
    { value: "West", label: "West" },
    { value: "Corporate", label: "Corporate" }
  ];

  return (
    <Card className="bg-slate-600 shadow-sm">
      <CardContent className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Filters:</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 flex-wrap">
            {!hideRegionSelector && (
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-white" />
                <Select value={filters.region} onValueChange={(value) => handleFilterChange('region', value)}>
                  <SelectTrigger className="w-36 text-white bg-slate-600 border-slate-500">
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-white" />
              <Select value={filters.periodType} onValueChange={(value) => handleFilterChange('periodType', value)}>
                <SelectTrigger className="w-32 text-white bg-slate-600 border-slate-500">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white" />
              <Select value={String(filters.year)} onValueChange={(value) => handleFilterChange('year', Number(value))}>
                <SelectTrigger className="w-28 text-white bg-slate-600 border-slate-500">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map(year => <SelectItem key={year} value={String(year)}>{year}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {filters.periodType === 'monthly' && (
              <div className="flex items-center gap-2">
                <Select value={String(filters.month)} onValueChange={(value) => handleFilterChange('month', Number(value))}>
                  <SelectTrigger className="w-36 text-white bg-slate-600 border-slate-500">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(month => <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {filters.periodType === 'quarterly' && (
              <div className="flex items-center gap-2">
                <Select value={String(filters.quarter)} onValueChange={(value) => handleFilterChange('quarter', Number(value))}>
                  <SelectTrigger className="w-28 text-white bg-slate-600 border-slate-500">
                    <SelectValue placeholder="Quarter" />
                  </SelectTrigger>
                  <SelectContent>
                    {quarters.map(q => <SelectItem key={q} value={String(q)}>Q{q}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  );
}