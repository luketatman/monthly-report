import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, MessageSquare } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FinancialData } from "@/entities/FinancialData";

const outlookOptions = [
  "Expected to Exceed Budget (projected to surpass budget by more than 10%)",
  "Expected to Meet Budget (projected to finish within ±10% of budget)", 
  "Expected to be Slightly Below Budget (projected to be 10%–20% below budget)",
  "Expected to Materially Miss Budget (projected to be more than 20% below budget)"
];

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function YearEndForecast({ markets, financialData, submission, onForecastUpdate, onYtdCommentaryUpdate, disabled, isRMDView }) {
  const [ytdCommentary, setYtdCommentary] = useState("");
  
  // Use refs to avoid dependency issues
  const onYtdCommentaryUpdateRef = useRef(onYtdCommentaryUpdate);
  const onForecastUpdateRef = useRef(onForecastUpdate);
  
  useEffect(() => {
    onYtdCommentaryUpdateRef.current = onYtdCommentaryUpdate;
    onForecastUpdateRef.current = onForecastUpdate;
  }, [onYtdCommentaryUpdate, onForecastUpdate]);

  // Initialize ONCE based on submission ID
  useEffect(() => {
    setYtdCommentary(submission?.rmd_ytd_year_end_commentary || "");
  }, [submission?.id]);

  // Debounced save
  const debouncedSaveYtdCommentary = useRef(
    debounce((value) => {
      if (onYtdCommentaryUpdateRef.current) {
        onYtdCommentaryUpdateRef.current(value);
      }
    }, 1000)
  ).current;

  const handleYtdCommentaryChange = (value) => {
    setYtdCommentary(value);
    debouncedSaveYtdCommentary(value);
  };
  
  const getMarketData = (market) => {
    return financialData.find(d => d.market === market) || {};
  };

  const handleFieldChange = async (market, field, value) => {
    const marketData = getMarketData(market);
    let processedValue = value;
    
    if (field === 'year_end_forecast' || field === 'ytd_revenue' || field === 'ytd_budget') {
      processedValue = parseFloat(value) || 0;
    }

    try {
      if (marketData.id) {
        await FinancialData.update(marketData.id, { [field]: processedValue });
      } else {
        await FinancialData.create({
          region: submission?.region || 'Unknown',
          market: market,
          month: submission?.month || new Date().toISOString().slice(0, 7),
          monthly_revenue: 0,
          monthly_budget: 0,
          ytd_revenue: 0,
          ytd_budget: 0,
          [field]: processedValue
        });
      }
      if (onForecastUpdateRef.current) {
        onForecastUpdateRef.current();
      }
    } catch (error) {
      console.error('Failed to save field:', error);
    }
  };
  
  const formatCurrency = (value) => {
    if (value === undefined || value === null) return '';
    if (typeof value === 'number') return value.toString();
    return String(value);
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="text-green-600" />
          <span className="text-slate-900">2. Year-End Pipeline Confidence</span>
        </CardTitle>
        {isRMDView && (
            <CardDescription className="pt-2 text-slate-600">
                All input information has been pre-filled by the managing directors of your region this month. You have the ability to change it and add commentary, but anything that is not pre-filled with numbers has not been filled out by that MD. The window to the right should show who has submitted this month.
            </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {markets.map((market) => {
          const marketData = getMarketData(market);
          
          return (
            <div key={market} className="p-4 border rounded-lg bg-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-800">{market}</h3>
              </div>
              
              <div className="grid md:grid-cols-2 gap-4 mt-2 mb-4">
                <div className="bg-white p-3 rounded-md border">
                  <label className="text-sm text-slate-500 block mb-1">Current YTD Revenue</label>
                  <Input
                    type="number"
                    value={formatCurrency(marketData.ytd_revenue)}
                    onChange={(e) => handleFieldChange(market, 'ytd_revenue', e.target.value)}
                    disabled={disabled}
                    className="font-semibold text-lg bg-blue-50 border-blue-300 text-slate-900"
                    placeholder="0"
                  />
                </div>
                <div className="bg-white p-3 rounded-md border">
                  <label className="text-sm text-slate-500 block mb-1">YTD Budget</label>
                  <Input
                    type="number"
                    value={formatCurrency(marketData.ytd_budget)}
                    onChange={(e) => handleFieldChange(market, 'ytd_budget', e.target.value)}
                    disabled={disabled}
                    className="font-semibold text-lg bg-blue-50 border-blue-300 text-slate-900"
                    placeholder="0"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-md border">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Year-End Forecast (in millions)</label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formatCurrency(marketData.year_end_forecast)}
                    onChange={(e) => handleFieldChange(market, 'year_end_forecast', e.target.value)}
                    disabled={disabled}
                    className="font-bold text-2xl text-green-600 bg-green-50 border-green-300"
                    placeholder="0.0"
                  />
                </div>

                <div className="bg-white p-4 rounded-md border">
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Year End Outlook
                  </label>
                  <Select 
                    value={marketData.year_end_outlook || ""} 
                    onValueChange={(value) => handleFieldChange(market, 'year_end_outlook', value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="w-full bg-amber-50 border-amber-300 text-slate-900">
                      <SelectValue placeholder="Select year-end outlook" />
                    </SelectTrigger>
                    <SelectContent>
                      {outlookOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-white p-4 rounded-md border">
                  <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    Year End Forecast Commentary
                  </label>
                  <Textarea
                    value={marketData.forecast_commentary || ""}
                    onChange={(e) => handleFieldChange(market, 'forecast_commentary', e.target.value)}
                    placeholder="Provide commentary on your year-end forecast and outlook..."
                    disabled={disabled}
                    className="min-h-[100px] bg-amber-50 border-amber-300 text-slate-900"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {isRMDView && (
            <div className="p-4 border-t border-slate-200 mt-6 pt-6">
                <label className="text-sm font-medium text-slate-900 mb-2 block flex items-center gap-2">
                    <MessageSquare className="text-green-600 w-5 h-5" />
                    RMD YTD Commentary and year end outlook
                </label>
                <p className="text-sm text-slate-600 mb-3">
                    Provide your strategic YTD commentary and year-end outlook for the entire region's pipeline and performance.
                </p>
                <Textarea
                    value={ytdCommentary}
                    onChange={(e) => handleYtdCommentaryChange(e.target.value)}
                    placeholder="Share your comprehensive regional YTD assessment, pipeline confidence, year-end outlook, and strategic insights..."
                    disabled={disabled}
                    className="min-h-[120px] bg-white border-slate-300 text-slate-900"
                />
            </div>
        )}
      </CardContent>
    </Card>
  );
}