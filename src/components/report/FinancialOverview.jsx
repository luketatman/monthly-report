import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Text, MessageSquare } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FinancialData } from "@/entities/FinancialData";

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

export default function FinancialOverview({ markets, financialData, submission, onUpdate, onRegionalUpdate, disabled, onFinancialDataUpdate, isRMDView }) {
  const [localCommentaries, setLocalCommentaries] = useState({});
  const [localFinancials, setLocalFinancials] = useState({});
  const [regionalCommentary, setRegionalCommentary] = useState("");
  
  // Use refs to store callbacks and avoid dependency issues
  const onRegionalUpdateRef = useRef(onRegionalUpdate);
  const onFinancialDataUpdateRef = useRef(onFinancialDataUpdate);
  
  useEffect(() => {
    onRegionalUpdateRef.current = onRegionalUpdate;
    onFinancialDataUpdateRef.current = onFinancialDataUpdate;
  }, [onRegionalUpdate, onFinancialDataUpdate]);

  // Initialize data ONCE on mount or when key data changes
  useEffect(() => {
    const commentariesFromFinancialData = {};
    markets.forEach(market => {
      const marketFinancialData = financialData.find(d => d.market === market);
      if (marketFinancialData?.commentary) {
        commentariesFromFinancialData[market] = marketFinancialData.commentary;
      }
    });
    
    setLocalCommentaries(commentariesFromFinancialData);
    setRegionalCommentary(submission?.rmd_regional_commentary || "");

    const financialsMap = markets.reduce((acc, market) => {
      acc[market] = financialData.find(d => d.market === market) || {};
      return acc;
    }, {});
    setLocalFinancials(financialsMap);
  }, [markets.join(','), submission?.id]); // Only re-run when markets or submission ID changes

  // Debounced save for market commentaries
  const debouncedSaveCommentary = useRef(
    debounce(async (market, value, marketData, submissionData) => {
      try {
        if (marketData?.id) {
          await FinancialData.update(marketData.id, { commentary: value });
        } else {
          await FinancialData.create({
            region: submissionData?.region,
            market: market,
            month: submissionData?.month,
            monthly_revenue: 0,
            monthly_budget: 0,
            ytd_revenue: 0,
            ytd_budget: 0,
            commentary: value
          });
        }
        if (onFinancialDataUpdateRef.current) {
          onFinancialDataUpdateRef.current();
        }
      } catch (error) {
        console.error('Failed to update commentary:', error);
      }
    }, 1000)
  ).current;

  const handleLocalCommentaryChange = (market, value) => {
    setLocalCommentaries(prev => ({ ...prev, [market]: value }));
    const marketData = localFinancials[market];
    debouncedSaveCommentary(market, value, marketData, submission);
  };

  // Debounced save for regional commentary
  const debouncedSaveRegionalCommentary = useRef(
    debounce((value) => {
      if (onRegionalUpdateRef.current) {
        onRegionalUpdateRef.current(value);
      }
    }, 1000)
  ).current;

  const handleRegionalCommentaryChange = (value) => {
    setRegionalCommentary(value);
    debouncedSaveRegionalCommentary(value);
  };
  
  const handleLocalFinancialChange = (market, field, value) => {
    setLocalFinancials(prev => ({
        ...prev,
        [market]: {
            ...prev[market],
            [field]: value
        }
    }));
  };

  const handleSaveFinancials = async (market, field) => {
    try {
      const marketData = localFinancials[market];
      const value = marketData[field];
      const numericValue = parseFloat(value) || 0;

      if (marketData.id) {
        await FinancialData.update(marketData.id, { [field]: numericValue });
      } else {
        await FinancialData.create({
          region: submission?.region,
          market: market,
          month: submission?.month,
          monthly_revenue: 0,
          monthly_budget: 0,
          ytd_revenue: 0,
          ytd_budget: 0,
          [field]: numericValue
        });
      }
      if (onFinancialDataUpdateRef.current) {
        onFinancialDataUpdateRef.current();
      }
    } catch (error) {
      console.error('Failed to save financial data:', error);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return '';
    return value.toString();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <DollarSign className="text-blue-600" />
          <span className="text-slate-900">1. 30-Day Financial Overview</span>
        </CardTitle>
        {isRMDView && (
          <CardDescription className="pt-2 text-slate-600">
            All input information has been pre-filled by the managing directors of your region this month. You have the ability to change it and add commentary, but anything that is not pre-filled with numbers has not been filled out by that MD. The window to the right should show who has submitted this month.
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {markets.map((market) => {
          const marketData = localFinancials[market] || {};
          return (
            <div key={market} className="p-4 border rounded-lg bg-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-4">{market}</h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded-md border">
                  <label className="text-sm text-slate-500 block mb-1">Monthly Revenue</label>
                  <Input
                    type="number"
                    value={formatCurrency(marketData.monthly_revenue)}
                    onChange={(e) => handleLocalFinancialChange(market, 'monthly_revenue', e.target.value)}
                    onBlur={() => handleSaveFinancials(market, 'monthly_revenue')}
                    disabled={disabled}
                    className="font-semibold text-lg bg-slate-50 border-slate-300 text-slate-900"
                    placeholder="0"
                  />
                </div>
                <div className="bg-white p-3 rounded-md border">
                  <label className="text-sm text-slate-500 block mb-1">Monthly Budget</label>
                  <Input
                    type="number"
                    value={formatCurrency(marketData.monthly_budget)}
                    onChange={(e) => handleLocalFinancialChange(market, 'monthly_budget', e.target.value)}
                    onBlur={() => handleSaveFinancials(market, 'monthly_budget')}
                    disabled={disabled}
                    className="font-semibold text-lg bg-slate-50 border-slate-300 text-slate-900"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
                  <Text className="w-4 h-4" />
                  Commentary {isRMDView && <span className="text-xs text-slate-500">(from MD submission)</span>}
                </label>
                <Textarea
                  value={localCommentaries[market] || ""}
                  onChange={(e) => handleLocalCommentaryChange(market, e.target.value)}
                  placeholder={isRMDView ? "Commentary from MD submission will appear here..." : "Provide color on performance (e.g., key drivers, variances, surprises)..."}
                  disabled={disabled}
                  className="bg-slate-50 border-slate-300 text-slate-900"
                />
              </div>
            </div>
          );
        })}

        {isRMDView && (
            <div className="p-4 border-t border-slate-200 mt-6 pt-6">
                <label className="text-sm font-medium text-slate-900 mb-2 block flex items-center gap-2">
                    <MessageSquare className="text-indigo-600 w-5 h-5" />
                    RMD Monthly Regional Commentary
                </label>
                <p className="text-sm text-slate-600 mb-3">
                    Provide your strategic commentary on the entire region's performance, key themes, challenges, and outlook for the month.
                </p>
                <Textarea
                    value={regionalCommentary}
                    onChange={(e) => handleRegionalCommentaryChange(e.target.value)}
                    placeholder="Share your comprehensive regional perspective, key trends, strategic initiatives, and overall assessment..."
                    disabled={disabled}
                    className="min-h-[120px] bg-white border-slate-300 text-slate-900"
                />
            </div>
        )}
      </CardContent>
    </Card>
  );
}