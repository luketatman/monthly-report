import React, { useState, useEffect, useMemo, useCallback } from "react";
import { WinLoss, Pitch, PersonnelUpdate } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
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
  Info } from
"lucide-react";
import { format, addMonths } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

import OfficeWinLossForm from "../components/office/OfficeWinLossForm";
import OfficePitchForm from "../components/office/OfficePitchForm";
import OfficePersonnelForm from "../components/office/OfficePersonnelForm";
import OfficeOverallSentiment from "../components/office/OfficeOverallSentiment";

export default function BusinessLineReport() {
  const [user, setUser] = useState(null);
  const [businessLine, setBusinessLine] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [winLosses, setWinLosses] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [personnelUpdates, setPersonnelUpdates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isSubmissionPeriod, setIsSubmissionPeriod] = useState(true);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [pinData, setPinData] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const [selectedMonth, setSelectedMonth] = useState(format(addMonths(new Date(), -1), "yyyy-MM"));

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

  useEffect(() => {
    const storedPinDataString = sessionStorage.getItem('verifiedPinData');
    if (storedPinDataString) {
      try {
        const storedPinData = JSON.parse(storedPinDataString);
        setPinData(storedPinData);
        setPageLoading(false);
      } catch (e) {
        console.error("Failed to parse PIN data, redirecting.", e);
        navigate(createPageUrl("Dashboard"));
      }
    } else {
      console.error("No verified PIN data found for Business Line Leader");
      navigate(createPageUrl("Dashboard"));
    }
  }, [navigate]);

  const handleConfirmSelection = async () => {
    if (!selectedMonth || !pinData) return;

    setError(null);
    setLoading(true);

    try {
      const businessLineName = pinData.office_location || "";
      setBusinessLine(businessLineName);

      const generatedEmail = `${pinData.title.toLowerCase().replace(/\s+/g, '-')}-${businessLineName.toLowerCase().replace(/\s+/g, '-')}@avisonyoung.com`;

      setUser({
        email: generatedEmail,
        role: pinData.title,
        full_name: `${pinData.title} (${businessLineName})`
      });

      // Initialize empty submission for Business Line Leader
      const newSubmission = {
        business_line: businessLineName,
        managing_director: generatedEmail,
        month: selectedMonth,
        status: "draft",
        overall_sentiment: { score: 5, commentary: "" }
      };

      setSubmission(newSubmission);
      setIsSubmissionPeriod(true);

      // Load Win/Loss data for this business line
      const businessLineWinLosses = await WinLoss.filter({
        office_location: businessLineName,
        month: selectedMonth
      });
      setWinLosses(businessLineWinLosses);

      // Load Pitch data
      const businessLinePitches = await Pitch.filter({
        office_location: businessLineName,
        month: selectedMonth
      });
      setPitches(businessLinePitches);

      // Load Personnel data
      const businessLinePersonnel = await PersonnelUpdate.filter({
        office_location: businessLineName,
        month: selectedMonth
      });
      setPersonnelUpdates(businessLinePersonnel);

      setIsConfirmed(true);
    } catch (e) {
      console.error("Failed to load business line report data:", e);
      setError(e.message || "An error occurred while loading data");
      setIsConfirmed(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToSelection = () => {
    setIsConfirmed(false);
    setSubmission(null);
    setWinLosses([]);
    setPitches([]);
    setPersonnelUpdates([]);
    setBusinessLine(null);
    setError(null);
  };

  const ensureSubmissionHasId = async () => {
    if (submission?.id) {
      return submission.id;
    }
    // For now, return a placeholder - we'll implement full DB save later
    return null;
  };

  const handleWinLossUpdate = async () => {
    if (!businessLine) return;
    setError(null);
    try {
      const winLosses = await WinLoss.filter({
        office_location: businessLine,
        month: selectedMonth
      });
      setWinLosses(winLosses);
    } catch (e) {
      console.error("Failed to update win/loss data:", e);
      setError("Failed to refresh win/loss data.");
    }
  };

  const handlePitchUpdate = async () => {
    if (!businessLine) return;
    setError(null);
    try {
      const pitches = await Pitch.filter({
        office_location: businessLine,
        month: selectedMonth
      });
      setPitches(pitches);
    } catch (e) {
      console.error("Failed to update pitch data:", e);
      setError("Failed to refresh pitch data.");
    }
  };

  const handlePersonnelUpdate = async () => {
    if (!businessLine) return;
    setError(null);
    try {
      const personnel = await PersonnelUpdate.filter({
        office_location: businessLine,
        month: selectedMonth
      });
      setPersonnelUpdates(personnel);
    } catch (e) {
      console.error("Failed to update personnel data:", e);
      setError("Failed to refresh personnel data.");
    }
  };

  const updateSubmission = async (updates) => {
    if (submission && submission.status === "submitted") return;

    setSaving(true);
    setError(null);
    console.log("Updating business line submission with:", updates);

    try {
      const updatedData = await ServiceLineSubmission.update(submission.id, updates);
      setSubmission(updatedData);
    } catch (err) {
      console.error("Error updating service line submission:", err);
      setError("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleIssuesUpdate = (value) => {
    updateSubmission({ persisting_issues: value });
  };

  const submitReport = async () => {
    if (!submission || submission.status === "submitted") return;

    setSaving(true);
    setError(null);

    const finalSubmissionData = {
      ...submission,
      status: "submitted",
      submitted_at: new Date().toISOString()
    };

    setSubmission(finalSubmissionData);
    setSaving(false);
  };

  const handleLogout = async () => {
    navigate(createPageUrl("Dashboard"));
  };

  const calculateProgress = () => {
    if (!submission) return 0;
    let completed = 0;
    const total = 1; // only overall sentiment

    if (submission.overall_sentiment && submission.overall_sentiment.score !== undefined && submission.overall_sentiment.score > 0) {
      completed++;
    }

    return Math.round(completed / total * 100);
  };

  const getDisplayMonth = () => {
    if (!selectedMonth) return "Loading...";
    const [year, month] = selectedMonth.split('-');
    const monthNumber = parseInt(month, 10);
    const date = new Date(parseInt(year, 10), monthNumber - 1, 1);
    return format(date, "MMMM yyyy");
  };

  const getValidationStatus = () => {
    if (!submission) {
      return {
        overallCommentary: false
      };
    }
    return {
      overallCommentary: submission.overall_sentiment && submission.overall_sentiment.commentary && submission.overall_sentiment.commentary.trim() !== ''
    };
  };

  const isSubmittable = () => {
    const status = getValidationStatus();
    return Object.values(status).every(Boolean);
  };

  const validationStatus = getValidationStatus();

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your business line data...</p>
        </div>
      </div>);

  }

  if (submission && submission.status === "submitted") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-lg w-full border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-green-800 mb-4">
              Thank You!
            </h2>
            <p className="text-green-700 mb-6">
              Your monthly report for <strong>{businessLine}</strong> has been successfully submitted.
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
      </div>);

  }

  if (!isConfirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full shadow-xl">
          <CardHeader className="text-center pb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-900">
              Business Line Monthly Report Setup
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

            {pinData &&
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Building2 className="w-5 h-5 text-green-600" />
                  <span className="font-semibold text-green-800">Your Business Line</span>
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
                  You are about to create a monthly report for <strong>{pinData.office_location}</strong>
                  for <strong>{availableMonths.find((m) => m.value === selectedMonth)?.label}</strong>.
                </p>
                <Button
                onClick={handleConfirmSelection}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading || !pinData}>

                  <Check className="w-4 h-4 mr-2" />
                  {loading ? "Loading..." : "Confirm & Start Report"}
                </Button>
              </div>
            }

            <div className="text-center">
              <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))} className="bg-slate-900 px-4 py-2 text-sm font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-9">
                <LogOut className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>);

  }

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
                    <h1 className="text-2xl font-bold text-slate-900">Business Line Monthly Report</h1>
                    <p className="text-slate-600">
                      {businessLine} - {getDisplayMonth()}
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
                    "Draft"}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleBackToSelection} className="bg-slate-950 px-3 text-xs font-medium rounded-md inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 border border-input shadow-sm hover:bg-accent hover:text-accent-foreground h-8">
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
              <p className="text-slate-600">Loading {businessLine} report for {getDisplayMonth()}</p>
            </div> :

          <div className="space-y-6">
              <OfficeWinLossForm
              region="Global"
              market={{ name: businessLine }}
              month={selectedMonth}
              winLosses={winLosses}
              onUpdate={handleWinLossUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />


              <OfficePitchForm
              region="Global"
              market={{ name: businessLine }}
              month={selectedMonth}
              pitches={pitches}
              onUpdate={handlePitchUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />


              <OfficePersonnelForm
              region="Global"
              market={{ name: businessLine }}
              month={selectedMonth}
              personnelUpdates={personnelUpdates}
              onUpdate={handlePersonnelUpdate}
              submission={submission}
              isSubmissionPeriod={isSubmissionPeriod}
              onNetworkError={setError}
              ensureSubmissionHasId={ensureSubmissionHasId}
              disabled={submission?.status === "submitted"} />


              <OfficeOverallSentiment
              submission={submission}
              onUpdate={(sentiment) => updateSubmission({ overall_sentiment: sentiment })}
              disabled={submission?.status === "submitted"} />


              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-slate-900">5. Persisting Issues/Things I Need Help With</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                  value={submission?.persisting_issues || ""}
                  onChange={(e) => handleIssuesUpdate(e.target.value)}
                  placeholder="Describe any ongoing issues or areas where you need assistance..."
                  disabled={submission?.status === "submitted"}
                  className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400 min-h-[150px]" />

                </CardContent>
              </Card>
            </div>
          }

          {/* Action Buttons */}
          {submission?.status !== "submitted" &&
          <Card className="border-slate-200">
              <CardContent className="p-6 space-y-4">
                {isSubmittable() ?
              <div className="text-center text-green-700 font-semibold flex items-center justify-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    All required sections are complete. You can now submit the report.
                  </div> :

              <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-4 rounded-md" role="alert">
                    <p className="font-bold mb-3">Complete these sections to submit your report:</p>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-center gap-2">
                        {validationStatus.overallCommentary ? <CheckCircle className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-500" />}
                        Overall Commentary (Section 4)
                      </li>
                    </ul>
                    <div className="flex items-start gap-2 mt-4 text-amber-900 border-t border-amber-200 pt-3">
                      <Info className="w-4 h-4 mt-0.5 shrink-0" />
                      <p className="text-xs">
                        <strong>Pro Tip:</strong> If you filled out a section and it claims you haven't finished it, make sure to click out of the text box to "complete" the section and trigger the save.
                      </p>
                    </div>
                  </div>
              }

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