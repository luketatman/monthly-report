import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer, TrendingUp, TrendingDown, Minus, MessageSquare } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function SentimentHeatmap({ submissions, previousPeriodSubmissions, loading, rmdSubmissions, previousRmdSubmissions, isRmdView }) {
  const [selectedAssetClass, setSelectedAssetClass] = useState(null);
  const [showRmdCommentary, setShowRmdCommentary] = useState(false);

  const assetClasses = [
  'office', 'retail', 'healthcare', 'industrial',
  'multifamily', 'capital_markets', 'other'];

  // Determine which data source to use based on toggle
  const activeSubmissions = showRmdCommentary && isRmdView ? rmdSubmissions : submissions;
  const activePreviousSubmissions = showRmdCommentary && isRmdView ? previousRmdSubmissions : previousPeriodSubmissions;

  // Helper function to calculate average sentiment for a given set of submissions
  const calculateAverageSentiment = (submissionData, assetClass) => {
    // Ensure submissionData is an array, even if null/undefined is passed
    const dataToProcess = submissionData || [];

    const relevantSubmissions = dataToProcess.
    filter((s) => s.asset_class_sentiment?.[assetClass]?.score).
    sort((a, b) => a.month.localeCompare(b.month)); // Sort by month chronologically

    // CRITICAL FIX: Filter out N/A and parse scores properly
    const scores = relevantSubmissions
      .map((s) => s.asset_class_sentiment[assetClass].score)
      .filter(score => score !== 'N/A' && score !== null && score !== undefined) // Remove N/A
      .map(score => parseInt(score, 10)) // Parse to number
      .filter(score => !isNaN(score) && score >= 1 && score <= 10); // Only valid scores 1-10

    const avgScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;

    return { avgScore, relevantSubmissions };
  };

  const sentimentData = assetClasses.map((ac) => {
    const currentPeriod = calculateAverageSentiment(activeSubmissions, ac);
    const previousPeriod = calculateAverageSentiment(activePreviousSubmissions, ac);

    // Calculate period-over-period trend
    let trend = 0;
    let trendIcon = Minus;
    // Only calculate trend if both current and previous scores are non-zero to avoid misleading trends from zero values
    if (currentPeriod.avgScore > 0 && previousPeriod.avgScore > 0) {
      trend = currentPeriod.avgScore - previousPeriod.avgScore;
      trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    } else if (currentPeriod.avgScore > 0 && previousPeriod.avgScore === 0) {
      // If current has score but previous doesn't, it's an 'increase' from zero
      trend = currentPeriod.avgScore;
      trendIcon = TrendingUp;
    } else if (currentPeriod.avgScore === 0 && previousPeriod.avgScore > 0) {
      // If previous has score but current doesn't, it's a 'decrease' to zero
      trend = -previousPeriod.avgScore;
      trendIcon = TrendingDown;
    }


    // Get all commentary from current period submissions
    const commentary = currentPeriod.relevantSubmissions.map((s) => {
      const score = s.asset_class_sentiment[ac].score;
      const parsedScore = parseInt(score, 10);
      return {
        month: s.month,
        region: s.market || s.region, // Show market for office submissions, region for RMD submissions
        score: !isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 10 ? parsedScore : 0, // Ensure score is a valid number, default to 0 if N/A
        commentary: s.asset_class_sentiment[ac].commentary || '' // Ensure empty string instead of undefined
      };
    });

    return {
      key: ac,
      name: ac.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      score: currentPeriod.avgScore, // This is the current period's average
      trend,
      trendIcon,
      commentary,
      submissions: currentPeriod.relevantSubmissions // Still refers to current submissions
    };
  });

  // Calculate average across all asset classes for both periods
  const averageData = (() => {
    const currentPeriodScoresByMonth = {};
    const previousPeriodScoresByMonth = {};

    // Collect current period scores by month across all asset classes
    activeSubmissions.forEach((s) => {
      if (s.asset_class_sentiment) {
        const monthScores = [];
        assetClasses.forEach((ac) => {
          const score = s.asset_class_sentiment[ac]?.score;
          // CRITICAL FIX: Filter out N/A values
          if (score && score !== 'N/A' && score !== null && score !== undefined) {
            const parsedScore = parseInt(score, 10);
            if (!isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 10) {
              monthScores.push(parsedScore);
            }
          }
        });

        if (monthScores.length > 0) {
          currentPeriodScoresByMonth[s.month] = monthScores.reduce((sum, score) => sum + score, 0) / monthScores.length;
        }
      }
    });

    // Collect previous period scores by month across all asset classes
    (activePreviousSubmissions || []).forEach((s) => {
      if (s.asset_class_sentiment) {
        const monthScores = [];
        assetClasses.forEach((ac) => {
          const score = s.asset_class_sentiment[ac]?.score;
          // CRITICAL FIX: Filter out N/A values
          if (score && score !== 'N/A' && score !== null && score !== undefined) {
            const parsedScore = parseInt(score, 10);
            if (!isNaN(parsedScore) && parsedScore >= 1 && parsedScore <= 10) {
              monthScores.push(parsedScore);
            }
          }
        });

        if (monthScores.length > 0) {
          previousPeriodScoresByMonth[s.month] = monthScores.reduce((sum, score) => sum + score, 0) / monthScores.length;
        }
      }
    });

    const currentMonthlyAverages = Object.values(currentPeriodScoresByMonth);
    const previousMonthlyAverages = Object.values(previousPeriodScoresByMonth);

    const currentOverallAverage = currentMonthlyAverages.length > 0 ?
    currentMonthlyAverages.reduce((sum, avg) => sum + avg, 0) / currentMonthlyAverages.length : 0;

    const previousOverallAverage = previousMonthlyAverages.length > 0 ?
    previousMonthlyAverages.reduce((sum, avg) => sum + avg, 0) / previousMonthlyAverages.length : 0;

    // Calculate period-over-period trend
    let trend = 0;
    let trendIcon = Minus;
    if (currentOverallAverage > 0 && previousOverallAverage > 0) {
      trend = currentOverallAverage - previousOverallAverage;
      trendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus;
    } else if (currentOverallAverage > 0 && previousOverallAverage === 0) {
      trend = currentOverallAverage;
      trendIcon = TrendingUp;
    } else if (currentOverallAverage === 0 && previousOverallAverage > 0) {
      trend = -previousOverallAverage;
      trendIcon = TrendingDown;
    }


    // Compile commentary from all asset classes for current period
    const allCommentary = [];
    activeSubmissions.forEach((s) => {
      if (s.asset_class_sentiment) {
        assetClasses.forEach((ac) => {
          const score = s.asset_class_sentiment[ac]?.score;
          // CRITICAL FIX: Only include entries with valid scores (not N/A)
          if (score && score !== 'N/A' && score !== null && score !== undefined) {
            const parsedScore = parseInt(score, 10);
            if (!isNaN(parsedScore)) {
              allCommentary.push({
                month: s.month,
                region: s.market || s.region, // Show market for office submissions, region for RMD submissions
                assetClass: ac.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
                score: parsedScore,
                commentary: s.asset_class_sentiment[ac].commentary || '' // Ensure empty string
              });
            }
          }
        });
      }
    });

    // Sort commentary by month, then by assetClass for consistent display
    allCommentary.sort((a, b) => {
      const monthCompare = a.month.localeCompare(b.month);
      if (monthCompare !== 0) return monthCompare;
      return a.assetClass.localeCompare(b.assetClass);
    });

    return {
      key: 'average',
      name: 'Average',
      score: currentOverallAverage, // This is the current period's average
      trend,
      trendIcon,
      commentary: allCommentary,
      submissions: activeSubmissions // Use active submissions
    };
  })();

  const getTemperatureSummary = (score, trend, allCommentary) => {
    if (score === 0) {
      return {
        text: "No sentiment data was submitted for this period, so the market temperature cannot be determined.",
        icon: <Thermometer className="w-5 h-5 text-slate-400" />
      };
    }

    // Determine temperature based on ACTUAL score
    let tempDescription = "";
    let icon = <Thermometer className="w-5 h-5 text-slate-400" />;

    if (score >= 7.0) {
      tempDescription = "The market temperature is warm";
      icon = <Thermometer className="w-5 h-5 text-green-500" />;
    } else if (score >= 5.0) {
      tempDescription = "The market temperature is lukewarm";
      icon = <Thermometer className="w-5 h-5 text-yellow-500" />;
    } else {
      tempDescription = "The market temperature is cool";
      icon = <Thermometer className="w-5 h-5 text-blue-500" />;
    }

    // Add exact score for clarity
    tempDescription += ` with an average sentiment score of ${score.toFixed(1)} out of 10`;

    // Explain trend changes
    let trendExplanation = "";
    if (Math.abs(trend) > 0.3) {
      if (trend > 0) {
        trendExplanation = `, up ${trend.toFixed(1)} points from last period`;
      } else {
        trendExplanation = `, down ${Math.abs(trend).toFixed(1)} points from last period`;
      }
    } else if (trend !== 0) {
      trendExplanation = `, relatively flat compared to last period (${trend > 0 ? '+' : ''}${trend.toFixed(1)} points)`;
    }

    // Analyze commentary for key themes (simplified)
    const commentaryText = allCommentary.map(c => c.commentary).join(' ').toLowerCase();
    
    const themes = {
      'rate cuts': ['rate cut', 'fed cut', 'interest rate', 'lower rates'],
      'leasing activity': ['leasing', 'tenant', 'occupancy'],
      'uncertainty': ['uncertainty', 'volatility', 'election'],
      'construction': ['construction', 'development', 'new supply'],
    };

    let dominantThemes = [];
    for (const [theme, keywords] of Object.entries(themes)) {
      const mentions = keywords.filter(keyword => commentaryText.includes(keyword)).length;
      if (mentions > 1) { // At least 2 keyword matches
        dominantThemes.push(theme);
      }
    }

    // Build thematic insight only if we have clear themes
    let thematicInsight = "";
    if (dominantThemes.length > 0) {
      thematicInsight = ` Key themes in commentary include ${dominantThemes.join(' and ')}.`;
    }

    return {
      text: `${tempDescription}${trendExplanation}.${thematicInsight}`,
      icon
    };
  };

  const temperatureSummary = getTemperatureSummary(averageData.score, averageData.trend, averageData.commentary);


  const getSentimentColor = (score) => {
    if (score === 0) return 'bg-slate-100 text-slate-500';
    if (score <= 4) return 'bg-red-100 text-red-800 hover:bg-red-200 cursor-pointer'; // Negative/low
    if (score <= 7) return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 cursor-pointer'; // Neutral/Mid
    return 'bg-green-100 text-green-800 hover:bg-green-200 cursor-pointer'; // Positive
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-slate-500';
  };

  return (
    <>
      <Card className="shadow-lg bg-slate-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white font-semibold leading-none tracking-tight flex items-center gap-2">
              <Thermometer className="w-5 h-5" />
              Asset Class Sentiment
            </CardTitle>
            {isRmdView && (
              <div className="flex items-center gap-2">
                <Label htmlFor="commentary-toggle" className="text-white text-sm">
                  {showRmdCommentary ? "RMD Commentary" : "MD Commentary"}
                </Label>
                <Switch
                  id="commentary-toggle"
                  checked={showRmdCommentary}
                  onCheckedChange={setShowRmdCommentary}
                />
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ?
          <div className="grid grid-cols-2 gap-3">
              {Array(8).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
            </div> :

          <div className="grid grid-cols-2 gap-3">
              {sentimentData.map((item) =>
            <div
              key={item.key}
              className={`p-3 rounded-lg text-center transition-all duration-300 ${getSentimentColor(item.score)}`}
              onClick={() => item.score > 0 && setSelectedAssetClass(item)}>

                  <div className="flex items-center justify-center gap-1 mb-1">
                    <p className="font-bold text-lg">{item.score.toFixed(1)}</p>
                    {item.trend !== 0 &&
                <item.trendIcon className={`w-4 h-4 ${getTrendColor(item.trend)}`} />
                }
                  </div>
                  <p className="text-xs font-medium uppercase tracking-wider">{item.name}</p>
                  {item.trend !== 0 &&
              <p className={`text-xs mt-1 ${getTrendColor(item.trend)}`}>
                      {item.trend > 0 ? '+' : ''}{item.trend.toFixed(1)} vs previous period
                    </p>
              }
                </div>
            )}
              
              {/* Average Box */}
              <div
              className={`p-3 rounded-lg text-center transition-all duration-300 border-2 border-slate-300 ${getSentimentColor(averageData.score)}`}
              onClick={() => averageData.score > 0 && setSelectedAssetClass(averageData)}>

                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="font-bold text-lg">{averageData.score.toFixed(1)}</p>
                  {averageData.trend !== 0 &&
                <averageData.trendIcon className={`w-4 h-4 ${getTrendColor(averageData.trend)}`} />
                }
                </div>
                <p className="text-xs font-bold uppercase tracking-wider">{averageData.name}</p>
                {averageData.trend !== 0 &&
              <p className={`text-xs mt-1 font-medium ${getTrendColor(averageData.trend)}`}>
                    {averageData.trend > 0 ? '+' : ''}{averageData.trend.toFixed(1)} vs previous period
                  </p>
              }
              </div>
            </div>
          }
          {!loading && (
            <div className="mt-6 pt-4 border-t border-slate-500 flex items-start gap-3">
                <div className="pt-1">
                    {temperatureSummary.icon}
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                    {temperatureSummary.text}
                </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sentiment Detail Modal */}
      {selectedAssetClass &&
      <Dialog open={!!selectedAssetClass} onOpenChange={() => setSelectedAssetClass(null)}>
          <DialogContent className="bg-slate-400 p-6 fixed left-[50%] top-[50%] z-50 grid w-full translate-x-[-50%] translate-y-[-50%] gap-4 border shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg max-w-2xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="text-slate-600 text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                {selectedAssetClass.name} Sentiment Details
              </DialogTitle>
              <DialogDescription>
                Average score: {selectedAssetClass.score.toFixed(1)}/10
                {selectedAssetClass.trend !== 0 &&
              <span className={`ml-2 ${getTrendColor(selectedAssetClass.trend)}`}>
                    ({selectedAssetClass.trend > 0 ? '+' : ''}{selectedAssetClass.trend.toFixed(1)} vs previous period)
                  </span>
              }
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-96">
              <div className="space-y-4 pr-4">
                {selectedAssetClass.commentary.length > 0 ?
              selectedAssetClass.commentary.map((entry, index) =>
              <div key={index} className="bg-slate-300 p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-slate-900 text-slate-50 px-2.5 py-0.5 text-xs font-semibold inline-flex items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">{entry.region || 'N/A'}</Badge>
                          <Badge variant="secondary">{entry.month}</Badge>
                          {entry.assetClass && <Badge variant="outline">{entry.assetClass}</Badge>}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-lg">{entry.score}</span>
                          <span className="text-sm text-slate-500">/10</span>
                        </div>
                      </div>
                      {entry.commentary && entry.commentary.trim() !== '' ?
                <p className="text-slate-800 text-sm leading-relaxed">{entry.commentary}</p> :

                <p className="text-slate-500 text-sm italic">No commentary provided</p>
                }
                    </div>
              ) :

              <div className="text-center py-8">
                    <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No commentary available for this asset class</p>
                  </div>
              }
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      }
    </>);

}