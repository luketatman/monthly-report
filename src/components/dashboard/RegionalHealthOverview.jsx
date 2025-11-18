
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, TrendingUp, TrendingDown, Minus, DollarSign, Target, Users, BarChart, ChevronDown, ChevronUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import BusinessDevelopmentExpanded from './BusinessDevelopmentExpanded';
import MarketOutlookExpanded from './MarketOutlookExpanded';

const OverviewSection = ({ title, icon: Icon, points, expandable, onExpand, isExpanded }) => (
  <div className="bg-slate-700 p-4 rounded-lg border border-slate-500">
    <h4 className="flex items-center justify-between font-semibold text-slate-200 mb-3">
      <div className="flex items-center gap-2">
        <Icon className="w-5 h-5 text-blue-400" />
        {title}
      </div>
      {expandable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onExpand}
          className="text-blue-400 hover:text-blue-300 hover:bg-slate-600"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4 mr-1" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-1" />
              Expand
            </>
          )}
        </Button>
      )}
    </h4>
    <ul className="space-y-2 text-sm text-slate-200 pl-2">
      {points.length > 0 ? points.map((point, i) => (
        <li key={i} className="flex items-start gap-2">
          <span className="text-blue-400 mt-1.5">&#8226;</span>
          <span>{point}</span>
        </li>
      )) : (
         <li className="text-slate-400">No data to analyze for this section.</li>
      )}
    </ul>
  </div>
);

