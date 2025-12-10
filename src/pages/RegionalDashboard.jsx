import React, { useState, useEffect, useMemo, useCallback } from "react";
import { MonthlySubmission, OfficeSubmission, WinLoss, Pitch, PersonnelUpdate, FinancialData } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  Target,
  DollarSign,
  Building2,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle,
  Edit3,
  XCircle,
  ArrowLeft
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import KPICards from "../components/dashboard/KPICards";
// Removed: import RegionalSubmissionStatus from "../components/dashboard/RegionalSubmissionStatus";
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
import RegionalReport from "../components/dashboard/RegionalReport";
import _ from 'lodash';

const getCurrentQuarter = () => Math.floor(new Date().getMonth() / 3) + 1;

export default function RegionalDashboard({ userRegion }) {
  const navigate = useNavigate();
  const [allSubmissions, setAllSubmissions] = useState([]);
  const [allOfficeSubmissions, setAllOfficeSubmissions] = useState([]); // New state variable
  const [allWinLosses, setAllWinLosses] = useState([]);
  const [allPitches, setAllPitches] = useState([]);
  const [allPersonnelUpdates, setAllPersonnelUpdates] = useState([]);
  const [allFinancialData, setAllFinancialData] = useState([]);
  const [regionData, setRegionData] = useState(null); // New state variable

  const [loading, setLoading] = useState(true);

  // CRITICAL FIX: Default to previous month automatically (same as President dashboard)
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
    region: userRegion, // Default to the logged-in RMD's region, or MD's market
    periodType: "monthly",
    year: prevMonthDefaults.year,
    month: prevMonthDefaults.month,
    quarter: prevMonthDefaults.quarter
  });

  const mainRegions = ['Northeast', 'Central', 'South', 'West'];
  const isMarketView = !mainRegions.includes(userRegion);

  const correctRegionForMarkets = useCallback((item) => {
    let mutableItem = { ...item };

    // Standardize market name: 'Columbus' becomes 'Ohio'
    if (mutableItem.market === 'Columbus') {
      mutableItem.market = 'Ohio';
    }
    // Standardize office_location name: 'Columbus' becomes 'Ohio'
    if (mutableItem.office_location === 'Columbus') {
      mutableItem.office_location = 'Ohio';
    }


    // Correct market-to-region mappings
    const marketRegionMap = {
      'Pittsburgh': 'Central',
      'Denver': 'West',
      'Ohio': 'Central', // Now covers both original 'Ohio' and converted 'Columbus'
      'Austin': 'Central',
      'Dallas': 'Central',
      'Houston': 'Central'
    };

    // Ensure region property is correctly set for market-level items as well
    if (mutableItem.market && marketRegionMap[mutableItem.market]) {
      mutableItem.region = marketRegionMap[mutableItem.market];
    } else if (mutableItem.office_location && marketRegionMap[mutableItem.office_location]) {
      mutableItem.region = marketRegionMap[mutableItem.office_location];
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
        financials
      ] =
        await Promise.all([
          MonthlySubmission.list("-created_date", 2000),
          OfficeSubmission.list("-created_date", 2000),
          WinLoss.list("-created_date", 2000),
          Pitch.list("-created_date", 2000),
          PersonnelUpdate.list("-created_date", 2000),
          FinancialData.list("-created_date", 2000)
        ]);

      const marketMatch = (itemMarket) => {
        if (!itemMarket) return false;
        // Normalize both values for comparison - remove spaces and lowercase
        const normalizedItem = itemMarket.replace(/\s+/g, '').toLowerCase();
        const normalizedRegion = userRegion.replace(/\s+/g, '').toLowerCase();
        return normalizedItem === normalizedRegion;
      };

      const allData = {
        submissions: submissions.map(correctRegionForMarkets),
        officeSubmissions: officeSubmissions.map(correctRegionForMarkets),
        winLosses: winLosses.map(correctRegionForMarkets),
        pitches: pitches.map(correctRegionForMarkets),
        personnel: personnel.map(correctRegionForMarkets),
        financials: financials.map(correctRegionForMarkets)
      };

      let filteredSubmissions, filteredOfficeSubmissions, filteredWinLosses, filteredPitches, filteredPersonnel, filteredFinancials;

      if (isMarketView) {
        // MD View: Filter by market/office_location, case-insensitive
        filteredSubmissions = allData.submissions.filter((s) => marketMatch(s.market));
        filteredOfficeSubmissions = allData.officeSubmissions.filter((s) => marketMatch(s.market));
        filteredWinLosses = allData.winLosses.filter((w) => marketMatch(w.office_location));
        filteredPitches = allData.pitches.filter((p) => marketMatch(p.office_location));
        filteredPersonnel = allData.personnel.filter((p) => marketMatch(p.office_location));
        filteredFinancials = allData.financials.filter((f) => marketMatch(f.market));
      } else {
        // RMD View: Filter by region
        filteredSubmissions = allData.submissions.filter((s) => s.region === userRegion);
        filteredOfficeSubmissions = allData.officeSubmissions.filter((s) => s.region === userRegion);
        filteredWinLosses = allData.winLosses.filter((w) => w.region === userRegion);
        filteredPitches = allData.pitches.filter((p) => p.region === userRegion);
        filteredPersonnel = allData.personnel.filter((p) => p.region === userRegion);
        filteredFinancials = allData.financials.filter((f) => f.region === userRegion);
      }

      setAllSubmissions(filteredSubmissions);
      setAllOfficeSubmissions(filteredOfficeSubmissions);
      setAllWinLosses(filteredWinLosses);
      setAllPitches(filteredPitches);
      setAllPersonnelUpdates(filteredPersonnel);
      setAllFinancialData(filteredFinancials);

    } catch (error) {
      console.error("Error loading regional dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, [correctRegionForMarkets, userRegion, isMarketView]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const filteredData = useMemo(() => {
    const { periodType, year, month, quarter } = filters;

    let relevantMonths = [];
    if (periodType === 'monthly') {
      relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      const startMonth = (quarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        relevantMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
      for (let i = 1; i <= 12; i++) {
        relevantMonths.push(`${year}-${String(i).padStart(2, '0')}`);
      }
    }

    const filterFunc = (item) => {
      if (!item.month) return false;
      return relevantMonths.includes(item.month);
    };

    const financialDataForPeriod = allFinancialData.filter(filterFunc);
    const latestFinancialData = _.uniqBy(
      _.orderBy(financialDataForPeriod, ['updated_date'], ['desc']),
      (item) => `${item.region}-${item.market}-${item.month}`
    );

    return {
      // Submissions are still filtered by status to accurately reflect what has been formally submitted.
      submissions: allSubmissions.filter(filterFunc).filter((s) => s.status === 'submitted'),
      winLosses: allWinLosses.filter(filterFunc),
      pitches: allPitches.filter(filterFunc),
      personnelUpdates: allPersonnelUpdates.filter(filterFunc),
      financialData: latestFinancialData
    };
  }, [filters, allSubmissions, allWinLosses, allPitches, allPersonnelUpdates, allFinancialData]);

  const sentimentSubmissions = useMemo(() => {
    const { periodType, year, month, quarter } = filters;

    let relevantMonths = [];
    if (periodType === 'monthly') {
      relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
    } else if (periodType === 'quarterly') {
      const startMonth = (quarter - 1) * 3 + 1;
      for (let i = 0; i < 3; i++) {
        relevantMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
      }
    } else if (periodType === 'yearly') {
      for (let i = 1; i <= 12; i++) {
        relevantMonths.push(`${year}-${String(i).padStart(2, '0')}`);
      }
    }

    const filterByDate = (item) => {
      if (!item.month) return false;
      return relevantMonths.includes(item.month);
    };

    // For both MD and RMD views, use OfficeSubmissions to show office-level commentary
    // This allows RMD to see all offices in their region, MD to see their specific office
    return allOfficeSubmissions.
      filter(filterByDate).
      filter((s) => s.status === 'submitted');

  }, [filters, allOfficeSubmissions]);

  const previousPeriodSentimentSubmissions = useMemo(() => {
    const { periodType, year, month, quarter } = filters;

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
      for (let i = 1; i <= 12; i++) {
        previousPeriodMonths.push(`${prevYear}-${String(i).padStart(2, '0')}`);
      }
    }

    const filterByDate = (item) => {
      if (!item.month) return false;
      return previousPeriodMonths.includes(item.month);
    };

    // For both MD and RMD views, use OfficeSubmissions to show office-level commentary
    return allOfficeSubmissions.
      filter(filterByDate).
      filter((s) => s.status === 'submitted');

  }, [filters, allOfficeSubmissions]);

  const sentimentAverages = useMemo(() => {
    const assetClasses = ['office', 'retail', 'healthcare', 'industrial', 'multifamily', 'capital_markets', 'other'];

    const calculateOverallAverage = (submissionData) => {
      const scoresByMonth = {};

      submissionData.forEach((s) => {
        if (s.asset_class_sentiment) {
          const monthScores = [];
          assetClasses.forEach((ac) => {
            const score = s.asset_class_sentiment[ac]?.score;
            // CRITICAL FIX: Filter out N/A values and ensure valid numbers
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

  // Remove region selector from filters since it's locked to user's region/market
  const handleFiltersChange = (newFilters) => {
    // For a market-view, the 'region' in filters is the market name.
    setFilters({ ...newFilters, region: userRegion });
  };

  return (
    <div className="bg-slate-400 p-6 md:p-8 from-slate-50 to-blue-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{userRegion} {isMarketView ? 'Office' : 'Region'} Dashboard</h1>
              <p className="text-slate-600 mt-1">Real-time performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RegionFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              hideRegionSelector={true} />

            <Button variant="outline" onClick={() => {
              sessionStorage.removeItem('verifiedPinData');
              window.location.href = createPageUrl('Dashboard');
            }}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>

        {/* RMD Submission Status - Minimalist Bar (Removed) */}

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
          onCardClick={handleKPICardClick} />


        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <PerformanceChart
              financialData={filteredData.financialData}
              submissions={filteredData.submissions}
              filters={filters}
              loading={loading} />

          </div>

          <div className="lg:col-span-1 space-y-6">
            <div id="sentiment">
              <SentimentHeatmap
                submissions={sentimentSubmissions}
                previousPeriodSubmissions={previousPeriodSentimentSubmissions}
                loading={loading} />

            </div>
          </div>

          <div className="lg:col-span-3" id="financial">
            <OfficePerformanceTable
              financialData={filteredData.financialData}
              loading={loading}
              filters={filters} />

          </div>
        </div>

        <FinancialCommentary
          submissions={filteredData.submissions}
          financialData={filteredData.financialData}
          loading={loading}
          filters={filters} />


        <RegionalHealthOverview
          submissions={filteredData.submissions}
          winLosses={filteredData.winLosses}
          pitches={filteredData.pitches}
          personnelUpdates={filteredData.personnelUpdates}
          financialData={filteredData.financialData}
          loading={loading}
          filters={filters} />


        {/* Data Tables */}
        <Tabs defaultValue="wins" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm">
            <TabsTrigger value="wins" className="flex items-center gap-2">
              <Award className="w-4 h-4" />
              Wins & Losses
            </TabsTrigger>
            <TabsTrigger value="pitches" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Pitches
            </TabsTrigger>
            <TabsTrigger value="personnel" className="flex items-center gap-2">
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

        {/* Regional Report Generator */}
        <RegionalReport
          filters={filters}
          filteredData={filteredData}
          allSubmissions={allSubmissions}
          allOfficeSubmissions={allOfficeSubmissions}
          allWinLosses={allWinLosses}
          allPitches={allPitches}
          allPersonnelUpdates={allPersonnelUpdates}
          userRegion={userRegion}
          isMarketView={isMarketView}
        />
      </div>
      <AIChatbot />
    </div>);

}