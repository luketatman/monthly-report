import React from 'react';
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle, Edit3, XCircle } from "lucide-react";
import _ from 'lodash';

// Define regions outside the component to prevent re-creation on every render
const regions = ['Northeast', 'Central', 'South', 'West'];

/**
 * StatusIcon component to render the appropriate icon based on submission status.
 * @param {object} props - The component props.
 * @param {'submitted' | 'draft' | 'pending'} props.status - The submission status.
 */
const StatusIcon = ({ status }) => {
  let IconComponent;
  let colorClass;

  switch (status) {
    case 'submitted':
      IconComponent = CheckCircle;
      colorClass = "text-green-400";
      break;
    case 'draft':
      IconComponent = Edit3;
      colorClass = "text-amber-400";
      break;
    default: // pending
      IconComponent = XCircle;
      colorClass = "text-slate-400";
      break;
  }
  return <IconComponent className={`w-4 h-4 ${colorClass}`} />;
};

export default function RegionalSubmissionStatus({ allSubmissions, filters, loading }) {
  /**
   * Filters submissions for the currently selected year and month, focusing on regional submissions (RMD level)
   */
  const getSubmissionsForPeriod = React.useCallback((submissions) => {
    const { year, month } = filters;
    const selectedMonthStr = `${year}-${String(month).padStart(2, '0')}`;
    
    // Filter for regional-level submissions (MonthlySubmission entity) rather than office-level
    return submissions.filter(s => 
      s.month === selectedMonthStr && 
      s.region && 
      // Check if this looks like a regional submission (has regional-level fields)
      (s.rmd_regional_commentary !== undefined || s.managing_director || s.asset_class_sentiment)
    );
  }, [filters]);

  // Memoize the filtered submissions for the current period
  const periodSubmissions = React.useMemo(() => getSubmissionsForPeriod(allSubmissions), [allSubmissions, getSubmissionsForPeriod]);

  // Compute status for each region
  const regionStatuses = React.useMemo(() => {
    return regions.map(regionName => {
      // Find regional-level submissions for this region
      const regionalSubmissions = periodSubmissions.filter(s => s.region === regionName);
      
      let regionOverallStatus = 'pending';
      let submissionDetails = [];
      
      if (regionalSubmissions.length > 0) {
        // For regional submissions, take the latest one
        const latestSubmission = _.maxBy(regionalSubmissions, 'updated_date');
        regionOverallStatus = latestSubmission.status || 'pending';
        
        submissionDetails = [{
          name: `${regionName} RMD`,
          status: regionOverallStatus,
          submittedAt: latestSubmission.updated_date
        }];
      }

      return {
        name: regionName,
        icon: <StatusIcon status={regionOverallStatus} />,
        markets: submissionDetails, // Using "markets" key for consistency with tooltip structure
      };
    });
  }, [periodSubmissions]);

  if (loading) {
    return (
      <div className="bg-slate-700 shadow-md rounded-lg p-3 w-full">
        <div className="flex items-center gap-4">
            <Skeleton className="h-5 w-36" />
            <div className="flex gap-4 flex-1">
                {Array(4).fill(0).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <Skeleton className="h-5 w-16" />
                        <Skeleton className="h-5 w-5 rounded-full" />
                    </div>
                ))}
            </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
        <div className="bg-slate-700 shadow-md rounded-lg p-3 w-full">
            <div className="flex items-center gap-4">
                <h3 className="text-sm font-semibold text-slate-300 px-2 whitespace-nowrap">
                    RMD Submission Status:
                </h3>
                <div className="flex-1 flex gap-4">
                    {regionStatuses.map(region => (
                        <Tooltip key={region.name}>
                            <TooltipTrigger asChild>
                                <div className="flex items-center gap-2 cursor-pointer">
                                    <span className="text-sm font-medium text-slate-300">{region.name}</span>
                                    {region.icon}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-slate-800 text-white border-slate-700">
                                <p className="font-bold">{region.name}</p>
                                <ul className="mt-2 space-y-1 text-xs">
                                  {region.markets.length > 0 ? (
                                    region.markets.map(submission => (
                                      <li key={submission.name} className="flex items-center gap-2">
                                        <span className="w-24 truncate">{submission.name}:</span>
                                        <span className={`font-semibold ${
                                          submission.status === 'submitted' ? 'text-green-400' :
                                          submission.status === 'draft' ? 'text-amber-400' : 'text-slate-400'
                                        }`}>
                                          {submission.status === 'submitted' ? 'Submitted' : 
                                           submission.status === 'draft' ? 'Draft' : 'Pending'}
                                        </span>
                                      </li>
                                    ))
                                  ) : (
                                    <li className="text-xs text-slate-400">No RMD submission for this period.</li>
                                  )}
                                </ul>
                            </TooltipContent>
                        </Tooltip>
                    ))}
                </div>
            </div>
        </div>
    </TooltipProvider>
  );
}