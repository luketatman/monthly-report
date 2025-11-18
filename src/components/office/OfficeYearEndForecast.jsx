import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TrendingUp, MessageSquare, Info } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FinancialData } from "@/entities/FinancialData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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

export default function OfficeYearEndForecast({ market, region, month, financialData, onForecastUpdate, disabled }) {
  const [localData, setLocalData] = useState({});
  
  const onForecastUpdateRef = useRef(onForecastUpdate);
  useEffect(() => {
    onForecastUpdateRef.current = onForecastUpdate;
  }, [onForecastUpdate]);

  // CRITICAL FIX: Add financialData to dependency array to sync with parent updates
  useEffect(() => {
    const data = financialData?.find(d => d?.market === market) || {};
    setLocalData(data);
  }, [market, financialData]); // Added financialData here

  // Debounced save
  const debouncedSave = useRef(
    debounce(async (field, value, data) => {
      try {
        let processedValue = value;
        if (['year_end_forecast', 'ytd_revenue', 'ytd_budget'].includes(field)) {
          // CRITICAL FIX: Always convert to number, default to 0 (never null/undefined)
          processedValue = parseFloat(value) || 0;
        }

        if (data.id) {
          await FinancialData.update(data.id, { [field]: processedValue });
        } else {
          const created = await FinancialData.create({
            region: region,
            market: market,
            month: month,
            monthly_revenue: 0, // Default to 0 instead of null
            monthly_budget: 0, // Default to 0 instead of null
            ytd_revenue: 0,
            ytd_budget: 0,
            [field]: processedValue
          });
          setLocalData(created);
        }
        if (onForecastUpdateRef.current) onForecastUpdateRef.current();
      } catch (error) {
        console.error("Failed to save forecast data:", error);
      }
    }, 1000)
  ).current;

  const handleLocalChange = (field, value) => {
    setLocalData(prev => ({ ...prev, [field]: value }));
    debouncedSave(field, value, localData);
  };
  
  const formatCurrency = (value) => {
    // CRITICAL FIX: Display 0 instead of empty string for better UX
    if (value === null || value === undefined || value === '') return '0';
    return value.toString();
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <TrendingUp className="text-green-600" />
          <span className="text-slate-900">2. Year-End Pipeline Confidence</span>
        </CardTitle>
        <CardDescription className="text-slate-600 pt-2">
          Please indicate your expected year-end performance relative to budget and forecast.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-4">{market}</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mt-2 mb-4">
            <div className="bg-white p-3 rounded-md border">
              <label className="text-sm text-slate-700 block mb-1 font-medium">Current YTD Revenue</label>
              <Input
                type="number"
                value={formatCurrency(localData.ytd_revenue)}
                onChange={(e) => handleLocalChange('ytd_revenue', e.target.value)}
                disabled={disabled}
                className="bg-slate-800 text-slate-50 px-3 py-2 text-lg font-semibold border-slate-300 placeholder-slate-400"
                placeholder="0"
              />
            </div>
            <div className="bg-white p-3 rounded-md border">
              <label className="text-sm text-slate-700 block mb-1 font-medium">YTD Budget</label>
              <Input
                type="number"
                value={formatCurrency(localData.ytd_budget)}
                onChange={(e) => handleLocalChange('ytd_budget', e.target.value)}
                disabled={disabled}
                className="bg-slate-800 text-slate-50 px-3 py-2 text-lg font-semibold border-slate-300 placeholder-slate-400"
                placeholder="0"
              />
            </div>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Heads Up!</AlertTitle>
            <AlertDescription>
              YTD Revenue and YTD Budget are added in once last month's numbers are finalized.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-md border">
              <label className="text-sm font-medium text-slate-700 mb-2 block">Year-End Forecast (in millions)</label>
              <Input
                type="number"
                step="0.1"
                value={formatCurrency(localData.year_end_forecast)}
                onChange={(e) => handleLocalChange('year_end_forecast', e.target.value)}
                disabled={disabled}
                className="bg-slate-800 text-slate-50 px-3 py-2 text-2xl font-bold border-slate-300 placeholder-slate-400"
                placeholder="0.0"
              />
            </div>

            <div className="bg-white p-4 rounded-md border">
              <label className="text-sm font-medium text-slate-700 mb-2 block flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Year End Outlook
              </label>
              <Select 
                value={localData.year_end_outlook || ""} 
                onValueChange={(value) => handleLocalChange('year_end_outlook', value)}
                disabled={disabled}
              >
                <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300">
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
                value={localData.forecast_commentary || ""}
                onChange={(e) => handleLocalChange('forecast_commentary', e.target.value)}
                placeholder="Provide commentary on your year-end forecast and outlook..."
                disabled={disabled}
                className="bg-slate-800 text-slate-50 border-slate-300 min-h-[100px] placeholder-slate-400"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}