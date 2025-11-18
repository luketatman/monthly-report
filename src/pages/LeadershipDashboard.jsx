import { useState, useEffect, useMemo, useCallback } from "react";
import { MonthlySubmission, OfficeSubmission, WinLoss, Pitch, PersonnelUpdate, FinancialData } from "@/entities/all";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Users,
  Target,
  Award,
  Home
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import KPICards from "../components/dashboard/KPICards";
import RegionalSubmissionStatus from "../components/dashboard/RegionalSubmissionStatus";
import WinsLossesTable from "../components/dashboard/WinsLossesTable";
import PitchesTable from "../components/dashboard/PitchesTable";
import PersonnelTable from "../components/dashboard/PersonnelTable";
import SentimentHeatmap from "../components/dashboard/SentimentHeatmap";
import PerformanceChart from "../components/dashboard/PerformanceChart";
import RegionFilters from "../components/dashboard/RegionFilters";
import FinancialCommentary from "../components/dashboard/FinancialCommentary";
import RegionalHealthOverview from "../components/dashboard/RegionalHealthOverview";
import AIChatbot from "../components/dashboard/AIChatbot";
import OfficePerformanceTable from "../components/dashboard/OfficePerformanceTable";
import PresidentReport from "../components/dashboard/PresidentReport";
import _ from 'lodash';

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

