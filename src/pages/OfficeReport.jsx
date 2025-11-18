
import { useState, useEffect, useMemo, useCallback } from "react";
import { OfficeSubmission, FinancialData, Region, WinLoss, Pitch, PersonnelUpdate } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Send,
  FileText,
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

import OfficeFinancialOverview from "../components/office/OfficeFinancialOverview";
import OfficeYearEndForecast from "../components/office/OfficeYearEndForecast";
import OfficeWinLossForm from "../components/office/OfficeWinLossForm";
import OfficePitchForm from "../components/office/OfficePitchForm";
import OfficePersonnelForm from "../components/office/OfficePersonnelForm";
import OfficeSentimentForm from "../components/office/OfficeSentimentForm";
import OfficeOverallSentiment from "../components/office/OfficeOverallSentiment";

// Define a list of main region names for filtering.
// This would ideally come from a configuration or backend for dynamic control.
// For this example, we'll use plausible names.
const mainRegionNames = ['Central', 'East', 'West', 'South', 'North', 'Canada', 'Europe', 'Asia Pacific'];

export default function OfficeReport() {
  const [user, setUser] = useState(null);
  const [market, setMarket] = useState(null);
  const [region, setRegion] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [winLosses, setWinLosses] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [personnelUpdates, setPersonnelUpdates] = useState([]);
  const [loading, setLoading] = useState(true); // Manages data loading inside the page (e.e. after Confirm button)
  const [pageLoading, setPageLoading] = useState(true); // Manages initial page setup (pinData, regions, markets)
  const [saving, setSaving] = useState(false);
  const [isSubmissionPeriod, setIsSubmissionPeriod] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pinData, setPinData] = useState(null); // Initialized to null, will be loaded from sessionStorage
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [allRegions, setAllRegions] = useState([]);
  const [allMarkets, setAllMarkets] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), -1), "yyyy-MM")); // Default to previous month

  // Generate last 6 months for selection
  const availableMonths = useMemo(() => {
    const months = [];
    const today = new Date();
    for (let i = 0; i < 6; i++) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: format(monthDate, "yyyy-MM"),
        label: format(monthDate, "MMMM yyyy")
      });
    }
    return months;
  }, []);

  const loadInitialData = useCallback(async () => {
    setPageLoading(true);
    setError(null); // Clear previous errors
    try {
      const regions = await Promise.race([
          Region.list(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)) // 15-second timeout
      ]);
      
      // REMOVE THE FILTER - Load ALL regions
      const uniqueRegions = _.uniqBy(regions, 'name');
      
      // CRITICAL FIX: Clean leading dashes from ALL market names
      const cleanedRegions = uniqueRegions.map(region => ({
        ...region,
        markets: region.markets.map(market => market.trim().replace(/^[-\s]+/, '').trim())
      }));
      
      setAllRegions(cleanedRegions);

      const markets = cleanedRegions.flatMap((r) => r.markets.map((m) => ({ name: m, region: r.name })));
      setAllMarkets(markets);
    } catch (e) {
      console.error("Failed to load initial data:", e);
      let errorMessage = e.message;
      if (e.message === "Timeout") {
          errorMessage = "Failed to load initial region data: The request timed out. Please check your internet connection and try refreshing.";
      } else if (e.message === "Network Error") {
          errorMessage = "A network error occurred while loading initial data. Please check your connection.";
      } else {
        errorMessage = `An unexpected error occurred while loading initial data: ${e.message}.`;
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
        setPinData(storedPinData);
        loadInitialData(); // Load regions and markets
      } catch (e) {
        console.error("Failed to parse PIN data, redirecting.", e);
        navigate(createPageUrl("Dashboard"));
      }
    } else {
      console.log("No verified PIN data found, using demo MD profile for Dallas office.");
      const demoPinData = {
        title: "MD",
        office_location: "Dallas",
        region: "Central",
        email: "demo-md-dallas@avisonyoung.com",
        full_name: "Demo MD (Dallas)"
      };
      setPinData(demoPinData);
      loadInitialData();
    }
  }, [navigate, loadInitialData]);

  const handleConfirmSelection = async () => {
    if (!selectedMonth || !pinData) return;

    setError(null);
    setLoading(true);

    try {
      // CRITICAL FIX: Clean up the office location - trim whitespace AND remove ALL leading dashes/hyphens (multiple passes)
      let userOffice = pinData.office_location || "";
      userOffice = userOffice.trim();
      // Remove all leading dashes and spaces (could be "- " or "- - " etc)
      while (userOffice.startsWith('-') || userOffice.startsWith(' ')) {
        userOffice = userOffice.substring(1).trim();
      }

      console.log("Original office from PIN:", pinData.office_location);
      console.log("Cleaned office name:", userOffice);
      console.log("Available markets:", allMarkets.map(m => m.name));

      // Enhanced market matching - more flexible to handle spacing and case variations
      let selectedMarketObj = allMarkets.find((m) => {
        // Clean the market name the same way
        let cleanMarketName = m.name.trim();
        while (cleanMarketName.startsWith('-') || cleanMarketName.startsWith(' ')) {
          cleanMarketName = cleanMarketName.substring(1).trim();
        }
        
        // Exact match after cleaning
        if (cleanMarketName === userOffice) return true;
        
        // Normalized comparison (remove spaces, convert to lowercase)
        const normalizedMarket = cleanMarketName.toLowerCase().replace(/\s+/g, '');
        const normalizedOffice = userOffice.toLowerCase().replace(/\s+/g, '');
        
        return normalizedMarket === normalizedOffice;
      });
      
      let selectedRegionObj = selectedMarketObj ? allRegions.find((r) => r.name === selectedMarketObj?.region) : null;

      // Fallback logic if the specific market from pinData.office_location is not found
      if (!selectedMarketObj) {
        console.error("Could not find market for office:", userOffice);
        console.error("Available markets are:", allMarkets.map((m) => m.name).join(', '));

        // Show user-friendly error with specific instructions
        setError(
          `Your office "${userOffice}" is not set up in the system yet. ` +
          `Please contact your administrator to add "${userOffice}" as a market in the Admin Panel. ` +
          `Available markets: ${allMarkets.map(m => m.name).join(', ')}.`
        );
        setLoading(false);
        setIsConfirmed(false);
        return; // Stop execution here instead of using fallback
      }

      if (!selectedRegionObj) {
        console.error("Could not find region for market:", selectedMarketObj.region);
        setError(`Configuration error: The market "${selectedMarketObj.name}" is not properly linked to a region. Please contact support.`);
        setLoading(false);
        setIsConfirmed(false);
        return;
      }

      setMarket(selectedMarketObj);
      setRegion(selectedRegionObj);

      // Generate email from PIN data using CLEANED office name
      const generatedEmail = `${pinData.title.toLowerCase()}-${userOffice.toLowerCase().replace(/\s+/g, '')}@avisonyoung.com`;
      
      setUser({ 
        email: generatedEmail, 
        role: pinData.title, 
        full_name: `${pinData.title} (${userOffice})` 
      });

      const activeMarket = selectedMarketObj;
      const activeRegion = selectedRegionObj;

      console.log("OfficeReport: Fetching existing submissions for market:", activeMarket.name, "month:", selectedMonth);

      const existingSubmissions = await OfficeSubmission.filter({
        market: activeMarket.name,
        month: selectedMonth
      });

      console.log("OfficeReport: Found existing submissions:", existingSubmissions.length, existingSubmissions);

      let currentSubmission;
      
      // CRITICAL FIX: Handle duplicate submissions
      if (existingSubmissions.length > 1) {
        console.warn(`Found ${existingSubmissions.length} duplicate submissions for ${activeMarket.name} - ${selectedMonth}. Cleaning up...`);
        
        // Keep the most recent one (by created_date) or the submitted one if any
        const submittedSubmission = existingSubmissions.find(s => s.status === 'submitted');
        const sortedByDate = existingSubmissions.sort((a, b) => 
          new Date(b.created_date) - new Date(a.created_date)
        );
        
        currentSubmission = submittedSubmission || sortedByDate[0];
        
        // Delete the duplicates (all except the one we're keeping)
        const duplicatesToDelete = existingSubmissions.filter(s => s.id !== currentSubmission.id);
        console.log(`Deleting ${duplicatesToDelete.length} duplicate submissions...`);
        
        for (const duplicate of duplicatesToDelete) {
          try {
            await OfficeSubmission.delete(duplicate.id);
            console.log(`Deleted duplicate submission: ${duplicate.id}`);
          } catch (deleteError) {
            console.error(`Failed to delete duplicate submission ${duplicate.id}:`, deleteError);
          }
        }
      } else if (existingSubmissions.length === 1) {
        currentSubmission = existingSubmissions[0];
        console.log("OfficeReport: Using existing submission:", currentSubmission);
      } else {
        // CRITICAL FIX: Create the submission in the database immediately to prevent race conditions
        console.log("OfficeReport: Creating new submission for month:", selectedMonth);
        const newSubmissionData = {
          region: activeRegion.name,
          market: activeMarket.name,
          managing_director: generatedEmail,
          month: selectedMonth,
          status: "draft",
          asset_class_sentiment: {},
          overall_sentiment: { score: 5, commentary: "" }
        };
        
        try {
          // Save to database immediately
          currentSubmission = await OfficeSubmission.create(newSubmissionData);
          console.log("OfficeReport: Created new submission with ID:", currentSubmission.id);
        } catch (createError) {
          // If creation fails (possibly due to race condition), try fetching again
          console.error("Failed to create submission, checking for race condition:", createError);
          const retrySubmissions = await OfficeSubmission.filter({
            market: activeMarket.name,
            month: selectedMonth
          });
          
          if (retrySubmissions.length > 0) {
            console.log("Found submission created by another process, using that instead");
            currentSubmission = retrySubmissions[0];
          } else {
            throw createError; // If still no submission found, throw the error
          }
        }
      }

      setSubmission(currentSubmission);
      setIsSubmissionPeriod(true);

      console.log("OfficeReport: Fetching financial data for market:", activeMarket.name, "month:", selectedMonth);
      
      // New retry logic with timeout for financial data fetch
      const fetchFinancialsWithRetry = async (maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            const financialData = await Promise.race([
              FinancialData.filter({ market: activeMarket.name, month: selectedMonth }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 15000)) // 15s timeout
            ]);
            return financialData;
          } catch (error) {
            if (i === maxRetries - 1) throw error; // If last retry, rethrow the error
            console.log(`Financial data fetch attempt ${i + 1} for ${activeMarket.name} failed, retrying in ${1.5 * (i + 1)}s...`, error.message);
            await new Promise(resolve => setTimeout(resolve, 1500 * (i + 1))); // Exponential backoff
          }
        }
        throw new Error("Financial data fetch failed after multiple retries.");
      };

      const marketFinancialData = await fetchFinancialsWithRetry();
      console.log("OfficeReport: Found financial data:", marketFinancialData.length, marketFinancialData);
      setFinancialData(marketFinancialData);

      // Load Win/Loss data for this specific market/office
      const marketWinLosses = await WinLoss.filter({
        office_location: activeMarket.name,
        month: selectedMonth
      });
      setWinLosses(marketWinLosses);

      // Load Pitch data for this specific market/office
      const marketPitches = await Pitch.filter({
        office_location: activeMarket.name,
        month: selectedMonth
      });
      setPitches(marketPitches);

      // Load Personnel data for this specific market/office
      const marketPersonnel = await PersonnelUpdate.filter({
        office_location: activeMarket.name,
        month: selectedMonth
      });
      setPersonnelUpdates(marketPersonnel);

      setIsConfirmed(true);
    } catch (e) {
      console.error("Failed to load office report data:", e);
      let errorMessage = "An error occurred while fetching report data.";
      if (e.message === "Timeout") {
        errorMessage = "The data request timed out. Please try again or check your internet connection.";
      } else if (e.message === "Network Error") {
        errorMessage = "A network error occurred. Please check your connection and try again.";
      } else {
        errorMessage = e.message;
      }
      setError(errorMessage);
      setIsConfirmed(false); // Go back to selection screen on error
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setIsConfirmed(false);
    setSubmission(null);
    setFinancialData([]);
    setWinLosses([]); // Clear WinLosses state
    setPitches([]); // Clear Pitches state
    setPersonnelUpdates([]); // Clear PersonnelUpdates state
    setRegion(null);
    setMarket(null); // Clear market state
    setError(null); // Clear errors
    // Do NOT clear pinData, it's loaded from sessionStorage and should persist for this session
  };

  const ensureSubmissionHasId = async () => {
    if (submission?.id) {
      return submission.id;
    }
    if (submission) {
      try {
        setSaving(true);
        console.log("Creating initial submission record...");
        
        // Get managing director email from user state or generate from pinData
        let managingDirectorEmail = user?.email;
        if (!managingDirectorEmail && pinData) {
          managingDirectorEmail = `${pinData.title.toLowerCase()}-${pinData.office_location.toLowerCase().replace(/\s+/g, '')}@avisonyoung.com`;
        }
        
        const submissionToCreate = {
          ...submission,
          managing_director: managingDirectorEmail // Ensure this is always present
        };
        
        console.log("Creating submission with data:", submissionToCreate);
        const newSubmission = await OfficeSubmission.create(submissionToCreate);
        setSubmission(newSubmission); // Update state with the new submission including ID
        setSaving(false);
        return newSubmission.id;
      } catch (e) {
        console.error("Failed to create initial submission record", e);
        setError("Failed to create the main report record. Please try again.");
        setSaving(false);
        throw e; // re-throw to stop child creation
      }
    }
    throw new Error("No submission available to save.");
  };

  // Renamed and updated from handleForecastUpdate
  const handleFinancialDataUpdate = async () => {
    if (!market) return; // Ensure market object is available
    setError(null);
    try {
      const financials = await FinancialData.filter({ market: market.name, month: selectedMonth });
      setFinancialData(financials);
    } catch (e) {
      console.error("Failed to update financial data:", e);
      setError("A network error occurred while refreshing financial data. Please check your connection.");
    }
  };

  const handleWinLossUpdate = async () => {
    if (!market) return;
    setError(null);
    try {
      const winLosses = await WinLoss.filter({
        office_location: market.name,
        month: selectedMonth
      });
      setWinLosses(winLosses);
    } catch (e) {
      console.error("Failed to update win/loss data:", e);
      setError("A network error occurred while refreshing win/loss data. Please try again.");
    }
  };

  const handlePitchUpdate = async () => {
    if (!market) return;
    setError(null);
    try {
      const pitches = await Pitch.filter({
        office_location: market.name,
        month: selectedMonth
      });
      setPitches(pitches);
    } catch (e) {
      console.error("Failed to update pitch data:", e);
      setError("A network error occurred while refreshing pitch data. Please try again.");
    }
  };

  const handlePersonnelUpdate = async () => {
    if (!market) return;
    setError(null);
    try {
      const personnel = await PersonnelUpdate.filter({
        office_location: market.name,
        month: selectedMonth
      });
      setPersonnelUpdates(personnel);
    } catch (e) {
      console.error("Failed to update personnel data:", e);
      setError("A network error occurred while refreshing personnel data. Please try again.");
    }
  };

  const updateSubmission = async (updates) => {
    if (submission && submission.status === "submitted") return; // Prevent updates if already submitted

    setSaving(true);
    setError(null); // Clear previous errors when attempting save
    console.log("DEMO: Updating office submission with:", updates);

    // Get managing director email from user state or generate from pinData
    let managingDirectorEmail = user?.email;
    if (!managingDirectorEmail && pinData) {
      managingDirectorEmail = `${pinData.title.toLowerCase()}-${pinData.office_location.toLowerCase().replace(/\s+/g, '')}@avisonyoung.com`;
    }

    // Prepare updated data. If submission is null (new), merge updates directly.
    // Otherwise, merge with existing submission.
    let updatedData;
    if (submission) {
      updatedData = { ...submission, ...updates };
    } else {
      // For new submissions, ensure managing_director is always included
      updatedData = {
        region: region?.name,
        market: market?.name,
        managing_director: managingDirectorEmail,
        month: selectedMonth,
        status: "draft",
        asset_class_sentiment: {},
        overall_sentiment: { score: 5, commentary: "" },
        ...updates
      };
    }

    setSubmission(updatedData); // Optimistic UI update

    try {
      if (updatedData.id) {
        // If submission already has an ID, it means it exists in the DB, so update it.
        await OfficeSubmission.update(updatedData.id, updates);
      } else {
        // If no ID, it's a new submission, so create it with all required fields
        // Ensure managing_director is explicitly included in the create call
        const dataToCreate = {
          ...updatedData,
          managing_director: managingDirectorEmail // Explicitly ensure this field is present
        };
        console.log("Creating new OfficeSubmission with data:", dataToCreate);
        const newRecord = await OfficeSubmission.create(dataToCreate);
        setSubmission(newRecord); // Update state with the actual record from DB (which now has an ID)
      }
    } catch (e) {
      console.error("Failed to save submission:", e);
      setError(e.message === "Network Error" ? "A network error occurred while saving your changes. Please check your connection and try again." : "Failed to save changes: " + e.message);
      // Optionally, revert optimistic UI update if save fails
      // setSubmission(submission);
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    if (!submission || submission.status === "submitted") return;
    // Prevent submission if a record hasn't been created in the DB yet.
    if (!submission.id) {
      console.error("Cannot submit, submission has no ID.");
      setError("Cannot submit: report data not properly saved. Please try saving draft first.");
      return;
    }

    setSaving(true);
    setError(null); // Clear previous errors when attempting submit

    // Create the final version of the data to be saved
    const finalSubmissionData = {
      ...submission,
      status: "submitted",
      submitted_at: new Date().toISOString()
    };

    try {
      // Update the database with the final data and status
      await OfficeSubmission.update(submission.id, finalSubmissionData);
      // Update the local state to match, which will trigger the "Thank You" screen
      setSubmission(finalSubmissionData);
    } catch (e) {
      console.error("Failed to submit report:", e);
      setError(e.message === "Network Error" ? "A network error occurred while submitting the report. Please check your connection and try again." : "Failed to submit report: " + e.message);
      // Handle error, e.g., show a notification to the user
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    navigate(createPageUrl("Dashboard"));
  };

  const calculateProgress = () => {
    if (!submission) return 0;

    let completed = 0;
    const total = 2; // asset sentiment, overall sentiment

    // 1. Asset Class Sentiment (Stricter check: at least one class must have a score)
    if (submission.asset_class_sentiment &&
    typeof submission.asset_class_sentiment === 'object' &&
    Object.values(submission.asset_class_sentiment).some((ac) => ac && typeof ac === 'object' && ac.score !== undefined && ac.score > 0)) {
      completed++;
    }

    // 2. Overall Sentiment (Stricter check: score must exist and be greater than 0)
    if (submission.overall_sentiment && submission.overall_sentiment.score !== undefined && submission.overall_sentiment.score > 0) {
      completed++;
    }

    return Math.round(completed / total * 100);
  };

  // Helper function to properly format the selected month for display
  const getDisplayMonth = () => {
    if (!selectedMonth) return "Loading...";

    const [year, month] = selectedMonth.split('-');
    const monthNumber = parseInt(month, 10);
    const date = new Date(parseInt(year, 10), monthNumber - 1, 1);

    return format(date, "MMMM yyyy");
  };

  const getValidationStatus = () => {
    if (!submission || !market) {
      return {
        financialCommentary: false,
        yearEndOutlook: false,
        forecastCommentary: false,
        assetSentiment: false,
        overallCommentary: false,
      };
    }
    const marketFinancials = financialData.find(d => d.market === market.name);
    return {
      financialCommentary: marketFinancials && marketFinancials.commentary && marketFinancials.commentary.trim() !== '',
      yearEndOutlook: marketFinancials && marketFinancials.year_end_outlook && marketFinancials.year_end_outlook.trim() !== '',
      forecastCommentary: marketFinancials && marketFinancials.forecast_commentary && marketFinancials.forecast_commentary.trim() !== '',
      assetSentiment: submission.asset_class_sentiment && typeof submission.asset_class_sentiment === 'object' && Object.values(submission.asset_class_sentiment).some(ac => ac && typeof ac === 'object' && ac.score !== undefined && ac.score > 0),
      overallCommentary: submission.overall_sentiment && submission.overall_sentiment.commentary && submission.overall_sentiment.commentary.trim() !== '',
    };
  };

  const isSubmittable = () => {
    const status = getValidationStatus();
    return Object.values(status).every(Boolean);
  };
  
  const validationStatus = getValidationStatus();

  // Initial page loading spinner while fetching regions/markets and pinData from storage
  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your office data...</p>
        </div>
      </div>);

  }

  if (!allMarkets.length && !pageLoading && !loading || error) {// Check error condition after pageLoading is done
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-amber-200 bg-amber-50">
          <CardContent className="p-8 text-center">
            <Building2 className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-amber-800 mb-2">
              {error ? "Error Loading Data" : "No Offices Found"}
            </h3>
            <p className="text-amber-700 mb-6">
              {error ? error : "Could not load any office or market data. Please check the admin panel."}
            </p>
            <Button variant="outline" onClick={() => navigate(createPageUrl('Dashboard'))} className="w-full">
              <LogOut className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>);

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
              Your monthly report for <strong>{market?.name}</strong> has been successfully submitted.
            </p>
            <div className="bg-white border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800">
                <Calendar className="w-4 h-4 inline mr-2" />
                Next submission period: {format(addMonths(new Date(selectedMonth + "-01"), 1), "MMMM yyyy")}
              </p>
            </div>
            <div className="space-y-3">
              <Button 
                onClick={() => navigate(createPageUrl("ViewOfficeSubmission") + `?id=${submission.id}`)}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <FileText className="w-4 h-4 mr-2" />
                View My Submission
              </Button>
              <Button variant="outline" onClick={handleLogout} className="bg-slate-400 px-4 py-2 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-10 w-full">
                <LogOut className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
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
      </div>);

  }

  // Show selection screen by default (no initial PIN check needed here, as it's done via useEffect)
  if (!isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Office Monthly Report Setup
            </CardTitle>
            <p className="text-slate-600 mt-2">
              Select your reporting month to begin
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {error &&
            <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            }

            {/* Show confirmed office from PIN data */}
            {pinData &&
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Your Office</span>
                </div>
                <p className="text-green-700 text-lg font-medium">
                  {pinData.office_location}
                </p>
              </div>
            }

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Reporting Month
              </label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="bg-white text-slate-900">
                  <SelectValue placeholder="Choose month" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map((month) =>
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedMonth && pinData && !error &&
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-blue-800">Confirmation</span>
                </div>
                <p className="text-blue-700 mb-4">
                  You are about to create a monthly report for <strong>{pinData.office_location}</strong> office
                  for <strong>{availableMonths.find((m) => m.value === selectedMonth)?.label}</strong>.
                </p>
                <Button
                onClick={handleConfirmSelection}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={pageLoading || !pinData}> {/* Check pageLoading instead of loading */}
                  <Check className="w-4 h-4 mr-2" />
                  {pageLoading ? "Loading..." : "Confirm & Start Report"}
                </Button>
              </div>
            }

            <div className="text-center">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))} className="bg-background text-slate-950">
                <LogOut className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>);

  }

  // Main report interface (only shows after successful confirmation)
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">Monthly Report</h1>
                    <p className="text-slate-600">
                      {market?.name} Office - {getDisplayMonth()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={submission?.status === "submitted" ? "default" : "secondary"}>
                    {submission?.status === "submitted" ?
                    <>
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Submitted
                      </> :

                    "Draft"
                    }
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleBackToSelection} className="bg-slate-300 px-3 text-sm font-medium inline-flex items-center justify-center gap-2 whitespace-nowrap ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input hover:bg-accent hover:text-accent-foreground h-9 rounded-md">
                    <Map className="w-4 h-4 mr-2" />
                    Change Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {error &&
          <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>An Error Occurred</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          }

          {/* Progress Card */}
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

          {loading ?
          <div className="text-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading {market?.name} report for {getDisplayMonth()}</p>
            </div> :

          <div className="space-y-6">
              <OfficeFinancialOverview
              market={market?.name}
              region={region?.name}
              month={selectedMonth}
              financialData={financialData}
              submission={submission}
              onFinancialDataUpdate={handleFinancialDataUpdate}
              disabled={submission?.status === "submitted"} />

              <OfficeYearEndForecast
              market={market?.name}
              region={region?.name}
              month={selectedMonth}
              financialData={financialData}
              onForecastUpdate={handleFinancialDataUpdate}
              disabled={submission?.status === "submitted"} />

              <OfficeWinLossForm
              region={region?.name}
              market={market}
              month={selectedMonth}
              winLosses={winLosses}
              onUpdate={handleWinLossUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />

              <OfficePitchForm
              region={region?.name}
              market={market}
              month={selectedMonth}
              pitches={pitches}
              onUpdate={handlePitchUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />

              <OfficePersonnelForm
              region={region?.name}
              market={market}
              month={selectedMonth}
              personnelUpdates={personnelUpdates}
              onUpdate={handlePersonnelUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />

              <OfficeSentimentForm
              submission={submission}
              onUpdate={(sentiment) => updateSubmission({ asset_class_sentiment: sentiment })}
              disabled={submission?.status === "submitted"} />

              <OfficeOverallSentiment
              submission={submission}
              onUpdate={(sentiment) => updateSubmission({ overall_sentiment: sentiment })}
              disabled={submission?.status === "submitted"} />

            </div>
          }

          {/* Action Buttons */}
          {submission?.status !== "submitted" &&
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
                        {validationStatus.financialCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Financial Overview Commentary (Section 1)
                      </li>
                      <li className="flex items-center gap-2">
                        {validationStatus.yearEndOutlook ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Year End Outlook selection (Section 2)
                      </li>
                      <li className="flex items-center gap-2">
                        {validationStatus.forecastCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Year End Forecast Commentary (Section 2)
                      </li>
                      <li className="flex items-center gap-2">
                        {validationStatus.assetSentiment ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Asset Class Sentiment scores (Section 6)
                      </li>
                      <li className="flex items-center gap-2">
                        {validationStatus.overallCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Overall Commentary (Section 7)
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

                <div className="flex justify-end pt-4">
                  <Button
                  onClick={submitReport}
                  disabled={saving || loading || !isSubmittable()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 disabled:cursor-not-allowed">
                    <Send className="w-4 h-4 mr-2" />
                    Submit Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          }
        </div>
      </div>
    </div>);
}
