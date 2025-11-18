
import { useState, useEffect, useMemo, useCallback } from "react";
import { MonthlySubmission, FinancialData, Region, OfficeSubmission } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save,
  Send,
  Building2,
  CheckCircle,
  Calendar,
  LogOut,
  Clock,
  Map,
  Check,
  AlertTriangle,
  XCircle,
  Info,
} from "lucide-react";
import { format, addMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import _ from "lodash";

import FinancialOverview from "../components/report/FinancialOverview";
import YearEndForecast from "../components/report/YearEndForecast";
import WinLossForm from "../components/report/WinLossForm";
import PitchForm from "../components/report/PitchForm";
import PersonnelForm from "../components/report/PersonnelForm";
import SentimentForm from "../components/report/SentimentForm";
import OverallSentiment from "../components/report/OverallSentiment";
import OfficeSubmissionsReview from "../components/report/OfficeSubmissionsReview";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const mainRegionNames = ["Northeast", "South", "West", "Central"];

export default function MonthlyReport() {
  const [user, setUser] = useState(null);
  const [region, setRegion] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubmissionPeriod, setIsSubmissionPeriod] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false); // NEW: Track confirmation loading
  const navigate = useNavigate();

  const [allRegions, setAllRegions] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), -1), "yyyy-MM")); // Default to previous month
  const [allSubmissionsForRegion, setAllSubmissionsForRegion] = useState([]);
  const [officeSubmissions, setOfficeSubmissions] = useState([]);

  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Create debounced update function using useMemo instead of useCallback
  const debouncedUpdate = useMemo(
    () => _.debounce(async (id, updates, currentSubmission) => {
      try {
        if (id) {
          await MonthlySubmission.update(id, updates);
          console.log("RMD: Autosaved existing submission:", id, updates);
        } else {
          // This should ideally not happen if we ensure an ID exists before updates,
          // but for a new report's first save, it creates it.
          console.log("RMD: Creating new submission on debounce...");
          const newRecord = await MonthlySubmission.create(currentSubmission);
          setSubmission(newRecord); // Update state with the new ID
          console.log("RMD: Created new submission and autosaved:", newRecord.id, newRecord);
        }
        setError(null); // Clear error if save was successful
      } catch (e) {
        console.error("Failed to save RMD submission:", e);
        setError("Failed to save your changes automatically. Please check your connection.");
      } finally {
        setSaving(false);
      }
    }, 1500), // 1.5 second debounce delay
    []
  );

  const availableMonths = useMemo(() => {
    const months = [];
    const today = new Date();
    // Start from the current month and go back 5 months (total 6 months: current + 5 previous)
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMMM yyyy"),
      });
    }
    return months;
  }, []);

  const loadInitialData = useCallback(async () => {
    setPageLoading(true);
    setError(null);
    try {
      // Added a timeout to the initial region fetch
      const regions = await Promise.race([
        Region.list(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000) // 15-second timeout
        )
      ]);
      const filteredRegions = regions.filter(r => mainRegionNames.includes(r.name));
      const uniqueRegions = _.uniqBy(filteredRegions, 'name');
      setAllRegions(uniqueRegions);
    } catch (e) {
      console.error("Failed to load initial data:", e);
      let errorMessage = e.message;
      if (e.message === "Timeout") {
        errorMessage = "Failed to load initial region data: The request timed out."
      } else if (e.message === "Network Error") {
        errorMessage = "A network error occurred while loading initial data. Please check your connection."
      }
      setError(errorMessage);
    } finally {
      setPageLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedPinDataString = sessionStorage.getItem('verifiedPinData');
    if (storedPinDataString) {
      try {
        const storedPinData = JSON.parse(storedPinDataString);
        if (storedPinData.title !== 'RMD') {
          console.error("PIN data is not for RMD role, redirecting.");
          navigate(createPageUrl("Dashboard"));
          return;
        }
        setPinData(storedPinData);
        loadInitialData();
      } catch (e) {
        console.error("Failed to parse PIN data, redirecting.", e);
        navigate(createPageUrl("Dashboard"));
      }
    } else {
      console.log("No verified PIN data found, using demo RMD profile for Central region.");
      const demoPinData = {
        title: "RMD",
        region: "Central",
        office_location: "Central Region",
        email: "demo-rmd-central@avisonyoung.com",
        full_name: "Demo RMD (Central)"
      };
      setPinData(demoPinData);
      loadInitialData();
    }
  }, [navigate, loadInitialData]);

  const handleConfirmSelection = async () => {
    if (!selectedMonth || !pinData || isConfirming) return; // Prevent multiple clicks

    setIsConfirming(true); // Disable button
    setError(null);
    setLoading(true);

    try {
      const userRegion = pinData.region;
      
      let selectedRegionObj = allRegions.find((r) => {
        if (r.name === userRegion) return true;
        const normalizedRegion = r.name.toLowerCase().replace(/\s+/g, '');
        const normalizedUserRegion = userRegion.toLowerCase().replace(/\s+/g, '');
        return normalizedRegion === normalizedUserRegion;
      });

      if (!selectedRegionObj) {
        console.error("Could not find exact region match for:", userRegion);
        selectedRegionObj = allRegions.find((r) => {
          const regionWords = r.name.toLowerCase().split(/\s+/);
          const userRegionWords = userRegion.toLowerCase().split(/\s+/);
          return userRegionWords.some(word => 
            word.length > 2 && regionWords.some(regionWord => 
              regionWord.includes(word) || word.includes(regionWord)
            )
          );
        });

        if (selectedRegionObj) {
          setError(`Could not find exact match for "${userRegion}". Using "${selectedRegionObj.name}" as fallback.`);
        } else if (allRegions.length > 0) {
          selectedRegionObj = allRegions[0];
          setError(`Could not find region "${userRegion}". Using "${selectedRegionObj.name}" as fallback.`);
        } else {
          throw new Error("No regions available in the system. Please contact the administrator.");
        }
      }
      
      setRegion(selectedRegionObj);
      const generatedEmail = `${pinData.title.toLowerCase()}-${pinData.region.toLowerCase().replace(/\s+/g, '')}@avisonyoung.com`;
      setUser({ email: generatedEmail, role: pinData.title, full_name: `${pinData.title} (${pinData.region})` });

      console.log("MonthlyReport: Fetching existing submission for region:", selectedRegionObj.name, "month:", selectedMonth);

      const fetchOfficeSubmissionsWithRetry = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const officeSubmissionsData = await Promise.race([
              OfficeSubmission.filter({ region: selectedRegionObj.name, month: selectedMonth }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            return officeSubmissionsData;
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`Office submission fetch attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
          }
        }
      };

      const officeSubmissionsData = await fetchOfficeSubmissionsWithRetry();
      setOfficeSubmissions(officeSubmissionsData);

      const submittedOfficeSubmissions = officeSubmissionsData.filter(s => s.status === 'submitted');

      let calculatedOverallAverageNumber = 5;
      const validOverallScores = submittedOfficeSubmissions
          .filter(s => s.overall_sentiment && s.overall_sentiment.score !== undefined && s.overall_sentiment.score !== null && s.overall_sentiment.score !== 'N/A')
          .map(s => parseInt(s.overall_sentiment.score, 10))
          .filter(score => !isNaN(score));

      if (validOverallScores.length > 0) {
          const sumOfScores = validOverallScores.reduce((acc, score) => acc + score, 0);
          calculatedOverallAverageNumber = Math.round(sumOfScores / validOverallScores.length);
      }

      const assetClasses = ["office", "retail", "healthcare", "industrial", "multifamily", "capital_markets", "other"];
      const calculatedAssetSentiments = {};

      assetClasses.forEach(ac => {
          const scoresForClass = submittedOfficeSubmissions
              .map(s => s.asset_class_sentiment?.[ac]?.score)
              .filter(score => score !== undefined && score !== null && score !== 'N/A')
              .map(score => parseInt(score, 10))
              .filter(score => !isNaN(score));

          if (scoresForClass.length > 0) {
              const sum = scoresForClass.reduce((acc, score) => acc + score, 0);
              calculatedAssetSentiments[ac] = {
                  score: String(Math.round(sum / scoresForClass.length)),
                  commentary: ""
              };
          } else {
              calculatedAssetSentiments[ac] = { score: "5", commentary: "" };
          }
      });
      
      const calculatedFinancialCommentaries = {};
      submittedOfficeSubmissions.forEach(sub => {
        if (sub.market && sub.financial_commentary) {
          calculatedFinancialCommentaries[sub.market] = sub.financial_commentary;
        }
      });

      const existingSubmissions = await MonthlySubmission.filter({ region: selectedRegionObj.name, month: selectedMonth });
      let currentSubmission;

      // CRITICAL FIX: Handle duplicates and create immediately
      if (existingSubmissions.length > 1) {
        console.warn(`Found ${existingSubmissions.length} duplicate RMD submissions for ${selectedRegionObj.name} - ${selectedMonth}. Cleaning up...`);
        
        const submittedSubmission = existingSubmissions.find(s => s.status === 'submitted');
        const sortedByDate = existingSubmissions.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        
        currentSubmission = submittedSubmission || sortedByDate[0];
        
        const duplicatesToDelete = existingSubmissions.filter(s => s.id !== currentSubmission.id);
        console.log(`Deleting ${duplicatesToDelete.length} duplicate RMD submissions...`);
        
        for (const duplicate of duplicatesToDelete) {
          try {
            await MonthlySubmission.delete(duplicate.id);
            console.log(`Deleted duplicate RMD submission: ${duplicate.id}`);
          } catch (deleteError) {
            console.error(`Failed to delete duplicate RMD submission ${duplicate.id}:`, deleteError);
          }
        }
      } else if (existingSubmissions.length === 1) {
        currentSubmission = existingSubmissions[0];
        console.log("MonthlyReport: Using existing submission:", currentSubmission);
      } else {
        // CRITICAL FIX: Create the submission in the database immediately
        console.log("MonthlyReport: Creating new RMD submission for month:", selectedMonth);
        const newSubmissionData = {
            region: selectedRegionObj.name,
            managing_director: generatedEmail,
            month: selectedMonth,
            status: "draft",
            financial_commentary: calculatedFinancialCommentaries,
            win_loss: { total_wins: 0, total_losses: 0, wins: [], losses: [] },
            pitch_activity: { total_pitches: 0, pitches: [] },
            asset_class_sentiment: calculatedAssetSentiments,
            overall_sentiment: { score: String(calculatedOverallAverageNumber), commentary: "" },
            rmd_regional_commentary: "",
            rmd_ytd_year_end_commentary: "",
        };
        
        try {
          currentSubmission = await MonthlySubmission.create(newSubmissionData);
          console.log("MonthlyReport: Created new RMD submission with ID:", currentSubmission.id);
        } catch (createError) {
          console.error("Failed to create RMD submission, checking for race condition:", createError);
          const retrySubmissions = await MonthlySubmission.filter({
            region: selectedRegionObj.name,
            month: selectedMonth
          });
          
          if (retrySubmissions.length > 0) {
            console.log("Found RMD submission created by another process, using that instead");
            currentSubmission = retrySubmissions[0];
          } else {
            throw createError;
          }
        }
      }

      setSubmission(currentSubmission);
      setIsSubmissionPeriod(true);

      const fetchFinancialDataWithRetry = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const financials = await Promise.race([
              FinancialData.filter({ region: selectedRegionObj.name, month: selectedMonth }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000))
            ]);
            return financials;
          } catch (error) {
            if (i === maxRetries - 1) throw error;
            console.log(`Financial data fetch attempt ${i + 1} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1)));
          }
        }
      };

      const financials = await fetchFinancialDataWithRetry();
      setFinancialData(financials);

      const historicalMonths = ["2025-04", "2025-05"];
      const historicalSubmissions = historicalMonths.map(m => ({
        id: `hist-sub-${selectedRegionObj.name}-${m}`,
        region: selectedRegionObj.name,
        month: m,
        status: "submitted",
      }));
      setAllSubmissionsForRegion(historicalSubmissions);

      setIsConfirmed(true);
    } catch (e) {
      console.error("Failed to load RMD report data:", e);
      let errorMessage = "An error occurred while fetching report data.";
      
      if (e.message === "Timeout") {
        errorMessage = "The data request timed out. Please try again.";
      } else if (e.message === "Network Error") {
        errorMessage = "A network error occurred. Please check your connection and try again.";
      } else {
        errorMessage = e.message;
      }
      
      setError(errorMessage);
      setIsConfirmed(false);
    } finally {
      setLoading(false);
      setIsConfirming(false); // Re-enable button
    }
  };

  const handleBackToSelection = () => {
    setIsConfirmed(false);
    setSubmission(null);
    setFinancialData([]);
    setRegion(null);
    setOfficeSubmissions([]);
    setAllSubmissionsForRegion([]);
    setError(null);
  };

  const handleForecastUpdate = async () => {
    if (!region) return;
    const financialRecords = await FinancialData.filter({ region: region.name, month: selectedMonth });
    setFinancialData(financialRecords);
  };

  const updateSubmission = async (updates) => {
    if (!submission || submission.status === "submitted") return;

    setSaving(true);
    // Merge updates into the existing submission state for optimistic UI update
    const updatedData = { ...submission, ...updates };
    setSubmission(updatedData);

    // Call the debounced function for the actual API call
    debouncedUpdate(updatedData.id, updates, updatedData);
  };

  const submitReport = async () => {
    if (!submission || submission.status === "submitted" || !submission.id) return;

    setSaving(true);
    // Ensure any pending debounced updates are flushed before submitting
    debouncedUpdate.flush(); 

    const finalData = {
        ...submission,
        status: "submitted",
        submitted_at: new Date().toISOString()
    };
    try {
        await MonthlySubmission.update(submission.id, finalData);
        setSubmission(finalData);
        console.log("RMD: Submitted report:", submission.id);
        setError(null); // Clear error on successful submission
    } catch(e) {
        console.error("Failed to submit report", e);
        setError("Failed to submit report. Please check your connection and try again.");
    } finally {
        setSaving(false);
    }
  };

  const handleLogout = async () => {
    navigate(createPageUrl("Dashboard"));
  };

  const getValidationStatus = () => {
    if (!submission) {
      return {
        assetSentiment: false,
        overallSentiment: false,
        rmdRegionalCommentary: false,
        rmdYtdCommentary: false,
      };
    }
    // Check if any asset sentiment score is a valid number string
    const hasAssetSentimentScores = submission.asset_class_sentiment && 
                                    Object.values(submission.asset_class_sentiment).some(ac => ac && !isNaN(parseInt(ac.score, 10)) && ac.score !== null);

    return {
      assetSentiment: hasAssetSentimentScores,
      overallSentiment: submission.overall_sentiment && submission.overall_sentiment.commentary && submission.overall_sentiment.commentary.trim() !== '',
      rmdRegionalCommentary: submission.rmd_regional_commentary && submission.rmd_regional_commentary.trim() !== '',
      rmdYtdCommentary: submission.rmd_ytd_year_end_commentary && submission.rmd_ytd_year_end_commentary.trim() !== '',
    };
  };

  const calculateProgress = () => {
    if (!submission) return 0;
    const status = getValidationStatus();
    const completed = Object.values(status).filter(Boolean).length;
    const total = Object.keys(status).length;

    let generalCompletedCount = completed;
    let generalTotalCount = total;

    if (submission.financial_commentary && Object.keys(submission.financial_commentary).length > 0) generalCompletedCount++;
    generalTotalCount++;

    if (submission.win_loss && submission.win_loss.total_wins !== undefined && submission.win_loss.total_losses !== undefined) generalCompletedCount++;
    generalTotalCount++;

    if (submission.pitch_activity && submission.pitch_activity.total_pitches !== undefined) generalCompletedCount++;
    generalTotalCount++;

    return Math.round((generalCompletedCount / generalTotalCount) * 100);
  };

  const isSubmittable = () => {
    if (!submission) return false;
    const status = getValidationStatus();
    return Object.values(status).every(Boolean);
  };

  const validationStatus = getValidationStatus();

  const getDisplayMonth = () => {
    if (!selectedMonth) return "Loading...";

    const [year, month] = selectedMonth.split('-');
    const monthNumber = parseInt(month, 10);
    const date = new Date(parseInt(year, 10), monthNumber - 1, 1);

    return format(date, "MMMM yyyy");
  };

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your region data...</p>
        </div>
      </div>
    );
  }

  if (!allRegions.length && !pageLoading || error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">
              {error ? "Error Loading Data" : "No Regions Found"}
            </h3>
            <p className="text-amber-700 mb-6">
              {error ? error : "Could not load any region data. Please check the admin panel."}
            </p>
            <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submission && submission.status === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h2 className="2xl font-bold text-green-800 mb-4">
              Thank You!
            </h2>
            <p className="text-green-700 mb-6">
              Your monthly report for <strong>{region?.name}</strong> region has been successfully submitted.
            </p>
            <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <Calendar className="w-4 h-4 inline mr-2" />
                Next submission period: {format(addMonths(new Date(selectedMonth + "-01"), 1), "MMMM yyyy")}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isSubmissionPeriod && !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-blue-200 bg-blue-50">
          <CardContent className="p-8 text-center">
            <Clock className="w-16 h-16 text-blue-600 mx-auto mb-6" />
            <h2 className="2xl font-bold text-blue-800 mb-4">
              Submission Period Closed
            </h2>
            <p className="text-blue-700 mb-6">
              The monthly reporting period for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")} has ended.
            </p>
            <div className="bg-white border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <Calendar className="w-4 h-4 inline mr-2" />
                Next submission period: {format(addMonths(new Date(selectedMonth + "-01"), 1), "MMMM 1-15, yyyy")}
              </p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="2xl font-bold text-slate-900">
              Regional Monthly Report Setup
            </CardTitle>
            <p className="text-slate-600 mt-2">
              Select your reporting month to begin
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {pinData && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Your Region</span>
                </div>
                <p className="text-green-700 text-lg font-medium">
                  {pinData.region}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reporting Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={isConfirming}>
                <SelectTrigger className="bg-white text-slate-900">
                  <SelectValue placeholder="Choose month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedMonth && pinData && !error && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Confirmation</span>
                </div>
                <p className="text-blue-700 mb-4">
                  You are about to create a monthly report for <strong>{pinData.region}</strong> region
                  for <strong>{availableMonths.find(m => m.value === selectedMonth)?.label}</strong>.
                </p>
                <Button
                  onClick={handleConfirmSelection}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed"
                  disabled={isConfirming || !pinData}
                >
                  {isConfirming ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Loading Report...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Confirm & Start Report
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="text-center">
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl('Dashboard'))}
                disabled={isConfirming}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6">
            <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h1 className="2xl font-bold text-slate-900">Monthly Report</h1>
                      <p className="text-slate-600">
                        {region?.name} Region - {getDisplayMonth()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={submission?.status === "submitted" ? "default" : "secondary"}>
                      {submission?.status === "submitted" ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Submitted
                        </>
                      ) : (
                        <>
                           {saving ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div> : <Save className="w-4 h-4 mr-1" />}
                           {saving ? "Saving..." : "Draft"}
                        </>
                      )}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={handleBackToSelection}>
                      <Map className="w-4 h-4 mr-2" />
                      Change Selection
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-sm font-medium text-green-900">Completion Progress</span>
                  <span className="text-sm text-green-700">{calculateProgress()}%</span>
                </div>
                <Progress value={calculateProgress()} className="h-2" />
                <p className="text-xs text-green-600 mt-2">
                  This progress bar tracks general completion. See the checklist at the bottom for submission requirements.
                </p>
              </CardContent>
            </Card>

            {loading ? (
                <div className="text-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600">
                      Aggregating {region?.name} reports for {getDisplayMonth()}
                    </p>
                </div>
            ) : (
                <div className="space-y-6">
                  <FinancialOverview
                    markets={region?.markets || []}
                    financialData={financialData}
                    submission={submission}
                    onUpdate={(commentary) => updateSubmission({ financial_commentary: commentary })}
                    onRegionalUpdate={(commentary) => updateSubmission({ rmd_regional_commentary: commentary })}
                    disabled={submission?.status === "submitted"}
                    isRMDView={true}
                  />
                  <YearEndForecast
                    markets={region?.markets || []}
                    financialData={financialData}
                    submission={submission}
                    onForecastUpdate={handleForecastUpdate}
                    onYtdCommentaryUpdate={(commentary) => updateSubmission({ rmd_ytd_year_end_commentary: commentary })}
                    disabled={submission?.status === "submitted"}
                    isRMDView={true}
                  />
                  <WinLossForm
                    submission={submission}
                    onUpdate={(winLossData) => updateSubmission({ win_loss: winLossData })}
                    disabled={submission?.status === "submitted"}
                    markets={region.markets || []}
                  />
                  <PitchForm
                    submission={submission}
                    onUpdate={(pitchActivityData) => updateSubmission({ pitch_activity: pitchActivityData })}
                    disabled={submission?.status === "submitted"}
                    markets={region.markets || []}
                  />
                  <PersonnelForm
                    submission={submission}
                    disabled={submission?.status === "submitted"}
                    markets={region.markets || []}
                  />
                  <SentimentForm
                    submission={submission}
                    onUpdate={(sentiment) => updateSubmission({ asset_class_sentiment: sentiment })}
                    disabled={submission?.status === "submitted"}
                    officeSubmissions={officeSubmissions.filter(s => s.status === 'submitted')}
                  />
                  <OverallSentiment
                    submission={submission}
                    onUpdate={(sentiment) => updateSubmission({ overall_sentiment: sentiment })}
                    disabled={submission?.status === "submitted"}
                    officeSubmissions={officeSubmissions.filter(s => s.status === 'submitted')}
                  />
                  <OfficeSubmissionsReview
                    officeSubmissions={officeSubmissions}
                    loading={loading}
                    markets={region?.markets || []}
                  />
                </div>
            )}

            {submission?.status !== "submitted" && (
              <Card className="border-slate-200">
                <CardContent className="p-6 space-y-4">
                  {isSubmittable() ? (
                    <div className="text-center text-green-700 font-semibold flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <CheckCircle className="w-5 h-5" />
                      All required sections are complete. You can now submit the report.
                    </div>
                  ) : (
                    <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded-md" role="alert">
                      <p className="font-bold mb-3">Complete these sections to submit your report:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-center gap-2">
                          {validationStatus.assetSentiment ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          Market Sentiment by Asset Class scores (Section 6)
                        </li>
                        <li className="flex items-center gap-2">
                          {validationStatus.overallSentiment ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          Overall Commentary (Section 7)
                        </li>
                        <li className="flex items-center gap-2">
                          {validationStatus.rmdRegionalCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          RMD Monthly Regional Commentary (Section 1)
                        </li>
                        <li className="flex items-center gap-2">
                          {validationStatus.rmdYtdCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                          RMD YTD Commentary and Year End Outlook (Section 2)
                        </li>
                      </ul>
                      <div className="flex items-start gap-2 mt-4 text-amber-900 border-t border-amber-200 pt-3">
                        <Info className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-xs">
                          <strong>Pro Tip:</strong> If you filled out a section and it claims you haven't finished it, make sure to click out of the text box to "complete" the section and trigger the save.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-3 justify-end pt-4">
                    <Button
                      onClick={submitReport}
                      disabled={saving || loading || !isSubmittable()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed flex-1 md:flex-none"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Submit Report
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    );
  }