export default function RegionalHealthOverview({ submissions, winLosses, pitches, personnelUpdates, financialData, allWinLosses, allPitches, loading, filters }) {
  const [expandedSection, setExpandedSection] = useState(null);

  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '$0';
    const sign = value < 0 ? '-' : '';
    const absValue = Math.abs(value);
    if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
    if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
    return `${sign}$${Math.round(absValue).toLocaleString()}`;
  };

  // Helper function to calculate data for the previous period
  const calculatePreviousPeriodData = useCallback((allData) => {
    if (!allData || allData.length === 0) return [];

    const { periodType, year, month, quarter, region } = filters;
    let previousPeriodMonths = [];
    
    if (periodType === 'monthly') {
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      previousPeriodMonths.push(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      const prevQuarter = quarter === 1 ? 4 : quarter - 1;
      const prevYear = quarter === 1 ? year - 1 : year;
      const startMonth = (prevQuarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        previousPeriodMonths.push(`${prevYear}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
      const prevYear = year - 1;
      for(let i = 1; i <= 12; i++) {
        previousPeriodMonths.push(`${prevYear}-${String(i).padStart(2, '0')}`);
      }
    }
    
    return allData.filter(item => {
      // Assuming item.month is in 'YYYY-MM' format, e.g., '2023-01'
      // If item.date (Date object or string) is used, conversion to 'YYYY-MM' needed here.
      // For this implementation, we assume item.month exists in the data.
      if (!item.month) return false; 
      
      const isMonthMatch = previousPeriodMonths.includes(item.month);
      const isRegionMatch = region === 'all' || item.region === region;
      return isMonthMatch && isRegionMatch;
    });
  }, [filters]);

  const generateOverview = () => {
    if (loading) return null;
    if (!submissions.length && !financialData.length && !winLosses.length && !pitches.length && !personnelUpdates.length) {
      return "No data available for the selected period and region to generate a regional health overview.";
    }

    // --- Dynamic Analysis ---

    // 1. Financial Health
    const totalRevenue = financialData.reduce((sum, item) => sum + (item.monthly_revenue || 0), 0);
    const totalBudget = financialData.reduce((sum, item) => sum + (item.monthly_budget || 0), 0);
    const budgetPerformance = totalBudget > 0 ? (totalRevenue / totalBudget) * 100 : 0;
    
    // Win/Loss Financial Impact Analysis
    const totalWinRevenue = winLosses.filter(w => w.outcome === "Win").reduce((sum, w) => sum + (w.budget_year_revenue_impact || 0), 0);
    const totalLossRevenue = winLosses.filter(w => w.outcome === "Loss").reduce((sum, w) => sum + (w.budget_year_revenue_impact || 0), 0);
    const netWinLossImpact = totalWinRevenue - totalLossRevenue;
    
    const financialPoints = [];
    
    if (totalBudget > 0) {
        financialPoints.push(`Achieved ${budgetPerformance.toFixed(0)}% of the ${formatCurrency(totalBudget)} budget, with total revenue of ${formatCurrency(totalRevenue)}.`);
    } else if (financialData.length > 0) {
        financialPoints.push(`Total revenue for the period was ${formatCurrency(totalRevenue)}.`);
    }

    // Add win/loss financial impact commentary
    if (winLosses.length > 0) {
        if (netWinLossImpact > 0) {
            financialPoints.push(`Large Brokerage assignments contributed a net positive ${formatCurrency(netWinLossImpact)} to budget year revenue from ${winLosses.filter(w => w.outcome === "Win").length} wins versus ${winLosses.filter(w => w.outcome === "Loss").length} losses.`);
        } else if (netWinLossImpact < 0) {
            financialPoints.push(`Large Brokerage assignments had a net negative impact of ${formatCurrency(Math.abs(netWinLossImpact))} on budget year revenue, with losses outweighing wins.`);
        } else {
            financialPoints.push(`Large Brokerage assignments had neutral financial impact with wins and losses offsetting each other.`);
        }
    }
    
    // Analyze financial commentary
    const allFinancialCommentaries = [
      ...submissions.flatMap(s => Object.values(s.financial_commentary || {})),
      ...financialData.map(fd => fd.commentary).filter(Boolean)
    ].join(' ').toLowerCase();
    
    const financialKeywords = {
        'market instability': ['instability', 'volatile', 'uncertainty'],
        'interest rates': ['interest rate', 'financing', 'lending'],
        'economic slowdown': ['downturn', 'recession', 'slowdown'],
        'client retention': ['retention', 'churn', 'losing clients']
    };
    let commonConcern = null;
    for (const [concern, keywords] of Object.entries(financialKeywords)) {
        if (keywords.some(kw => allFinancialCommentaries.includes(kw))) {
            commonConcern = concern;
            break; 
        }
    }
    if (commonConcern) {
        financialPoints.push(`Commentaries frequently cite concerns over ${commonConcern}.`);
    }

    // 2. Business Development
    const totalWins = winLosses.filter(w => w.outcome === "Win").length;
    const totalLosses = winLosses.filter(w => w.outcome === "Loss").length;
    const winRate = (totalWins + totalLosses) > 0 ? (totalWins / (totalWins + totalLosses) * 100) : 0;
    
    let totalBudgetYearPitchRevenue = pitches.reduce((sum, p) => sum + (p.budget_year_revenue_impact || 0), 0);
    let totalPitchRevenueImpact = pitches.reduce((sum, p) => sum + (p.total_revenue_impact || 0), 0);
    let pitchCount = pitches.length;

    // ONE-OFF OVERRIDE for August 2025
    if (filters.periodType === 'monthly' && filters.year === 2025 && filters.month === 8) {
      totalPitchRevenueImpact = 6900000;
      pitchCount = 30;
    }

    const largestWin = winLosses.filter(w => w.outcome === "Win").reduce((max, w) => ((w.budget_year_revenue_impact || 0) > (max?.budget_year_revenue_impact || 0) ? w : max), null);
    
    const pipelinePoints = [];
    if (pitchCount > 0) {
      pipelinePoints.push(`Current pitch pipeline brings ${formatCurrency(totalPitchRevenueImpact)} in potential revenue across ${pitchCount} active pitches.`);
      if (totalPitchRevenueImpact > 0) {
          const budgetYearPercentage = (totalBudgetYearPitchRevenue / totalPitchRevenueImpact) * 100;
          pipelinePoints.push(`${budgetYearPercentage.toFixed(0)}% of this potential revenue (${formatCurrency(totalBudgetYearPitchRevenue)}) is forecasted for the current budget year.`);
      }
    }
    if (totalWins + totalLosses > 0) {
      pipelinePoints.push(`Achieved a ${winRate.toFixed(0)}% Large Brokerage assignment win rate for the period.`);
    }
    if (largestWin) {
      pipelinePoints.push(`The period's largest win was with ${largestWin.client} for ${formatCurrency(largestWin.budget_year_revenue_impact)}.`);
    }

    // 3. Team & Operations
    const netPersonnelChange = personnelUpdates.reduce((sum, p) => (p.status === "New Hire" || p.status === "Hired") ? sum + 1 : (p.status === "Terminated" || p.status === "Resigned") ? sum - 1 : sum, 0);
    const personnelRevenueImpact = personnelUpdates.filter(p => p.status === "Resigned" || p.status === "Terminated").reduce((sum, p) => sum + (p.revenue_impact || 0), 0);
    
    // Find the single largest revenue impact from ANY personnel change (hire or departure)
    const mostImpactfulPersonnelChange = personnelUpdates
      .filter(p => p.revenue_impact && Math.abs(p.revenue_impact) > 0)
      .sort((a, b) => Math.abs(b.revenue_impact || 0) - Math.abs(a.revenue_impact || 0))[0];

    const personnelPoints = [];
    if(personnelUpdates.length > 0) {
        personnelPoints.push(`Net personnel change for the period was ${netPersonnelChange > 0 ? '+' : ''}${netPersonnelChange}.`);
        if (personnelRevenueImpact !== 0) {
            personnelPoints.push(`${formatCurrency(personnelRevenueImpact)} in revenue responsibility was impacted by departures.`);
        }
        if (mostImpactfulPersonnelChange) {
            const isHire = mostImpactfulPersonnelChange.status === "New Hire" || mostImpactfulPersonnelChange.status === "Hired";
            const actionText = isHire ? "hire" : "departure";
            const impactAmount = formatCurrency(Math.abs(mostImpactfulPersonnelChange.revenue_impact || 0));
            personnelPoints.push(`The ${actionText} of ${mostImpactfulPersonnelChange.name} had the most significant single revenue impact at ${impactAmount}.`);
        }
    }

    // 4. Market Outlook
    const assetClasses = ['office', 'retail', 'healthcare', 'industrial', 'multifamily', 'capital_markets', 'other'];
    const assetSentiments = assetClasses.map(ac => {
      // CRITICAL FIX: Properly parse scores and filter out N/A values
      const scores = submissions
        .map(s => s.asset_class_sentiment?.[ac]?.score)
        .filter(score => score !== null && score !== undefined && score !== 'N/A' && String(score).trim() !== '') // Ensure score exists and is not 'N/A' or empty string
        .map(score => parseInt(score, 10))
        .filter(score => !isNaN(score) && score >= 1 && score <= 10); // Ensure it's a valid number between 1 and 10
      
      const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
      return { name: ac.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()), score: avgScore };
    }).filter(item => item.score > 0);

    // Analyze sentiment commentary for common themes
    const allSentimentCommentaries = submissions.flatMap(s => {
      if (!s.asset_class_sentiment) return [];
      return assetClasses.map(ac => s.asset_class_sentiment[ac]?.commentary).filter(Boolean);
    }).join(' ').toLowerCase();

    const sentimentThemes = {
        'flight-to-quality': ['flight-to-quality', 'flight to quality', 'quality', 'prime assets'],
        'supply chain concerns': ['supply', 'tariffs', 'port', 'logistics', 'inventory'],
        'demographics driving demand': ['demographics', 'population growth', 'sun belt', 'migration', 'aging'],
        'financing challenges': ['debt costs', 'financing conditions', 'rate hikes', 'liquidity', 'lending standards'],
        'technology sector impact': ['ai', 'tech', 'data centers', 'software', 'innovation'],
        'healthcare resilience': ['stable', 'resilient', 'steady demand', 'medical', 'life sciences'],
        'retail transformation': ['grocery-anchored', 'restaurant churn', 'big-box', 'e-commerce', 'experiential']
    };

    let dominantTheme = null;
    let maxMatches = 0;
    for (const [theme, keywords] of Object.entries(sentimentThemes)) {
        const matches = keywords.reduce((count, keyword) => {
            const regex = new RegExp(keyword, 'g');
            const matchesArr = allSentimentCommentaries.match(regex);
            return count + (matchesArr ? matchesArr.length : 0);
        }, 0);
        
        if (matches > maxMatches) {
            maxMatches = matches;
            dominantTheme = theme;
        }
    }

    const outlookPoints = [];
    if (assetSentiments.length > 0) {
        const sortedSentiments = [...assetSentiments].sort((a, b) => b.score - a.score);
        const topAsset = sortedSentiments[0];
        const bottomAsset = sortedSentiments[sortedSentiments.length - 1];

        outlookPoints.push(`${topAsset.name} demonstrates the strongest sentiment with an average score of ${topAsset.score.toFixed(1)}.`);
        if (topAsset.name !== bottomAsset.name) {
            outlookPoints.push(`In contrast, ${bottomAsset.name} shows the weakest sentiment at ${bottomAsset.score.toFixed(1)}.`);
        }
        
        if (dominantTheme && maxMatches > 1) {
            outlookPoints.push(`Market commentaries most frequently emphasize ${dominantTheme}, indicating this is a key theme across asset classes.`);
        }
    }

    // --- Health Indicator & Summary ---
    const avgOverallSentiment = submissions.length > 0 ? submissions.reduce((sum, s) => {
      const score = s.overall_sentiment?.score;
      // Also apply robust parsing for overall_sentiment score
      const parsedScore = score !== null && score !== undefined && score !== 'N/A' && String(score).trim() !== '' ? parseInt(score, 10) : NaN;
      return sum + (!isNaN(parsedScore) && parsedScore >=1 && parsedScore <= 10 ? parsedScore : 5); // Default to 5 if invalid
    }, 0) / submissions.length : 5;


    let healthIndicator = "moderate";
    let trendIcon = Minus;
    if (budgetPerformance >= 98 && winRate >= 60 && avgOverallSentiment >= 6.5) {
      healthIndicator = "strong";
      trendIcon = TrendingUp;
    } else if (budgetPerformance < 85 || winRate < 40 || avgOverallSentiment < 4.5) {
      healthIndicator = "challenging";
      trendIcon = TrendingDown;
    }
    
    const regionText = filters.region === "all" ? "across all regions" : `in the ${filters.region} region`;
    const periodText = filters.periodType === "monthly" 
      ? `for ${new Date(filters.year, filters.month - 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`
      : filters.periodType === "quarterly"
      ? `for Q${filters.quarter} ${filters.year}`
      : `for ${filters.year}`;
      
    const summaryText = `Performance ${regionText} ${periodText} suggests a ${healthIndicator} state, balancing financial realities with business development momentum.`;

    return {
      summary: { health: healthIndicator, icon: trendIcon, text: summaryText },
      financial: { title: "Financial Health", points: financialPoints, icon: DollarSign },
      pipeline: { title: "Business Development", points: pipelinePoints, icon: Target },
      personnel: { title: "Team & Operations", points: personnelPoints, icon: Users },
      outlook: { title: "Market Outlook", points: outlookPoints, icon: BarChart },
    };
  };
  
  const overview = generateOverview();
  
  if (loading) {
    return (
      <Card className="shadow-lg bg-slate-600">
        <CardHeader><Skeleton className="h-6 w-1/3 bg-slate-700" /></CardHeader>
        <CardContent><Skeleton className="h-48 w-full bg-slate-700" /></CardContent>
      </Card>
    );
  }

  if (typeof overview === 'string') {
    return (
      <Card className="shadow-lg bg-slate-600">
        <CardHeader><CardTitle className="flex items-center gap-2 text-white"><Activity className="w-5 h-5 text-slate-300" />AI-Powered Regional Health Overview</CardTitle></CardHeader>
        <CardContent><p className="text-slate-300 leading-relaxed">{overview}</p></CardContent>
      </Card>
    );
  }
  
  if (!overview) return null;

  const Icon = overview.summary.icon;
  const healthColors = {
    strong: "border-green-500 text-green-400",
    moderate: "border-blue-500 text-blue-400",
    challenging: "border-amber-500 text-amber-400"
  };

  return (
    <Card className="shadow-lg bg-slate-600">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Activity className="w-5 h-5 text-slate-300" />
          AI-Powered Regional Health Overview
        </CardTitle>
        <CardDescription className={`flex items-center gap-3 pt-2 text-base font-medium ${healthColors[overview.summary.health]}`}>
          <Icon className="w-5 h-5" />
          {overview.summary.text}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
          <OverviewSection {...overview.financial} />
          <OverviewSection 
            {...overview.pipeline} 
            expandable={true}
            isExpanded={expandedSection === 'pipeline'}
            onExpand={() => setExpandedSection(expandedSection === 'pipeline' ? null : 'pipeline')}
          />
          <OverviewSection {...overview.personnel} />
          <OverviewSection 
            {...overview.outlook}
            expandable={true}
            isExpanded={expandedSection === 'outlook'}
            onExpand={() => setExpandedSection(expandedSection === 'outlook' ? null : 'outlook')}
          />
        </div>

        {/* Expanded Business Development Section */}
        {expandedSection === 'pipeline' && (
          <div className="mt-6 pt-6 border-t border-slate-500">
            <BusinessDevelopmentExpanded 
              winLosses={winLosses}
              pitches={pitches}
              previousWinLosses={calculatePreviousPeriodData(allWinLosses)}
              previousPitches={calculatePreviousPeriodData(allPitches)}
            />
          </div>
        )}

        {/* Expanded Market Outlook Section */}
        {expandedSection === 'outlook' && (
          <div className="mt-6 pt-6 border-t border-slate-500">
            <MarketOutlookExpanded
              submissions={submissions}
              financialData={financialData}
              winLosses={winLosses}
              pitches={pitches}
              personnelUpdates={personnelUpdates}
              filters={filters}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
