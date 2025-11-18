
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  AlertTriangle, 
  Target, 
  Lightbulb,
  ArrowRight,
  Activity,
  MapPin,
  Briefcase,
  Sparkles
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const formatCurrency = (value) => {
  if (value === undefined || value === null) return '$0';
  const sign = value < 0 ? '-' : '';
  const absValue = Math.abs(value);
  if (absValue >= 1000000) return `${sign}${(absValue / 1000000).toFixed(1)}M`;
  if (absValue >= 1000) return `${sign}${(absValue / 1000).toFixed(0)}K`;
  return `${sign}$${Math.round(absValue).toLocaleString()}`;
};

const InsightSection = ({ icon: Icon, title, insights, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700"
  };

  if (!insights || insights.length === 0) {
    return null; // Don't render section if there are no insights
  }

  return (
    <div className="bg-slate-700 rounded-lg p-4 border border-slate-500">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <h4 className="font-semibold text-white">{title}</h4>
      </div>
      <ul className="space-y-2">
        {insights.map((insight, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-200">
            <ArrowRight className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <span>{insight}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

const PerformanceScore = ({ score, label, description }) => {
  const getScoreColor = (s) => {
    if (s >= 80) return { bg: 'bg-green-500', text: 'text-green-500', label: 'Strong' };
    if (s >= 60) return { bg: 'bg-blue-500', text: 'text-blue-500', label: 'Good' };
    if (s >= 40) return { bg: 'bg-amber-500', text: 'text-amber-500', label: 'Fair' };
    return { bg: 'bg-red-500', text: 'text-red-500', label: 'Concerning' };
  };

  const colors = getScoreColor(score);

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center w-24 h-24">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            className="text-slate-600"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="none"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - score / 100)}`}
            className={colors.text}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-white">{score}</span>
        </div>
      </div>
      <p className="mt-2 text-sm font-bold text-white">{label}</p>
      <p className="text-xs text-slate-400">{description}</p>
      <p className={`text-xs font-semibold mt-1 ${colors.text}`}>{colors.label}</p>
    </div>
  );
};

export default function MarketOutlookExpanded({ 
  submissions, 
  financialData, 
  winLosses, 
  pitches, 
  personnelUpdates,
  filters 
}) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isInitial, setIsInitial] = useState(true);

  useEffect(() => {
    if (!isInitial) {
      generateInsights();
    }
  }, [submissions, financialData, winLosses, pitches, personnelUpdates, filters]);

  const calculateCurrentHealthScore = (dataSummary) => {
    let score = 0;
    
    // 1. Budget Performance (35 points max)
    const budgetPerformance = dataSummary.financial.total_budget > 0 
      ? (dataSummary.financial.total_revenue / dataSummary.financial.total_budget) * 100 
      : 0;
    
    if (budgetPerformance >= 100) score += 35;
    else if (budgetPerformance >= 95) score += 32;
    else if (budgetPerformance >= 90) score += 28;
    else if (budgetPerformance >= 85) score += 24;
    else if (budgetPerformance >= 80) score += 20;
    else if (budgetPerformance >= 70) score += 15;
    else score += Math.max(0, budgetPerformance * 0.35);
    
    // 2. Win/Loss Net Revenue Impact (20 points max)
    // Positive if wins outweigh losses, negative if losses outweigh wins
    const netWinRevenue = dataSummary.business_development.net_win_revenue;
    const revenueAsPercentOfBudget = dataSummary.financial.total_budget > 0
      ? (netWinRevenue / dataSummary.financial.total_budget) * 100
      : 0;
    
    if (revenueAsPercentOfBudget >= 10) score += 20;
    else if (revenueAsPercentOfBudget >= 5) score += 17;
    else if (revenueAsPercentOfBudget >= 2) score += 14;
    else if (revenueAsPercentOfBudget >= 0) score += 10;
    else if (revenueAsPercentOfBudget >= -2) score += 7;
    else if (revenueAsPercentOfBudget >= -5) score += 4;
    else score += 0; // Significant losses
    
    // 3. Market Sentiment (20 points max)
    const avgSentiment = dataSummary.sentiment.average_overall;
    if (avgSentiment >= 8) score += 20;
    else if (avgSentiment >= 7) score += 17;
    else if (avgSentiment >= 6) score += 13;
    else if (avgSentiment >= 5) score += 9;
    else score += Math.max(0, avgSentiment * 2);
    
    // 4. Pipeline Strength (25 points max)
    const pipelineVsBudget = dataSummary.financial.total_budget > 0
      ? (dataSummary.business_development.pipeline_value / dataSummary.financial.total_budget) * 100
      : 0;
    
    if (pipelineVsBudget >= 50) score += 25;
    else if (pipelineVsBudget >= 40) score += 22;
    else if (pipelineVsBudget >= 30) score += 18;
    else if (pipelineVsBudget >= 20) score += 14;
    else if (pipelineVsBudget >= 10) score += 10;
    else score += Math.max(0, pipelineVsBudget * 0.5);
    
    return Math.round(Math.min(100, Math.max(0, score)));
  };

  const calculateNextPeriodOutlook = (dataSummary) => {
    let score = 0;
    
    // 1. Pipeline Coverage (30 points max)
    // Strong pipeline suggests good next period performance
    const pipelineVsBudget = dataSummary.financial.total_budget > 0
      ? (dataSummary.business_development.pipeline_value / dataSummary.financial.total_budget) * 100
      : 0;
    
    if (pipelineVsBudget >= 60) score += 30;
    else if (pipelineVsBudget >= 50) score += 27;
    else if (pipelineVsBudget >= 40) score += 23;
    else if (pipelineVsBudget >= 30) score += 19;
    else if (pipelineVsBudget >= 20) score += 14;
    else score += Math.max(0, pipelineVsBudget * 0.5);
    
    // 2. Momentum Trend (25 points max)
    // Are we beating budget? Win rate improving? These suggest positive momentum
    const budgetPerformance = dataSummary.financial.total_budget > 0 
      ? (dataSummary.financial.total_revenue / dataSummary.financial.total_budget) * 100 
      : 0;
    const winRate = parseFloat(dataSummary.business_development.win_rate);
    
    // Momentum composite
    const momentumScore = (budgetPerformance + winRate) / 2;
    if (momentumScore >= 90) score += 25;
    else if (momentumScore >= 80) score += 21;
    else if (momentumScore >= 70) score += 17;
    else if (momentumScore >= 60) score += 13;
    else score += Math.max(0, momentumScore * 0.25);
    
    // 3. Sentiment Trajectory (20 points max)
    const avgSentiment = dataSummary.sentiment.average_overall;
    if (avgSentiment >= 8) score += 20;
    else if (avgSentiment >= 7) score += 17;
    else if (avgSentiment >= 6) score += 13;
    else if (avgSentiment >= 5) score += 9;
    else score += Math.max(0, avgSentiment * 2);
    
    // 4. Personnel Impact (15 points max)
    const personnelRevenueImpact = dataSummary.personnel.revenue_impact;
    const personnelImpactAsPercent = dataSummary.financial.total_budget > 0
      ? (personnelRevenueImpact / dataSummary.financial.total_budget) * 100
      : 0;
    
    if (personnelImpactAsPercent >= 5) score += 15; // Strong positive hiring
    else if (personnelImpactAsPercent >= 2) score += 12;
    else if (personnelImpactAsPercent >= 0) score += 9;
    else if (personnelImpactAsPercent >= -2) score += 6;
    else if (personnelImpactAsPercent >= -5) score += 3;
    else score += 0; // Significant losses
    
    // 5. Win/Loss Balance (10 points max)
    if (winRate >= 70) score += 10;
    else if (winRate >= 60) score += 8;
    else if (winRate >= 50) score += 6;
    else if (winRate >= 40) score += 4;
    else score += Math.max(0, winRate / 10);
    
    return Math.round(Math.min(100, Math.max(0, score)));
  };

  const generateInsights = async () => {
    setLoading(true);
    setIsInitial(false);
    
    try {
      // Prepare comprehensive data summary
      const dataSummary = {
        period: {
          type: filters.periodType,
          year: filters.year,
          month: filters.month,
          quarter: filters.quarter,
          region: filters.region
        },
        financial: {
          total_revenue: financialData.reduce((sum, f) => sum + (f.monthly_revenue || 0), 0),
          total_budget: financialData.reduce((sum, f) => sum + (f.monthly_budget || 0), 0),
          total_reforecast: financialData.reduce((sum, f) => sum + (f.monthly_reforecast || 0), 0),
          by_region: Object.entries(
            financialData.reduce((acc, f) => {
              if (!acc[f.region]) acc[f.region] = { revenue: 0, budget: 0 };
              acc[f.region].revenue += f.monthly_revenue || 0;
              acc[f.region].budget += f.monthly_budget || 0;
              return acc;
            }, {})
          ).map(([region, data]) => ({
            region,
            ...data,
            performance: data.budget > 0 ? (data.revenue / data.budget * 100).toFixed(1) : 0
          }))
        },
        business_development: {
          wins: winLosses.filter(w => w.outcome === 'Win').length,
          losses: winLosses.filter(w => w.outcome === 'Loss').length,
          win_rate: winLosses.length > 0 ? ((winLosses.filter(w => w.outcome === 'Win').length / winLosses.length) * 100).toFixed(1) : 0,
          net_win_revenue: winLosses.reduce((sum, w) => 
            sum + (w.outcome === 'Win' ? (w.budget_year_revenue_impact || 0) : -(w.budget_year_revenue_impact || 0)), 0
          ),
          pitch_count: pitches.length,
          pipeline_value: pitches.reduce((sum, p) => sum + (p.budget_year_revenue_impact || 0), 0),
          by_asset_class: Object.entries(
            winLosses.reduce((acc, w) => {
              if (!acc[w.asset_type]) acc[w.asset_type] = { wins: 0, losses: 0 };
              if (w.outcome === 'Win') acc[w.asset_type].wins++;
              else acc[w.asset_type].losses++;
              return acc;
            }, {})
          ).map(([asset_type, data]) => ({ // Map to desired structure
            asset_type,
            ...data,
            win_rate: (data.wins + data.losses) > 0 ? (data.wins / (data.wins + data.losses) * 100).toFixed(1) : 0
          }))
        },
        sentiment: {
          average_overall: submissions.reduce((sum, s) => {
            const score = s.overall_sentiment?.score;
            const parsed = score !== null && score !== undefined && score !== 'N/A' ? parseInt(score, 10) : 5;
            return sum + (!isNaN(parsed) ? parsed : 5);
          }, 0) / (submissions.length || 1),
          by_asset_class: ['office', 'retail', 'industrial', 'multifamily', 'healthcare', 'capital_markets'].map(ac => {
            const scores = submissions
              .map(s => s.asset_class_sentiment?.[ac]?.score)
              .filter(score => score && score !== 'N/A')
              .map(score => parseInt(score, 10))
              .filter(score => !isNaN(score) && score >= 1 && score <= 10);
            return {
              asset_class: ac,
              avg_score: scores.length > 0 ? (scores.reduce((sum, s) => sum + s, 0) / scores.length).toFixed(1) : 0
            };
          }).filter(item => item.avg_score > 0)
        },
        personnel: {
          net_change: personnelUpdates.reduce((sum, p) => 
            (p.status === 'Hired' || p.status === 'New Hire') ? sum + 1 : sum - 1, 0
          ),
          revenue_impact: personnelUpdates.reduce((sum, p) => 
            sum + (p.revenue_impact || 0) * ((p.status === 'Resigned' || p.status === 'Terminated') ? -1 : 1), 0
          )
        },
        commentary_themes: submissions.flatMap(s => {
          const commentaries = [];
          
          if (s.rmd_regional_commentary) commentaries.push(s.rmd_regional_commentary);
          if (s.rmd_ytd_year_end_commentary) commentaries.push(s.rmd_ytd_year_end_commentary);
          
          if (s.financial_commentary) {
            Object.values(s.financial_commentary).filter(Boolean).forEach(c => commentaries.push(c));
          }
          
          if (s.asset_class_sentiment) {
            Object.values(s.asset_class_sentiment).forEach(ac => {
              if (ac && ac.commentary) {
                commentaries.push(ac.commentary);
              }
            });
          }
          
          return commentaries;
        }).filter(Boolean).join(' ')
      };

      // Calculate both scores
      const currentHealthScore = calculateCurrentHealthScore(dataSummary);
      const nextPeriodOutlook = calculateNextPeriodOutlook(dataSummary);

      // Create comprehensive prompt for LLM
      const prompt = `You are a senior CRE analyst creating a strategic market outlook report. Analyze this comprehensive business data and provide actionable insights.

DATA SUMMARY:
${JSON.stringify(dataSummary, null, 2)}

CALCULATED SCORES:
- Current Market Health: ${currentHealthScore}/100 (Budget Performance 35%, Win Revenue Impact 20%, Market Sentiment 20%, Pipeline Strength 25%)
- Next Period Outlook: ${nextPeriodOutlook}/100 (Pipeline Coverage 30%, Momentum 25%, Sentiment 20%, Personnel Impact 15%, Win Rate 10%)

Generate a strategic market outlook with these sections:

1. CURRENT STATE: Describe how we performed THIS period - reference actual budget performance, win/loss revenue, sentiment (2-3 sentences)
2. REGIONAL INSIGHTS: Which regions outperformed/underperformed and why? Be specific with numbers (3-5 bullet points)
3. BUSINESS LINE INSIGHTS: Which asset classes or transaction types show strength/weakness? (3-5 bullet points)
4. RISK FACTORS: Key concerns or warning signs from the data (3-4 bullet points)
5. OPPORTUNITIES: Where to focus efforts for growth based on pipeline and trends (3-4 bullet points)
6. FORWARD OUTLOOK: What do we predict for NEXT period based on pipeline, momentum, sentiment trends (2-3 sentences)

Be specific, reference actual numbers from the data, and provide actionable insights.

Respond ONLY with valid JSON in this exact format:
{
  "current_state": "We achieved 95% of budget this period with...",
  "regional_insights": ["Northeast leading at 105% of budget with strong industrial performance", "Central region at 87% due to..."],
  "business_line_insights": ["Industrial remains strongest with $2.5M in net wins", "Office showing recovery with improving sentiment..."],
  "risk_factors": ["Pipeline appears thin in retail sector", "West region sentiment declining..."],
  "opportunities": ["Expand industrial presence where win rate is 75%", "Cross-sell opportunities in Northeast..."],
  "forward_outlook": "Based on $5M pipeline and improving sentiment, project 102% of budget next period..."
}`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            current_state: { type: "string" },
            regional_insights: { type: "array", items: { type: "string" } },
            business_line_insights: { type: "array", items: { type: "string" } },
            risk_factors: { type: "array", items: { type: "string" } },
            opportunities: { type: "array", items: { type: "string" } },
            forward_outlook: { type: "string" }
          }
        }
      });

      setInsights({
        ...response,
        current_health_score: currentHealthScore,
        next_period_outlook_score: nextPeriodOutlook
      });
    } catch (error) {
      console.error("Error generating insights:", error);
      setInsights({
        current_health_score: 0,
        next_period_outlook_score: 0,
        current_state: "Unable to generate insights at this time.",
        regional_insights: [],
        business_line_insights: [],
        risk_factors: ["Failed to fetch insights from AI model."],
        opportunities: [],
        forward_outlook: "Please try again later."
      });
    } finally {
      setLoading(false);
    }
  };

  if (isInitial) {
    return (
      <Card className="bg-slate-700 border-slate-500">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-blue-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Market Outlook</h3>
          <p className="text-slate-300 mb-6">
            Generate comprehensive insights on current performance and future outlook.
          </p>
          <button
            onClick={generateInsights}
            disabled={loading}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Generating Insights..." : "Generate Market Outlook"}
          </button>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-slate-700 border-slate-500">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
            <p className="text-lg font-medium text-white">Please Wait While Market Outlook is Loading...</p>
            <p className="text-sm text-slate-400">Analyzing financial data, win/loss records, pipeline, sentiment, and more...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return (
      <Card className="bg-slate-700 border-slate-500">
        <CardContent className="p-6 text-center text-slate-300">
          <p>No insights available. Please try regenerating the analysis.</p>
          <button
            onClick={generateInsights}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Regenerate Insights
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Dual Scores */}
      <Card className="bg-gradient-to-br from-slate-700 to-slate-800 border-slate-500">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                <Activity className="w-6 h-6 text-blue-400" />
                Market Outlook Analysis
              </h3>
              <p className="text-slate-300">{insights.current_state}</p>
            </div>
            <div className="flex gap-8">
              <PerformanceScore 
                score={insights.current_health_score} 
                label="Current Health" 
                description="This Period"
              />
              <PerformanceScore 
                score={insights.next_period_outlook_score} 
                label="Future Outlook" 
                description="Next Period"
              />
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-600">
            <div className="grid md:grid-cols-2 gap-4 text-xs text-slate-400 mb-3">
              <div>
                <p className="font-semibold text-white mb-1">Current Health Factors:</p>
                <p>Budget Performance (35%) • Win Revenue Impact (20%) • Market Sentiment (20%) • Pipeline Strength (25%)</p>
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Future Outlook Factors:</p>
                <p>Pipeline Coverage (30%) • Momentum (25%) • Sentiment (20%) • Personnel Impact (15%) • Win Rate (10%)</p>
              </div>
            </div>
            <button
              onClick={generateInsights}
              className="text-sm text-blue-400 hover:text-blue-300 underline"
            >
              Regenerate Analysis
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Insights Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        <InsightSection 
          icon={MapPin} 
          title="Regional Performance" 
          insights={insights.regional_insights} 
          color="blue"
        />
        <InsightSection 
          icon={Briefcase} 
          title="Business Line Analysis" 
          insights={insights.business_line_insights} 
          color="purple"
        />
        <InsightSection 
          icon={AlertTriangle} 
          title="Risk Factors" 
          insights={insights.risk_factors} 
          color="red"
        />
        <InsightSection 
          icon={Lightbulb} 
          title="Growth Opportunities" 
          insights={insights.opportunities} 
          color="green"
        />
      </div>

      {/* Forward Outlook */}
      <Card className="bg-slate-700 border-slate-500">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Forward Outlook
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-200 leading-relaxed">{insights.forward_outlook}</p>
        </CardContent>
      </Card>
    </div>
  );
}
