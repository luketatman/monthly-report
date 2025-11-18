import { useState, useEffect } from "react";
import { OfficeSubmission, FinancialData, WinLoss, Pitch, PersonnelUpdate } from "@/entities/all";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, ArrowLeft, DollarSign, TrendingUp, Award, Users, Target, Smile, CheckCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ViewOfficeSubmission() {
  const [submission, setSubmission] = useState(null);
  const [financialData, setFinancialData] = useState([]);
  const [winLosses, setWinLosses] = useState([]);
  const [pitches, setPitches] = useState([]);
  const [personnelUpdates, setPersonnelUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const loadSubmission = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const submissionId = urlParams.get('id');
        
        if (!submissionId) {
          setError("No submission ID provided");
          setLoading(false);
          return;
        }

        const submissionData = await OfficeSubmission.get(submissionId);
        setSubmission(submissionData);

        const [financials, wins, pitchData, personnel] = await Promise.all([
          FinancialData.filter({ market: submissionData.market, month: submissionData.month }),
          WinLoss.filter({ office_location: submissionData.market, month: submissionData.month }),
          Pitch.filter({ office_location: submissionData.market, month: submissionData.month }),
          PersonnelUpdate.filter({ office_location: submissionData.market, month: submissionData.month })
        ]);

        setFinancialData(financials);
        setWinLosses(wins);
        setPitches(pitchData);
        setPersonnelUpdates(personnel);
      } catch (e) {
        console.error("Failed to load submission:", e);
        setError("Failed to load submission data");
      } finally {
        setLoading(false);
      }
    };

    loadSubmission();
  }, []);

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getDisplayMonth = () => {
    if (!submission?.month) return "Loading...";
    const [year, month] = submission.month.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return format(date, "MMMM yyyy");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your submission...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Error Loading Submission</h3>
            <p className="text-slate-600 mb-6">{error || "Submission not found"}</p>
            <Button onClick={() => navigate(createPageUrl('Dashboard'))}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const marketFinancial = financialData[0] || {};

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
                    <h1 className="text-2xl font-bold text-slate-900">Monthly Report - Read Only</h1>
                    <p className="text-slate-600">
                      {submission.market} Office - {getDisplayMonth()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-4 h-4 mr-1" />
                    Submitted
                  </Badge>
                  {submission.submitted_at && (
                    <Badge variant="outline">
                      <Calendar className="w-4 h-4 mr-1" />
                      {format(new Date(submission.submitted_at), "MMM d, yyyy")}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Financial Overview */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <DollarSign className="text-blue-600" />
                30-Day Financial Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Monthly Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(marketFinancial.monthly_revenue)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Monthly Budget</p>
                  <p className="text-2xl font-bold text-slate-900">{formatCurrency(marketFinancial.monthly_budget)}</p>
                </div>
              </div>
              {marketFinancial.commentary && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Commentary</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{marketFinancial.commentary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Year-End Forecast */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <TrendingUp className="text-green-600" />
                Year-End Pipeline Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">YTD Revenue</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(marketFinancial.ytd_revenue)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">YTD Budget</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(marketFinancial.ytd_budget)}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm text-slate-600 mb-1">Year-End Forecast</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(marketFinancial.year_end_forecast)}</p>
                </div>
              </div>
              {marketFinancial.year_end_outlook && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4">
                  <p className="text-sm font-medium text-blue-900 mb-1">Year End Outlook</p>
                  <p className="text-blue-800">{marketFinancial.year_end_outlook}</p>
                </div>
              )}
              {marketFinancial.forecast_commentary && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-slate-700 mb-2">Forecast Commentary</p>
                  <p className="text-slate-600 whitespace-pre-wrap">{marketFinancial.forecast_commentary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Win/Loss Summary */}
          {winLosses.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Award className="text-amber-600" />
                  Win/Loss Activity ({winLosses.length} entries)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-green-700 mb-1">Total Wins</p>
                    <p className="text-2xl font-bold text-green-900">
                      {winLosses.filter(w => w.outcome === 'Win').length}
                    </p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-red-700 mb-1">Total Losses</p>
                    <p className="text-2xl font-bold text-red-900">
                      {winLosses.filter(w => w.outcome === 'Loss').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pitch Activity */}
          {pitches.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Target className="text-purple-600" />
                  Pitch Activity ({pitches.length} entries)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-3">
                  {['Meeting Scheduled', 'Waiting to Hear Back', 'Out for Signature', 'Lost'].map(stage => (
                    <div key={stage} className="bg-slate-50 p-3 rounded-lg">
                      <p className="text-xs text-slate-600 mb-1">{stage}</p>
                      <p className="text-lg font-bold text-slate-900">
                        {pitches.filter(p => p.stage === stage).length}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Personnel Updates */}
          {personnelUpdates.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Users className="text-indigo-600" />
                  Personnel Updates ({personnelUpdates.length} entries)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {personnelUpdates.map((person, idx) => (
                    <div key={idx} className="bg-slate-50 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="font-medium text-slate-900">{person.name}</p>
                        <p className="text-sm text-slate-600">{person.title_specialty}</p>
                      </div>
                      <Badge variant={person.status === 'Hired' ? 'default' : 'secondary'}>
                        {person.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Market Sentiment */}
          {submission.asset_class_sentiment && Object.keys(submission.asset_class_sentiment).length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smile className="text-indigo-600" />
                  Market Sentiment by Asset Class
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-3">
                  {Object.entries(submission.asset_class_sentiment).map(([assetClass, data]) => (
                    data && data.score && (
                      <div key={assetClass} className="bg-slate-50 p-3 rounded-lg">
                        <div className="flex justify-between items-center mb-1">
                          <p className="text-sm font-medium text-slate-700 capitalize">
                            {assetClass.replace('_', ' ')}
                          </p>
                          <span className="text-lg font-bold text-slate-900">{data.score}/10</span>
                        </div>
                        {data.commentary && (
                          <p className="text-xs text-slate-600">{data.commentary}</p>
                        )}
                      </div>
                    )
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overall Sentiment */}
          {submission.overall_sentiment && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Smile className="text-indigo-600" />
                  Overall Sentiment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-medium text-slate-700">Overall Score</p>
                    <span className="text-3xl font-bold text-slate-900">{submission.overall_sentiment.score}/10</span>
                  </div>
                  {submission.overall_sentiment.commentary && (
                    <p className="text-slate-600 whitespace-pre-wrap">{submission.overall_sentiment.commentary}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Back Button */}
          <Card>
            <CardContent className="p-6">
              <Button onClick={() => navigate(createPageUrl('Dashboard'))} className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}