export default function LeadershipDashboard() {
  const navigate = useNavigate();
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [allOfficeSubmissions, setAllOfficeSubmissions] = useState([]);
  const [allWinLosses, setAllWinLosses] = useState([]);
  const [allPitches, setAllPitches] = useState([]);
  const [allPersonnelUpdates, setAllPersonnelUpdates] = useState([]);
  const [allFinancialData, setAllFinancialData] = useState([]);

  const [loading, setLoading] = useState(true);

  // CRITICAL FIX: Default to previous month automatically
  const getPreviousMonthDefaults = () => {
    const now = new Date();
    const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      year: prevMonthDate.getFullYear(),
      month: prevMonthDate.getMonth() + 1, // JavaScript months are 0-indexed
      quarter: Math.floor(prevMonthDate.getMonth() / 3) + 1
    };
  };

  const prevMonthDefaults = getPreviousMonthDefaults();

  const [filters, setFilters] = useState({
    region: "all",
    periodType: "monthly",
    year: prevMonthDefaults.year,
    month: prevMonthDefaults.month,
    quarter: prevMonthDefaults.quarter,
  });

  const correctRegionForMarkets = useCallback((item) => {
    let mutableItem = { ...item };

    // Standardize market name: 'Columbus' becomes 'Ohio'
    if (mutableItem.market === 'Columbus') {
      mutableItem.market = 'Ohio';
    }

    // Correct market-to-region mappings
    const marketRegionMap = {
      'Pittsburgh': 'Central',
      'Denver': 'West',
      'Ohio': 'Central', // Now covers both original 'Ohio' and converted 'Columbus'
      'Austin': 'Central',
      'Dallas': 'Central',
      'Houston': 'Central',
    };

    if (marketRegionMap[mutableItem.market]) {
      mutableItem.region = marketRegionMap[mutableItem.market];
    }
    return mutableItem;
  }, []);

  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        submissions,
        officeSubmissions,
        winLosses,
        pitches,
        personnel,
        financials,
      ] = await Promise.all([
        MonthlySubmission.list("-created_date", 2000), // Increased limit to ensure we get all data to filter
        OfficeSubmission.list("-created_date", 2000),
        WinLoss.list("-created_date", 2000),
        Pitch.list("-created_date", 2000),
        PersonnelUpdate.list("-created_date", 2000),
        FinancialData.list("-created_date", 2000),
      ]);

      // Set state with the raw, unfiltered data. Filtering will happen in useMemo.
      setAllSubmissions(submissions.map(correctRegionForMarkets));
      setAllOfficeSubmissions(officeSubmissions.map(correctRegionForMarkets));
      setAllWinLosses(winLosses.map(correctRegionForMarkets));
      setAllPitches(pitches.map(correctRegionForMarkets));
      setAllPersonnelUpdates(personnel.map(correctRegionForMarkets));
      setAllFinancialData(financials.map(correctRegionForMarkets));

    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [correctRegionForMarkets]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredData = useMemo(() => {
    const { periodType, year, month, quarter, region } = filters;

    let relevantMonths = [];
    if (periodType === 'monthly') {
      relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      const startMonth = (quarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        relevantMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
        for(let i = 1; i <= 12; i++) {
            relevantMonths.push(`${year}-${String(i).padStart(2, '0')}`);
        }
    }

    // First, find which regions have submitted RMD reports for the relevant months
    const submittedRegionMonths = new Set();
    allSubmissions.forEach(submission => {
      if (submission.status === 'submitted' && relevantMonths.includes(submission.month)) {
        const regionMatch = region === 'all' || submission.region === region;
        if (regionMatch) {
          submittedRegionMonths.add(`${submission.region}-${submission.month}`);
        }
      }
    });

    // Filter function that only includes data from regions with submitted RMD reports
    const filterFunc = (item) => {
      if (!item.month) return false;
      const isRegionMatch = region === 'all' || item.region === region;
      const isMonthMatch = relevantMonths.includes(item.month);
      const hasSubmittedRMDReport = submittedRegionMonths.has(`${item.region}-${item.month}`);

      return isRegionMatch && isMonthMatch && hasSubmittedRMDReport;
    };

    // De-duplicate financial data to use only the most recently updated record per market/month
    // But only include data from regions with submitted RMD reports
    const financialDataForPeriod = allFinancialData.filter(filterFunc);
    const latestFinancialData = _.uniqBy(
        _.orderBy(financialDataForPeriod, ['updated_date'], ['desc']),
        item => `${item.region}-${item.market}-${item.month}`
    );

    return {
        // Submissions are filtered by submitted status (this stays the same)
        submissions: allSubmissions.filter(s => {
          if (!s.month) return false;
          const isRegionMatch = region === 'all' || s.region === region;
          const isMonthMatch = relevantMonths.includes(s.month);
          return isRegionMatch && isMonthMatch && s.status === 'submitted';
        }),
        // Office submissions are filtered by submitted RMD reports
        officeSubmissions: allOfficeSubmissions.filter(filterFunc).filter(s => s.status === 'submitted'),
        // Other operational data is now filtered to only include regions with submitted RMD reports
        winLosses: allWinLosses.filter(filterFunc),
        pitches: allPitches.filter(filterFunc),
        personnelUpdates: allPersonnelUpdates.filter(filterFunc),
        financialData: latestFinancialData,
    };
  }, [filters, allSubmissions, allOfficeSubmissions, allWinLosses, allPitches, allPersonnelUpdates, allFinancialData]);

  const sentimentSubmissions = useMemo(() => {
    const { periodType, year, month, quarter, region } = filters;

    let relevantMonths = [];
    if (periodType === 'monthly') {
      relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      const startMonth = (quarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        relevantMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
        for(let i = 1; i <= 12; i++) {
            relevantMonths.push(`${year}-${String(i).padStart(2, '0')}`);
        }
    }

    const filterByDateAndRegion = (item) => {
      if (!item.month) return false;
      const isMonthMatch = relevantMonths.includes(item.month);
      const isRegionMatch = region === 'all' || item.region === region;
      return isMonthMatch && isRegionMatch;
    };

    // Filter submissions by date, region, and status
    return allSubmissions
      .filter(filterByDateAndRegion)
      .filter(s => s.status === 'submitted');

  }, [filters, allSubmissions]);

  const previousPeriodSentimentSubmissions = useMemo(() => {
    const { periodType, year, month, quarter, region } = filters;

    let previousPeriodMonths = [];
    if (periodType === 'monthly') {
      // Previous month
      const prevMonth = month === 1 ? 12 : month - 1;
      const prevYear = month === 1 ? year - 1 : year;
      previousPeriodMonths.push(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      // Previous quarter
      const prevQuarter = quarter === 1 ? 4 : quarter - 1;
      const prevYear = quarter === 1 ? year - 1 : year;
      const startMonth = (prevQuarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        previousPeriodMonths.push(`${prevYear}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
      // Previous year
      const prevYear = year - 1;
      for(let i = 1; i <= 12; i++) {
        previousPeriodMonths.push(`${prevYear}-${String(i).padStart(2, '0')}`);
      }
    }

    const filterByDateAndRegion = (item) => {
      if (!item.month) return false;
      const isMonthMatch = previousPeriodMonths.includes(item.month);
      const isRegionMatch = region === 'all' || item.region === region;
      return isMonthMatch && isRegionMatch;
    };

    // Filter submissions by date, region, and status
    return allSubmissions
      .filter(filterByDateAndRegion)
      .filter(s => s.status === 'submitted');

  }, [filters, allSubmissions]);

  const sentimentAverages = useMemo(() => {
    const assetClasses = ['office', 'retail', 'healthcare', 'industrial', 'multifamily', 'capital_markets', 'other'];

    // Calculate average across all asset classes for both periods - exactly matching SentimentHeatmap logic
    const calculateOverallAverage = (submissionData) => {
      const scoresByMonth = {};

      // Collect current period scores by month across all asset classes
      submissionData.forEach((s) => {
        if (s.asset_class_sentiment) {
          const monthScores = [];
          assetClasses.forEach((ac) => {
            const score = s.asset_class_sentiment[ac]?.score;
            // CRITICAL FIX: Filter out N/A values, null, and undefined, and ensure it's a valid number between 1 and 10
            if (score && score !== 'N/A' && score !== null && score !== undefined) {
              const parsedScore = parseInt(score, 10);
              if (!isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 10) {
                monthScores.push(parsedScore);
              }
            }
          });

          if (monthScores.length > 0) {
            scoresByMonth[s.month] = monthScores.reduce((sum, score) => sum + score, 0) / monthScores.length;
          }
        }
      });

      const monthlyAverages = Object.values(scoresByMonth);
      const overallAverage = monthlyAverages.length > 0 ?
        monthlyAverages.reduce((sum, avg) => sum + avg, 0) / monthlyAverages.length : 0;

      return overallAverage;
    };

    const currentOverallAverage = calculateOverallAverage(sentimentSubmissions);
    const previousOverallAverage = calculateOverallAverage(previousPeriodSentimentSubmissions);

    // Calculate period-over-period trend
    let trend = 0;
    if (currentOverallAverage > 0 && previousOverallAverage > 0) {
      trend = currentOverallAverage - previousOverallAverage;
    } else if (currentOverallAverage > 0 && previousOverallAverage === 0) {
      trend = currentOverallAverage;
    } else if (currentOverallAverage === 0 && previousOverallAverage > 0) {
      trend = -previousOverallAverage;
    }

    return {
        current: currentOverallAverage,
        trend: trend,
    }
  }, [sentimentSubmissions, previousPeriodSentimentSubmissions]);

  const handleKPICardClick = (section) => {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="p-6 md:p-8 bg-slate-400 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Button
                onClick={() => navigate(createPageUrl('Dashboard'))}
                variant="outline"
                className="bg-white/90 hover:bg-white border-slate-300 text-slate-700 hover:text-slate-900"
              >
                <Home className="w-4 h-4 mr-2" />
                Return Home
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Health of the Company: US Brokerage</h1>
            <p className="text-slate-600 mt-1">Monthly business intelligence insights and financial overview</p>
          </div>
          <RegionFilters filters={filters} onFiltersChange={setFilters} />
        </div>

        {/* RMD Submission Status - Minimalist Bar */}
        <div id="submissions">
          <RegionalSubmissionStatus allSubmissions={allSubmissions} filters={filters} loading={loading} />
        </div>

        {/* KPI Cards */}
        <KPICards
          submissions={filteredData.submissions}
          sentimentSubmissions={sentimentSubmissions}
          sentimentAverages={sentimentAverages}
          winLosses={filteredData.winLosses}
          pitches={filteredData.pitches}
          personnelUpdates={filteredData.personnelUpdates}
          financialData={filteredData.financialData}
          loading={loading}
          filters={filters}
          onCardClick={handleKPICardClick}
        />

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Performance Chart */}
            <PerformanceChart
              financialData={filteredData.financialData}
              submissions={filteredData.submissions}
              filters={filters}
              loading={loading}
            />
          </div>

          <div className="space-y-6">
            {/* Sentiment Heatmap */}
            <div id="sentiment">
              <SentimentHeatmap
                submissions={sentimentSubmissions}
                previousPeriodSubmissions={previousPeriodSentimentSubmissions}
                loading={loading}
              />
            </div>
          </div>
        </div>

        {/* Monthly Financial Overview - Full Width */}
        <div id="financial">
          <OfficePerformanceTable
            financialData={filteredData.financialData}
            submissions={filteredData.submissions}
            loading={loading}
            filters={filters}
          />
        </div>

        {/* Market Commentary */}
        <FinancialCommentary
          submissions={filteredData.submissions}
          financialData={filteredData.financialData}
          allFinancialData={allFinancialData}
          loading={loading}
          filters={filters}
        />

        {/* Regional Health Overview */}
        <RegionalHealthOverview
          submissions={filteredData.submissions}
          winLosses={filteredData.winLosses}
          pitches={filteredData.pitches}
          personnelUpdates={filteredData.personnelUpdates}
          financialData={filteredData.financialData}
          allWinLosses={allWinLosses}
          allPitches={allPitches}
          loading={loading}
          filters={filters}
        />

        {/* Data Tables */}
        <Tabs defaultValue="wins" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger
              value="wins"
              className="flex items-center gap-2 text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-inner"
            >
              <Award className="w-4 h-4" />
              Wins & Losses
            </TabsTrigger>
            <TabsTrigger
              value="pitches"
              className="flex items-center gap-2 text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-inner"
            >
              <Target className="w-4 h-4" />
              Pitches
            </TabsTrigger>
            <TabsTrigger
              value="personnel"
              className="flex items-center gap-2 text-slate-600 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 data-[state=active]:font-semibold data-[state=active]:shadow-inner"
            >
              <Users className="w-4 h-4" />
              Personnel
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wins" className="mt-6">
            <div id="wins">
              <WinsLossesTable winLosses={filteredData.winLosses} loading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="pitches" className="mt-6">
            <div id="pitches">
              <PitchesTable pitches={filteredData.pitches} loading={loading} />
            </div>
          </TabsContent>

          <TabsContent value="personnel" className="mt-6">
            <div id="personnel">
              <PersonnelTable personnelUpdates={filteredData.personnelUpdates} loading={loading} />
            </div>
          </TabsContent>
        </Tabs>

        {/* President's Report Generator */}
        <PresidentReport
          filters={filters}
          filteredData={filteredData}
          allSubmissions={allSubmissions}
          allOfficeSubmissions={allOfficeSubmissions}
          allWinLosses={allWinLosses}
          allPitches={allPitches}
          allPersonnelUpdates={allPersonnelUpdates}
        />
      </div>
      <AIChatbot />
    </div>
  );
}