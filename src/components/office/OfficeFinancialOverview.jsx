import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DollarSign, Text, Info } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FinancialData } from "@/entities/FinancialData";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function OfficeFinancialOverview({ market, region, month, financialData, submission, disabled, onFinancialDataUpdate }) {
  const [localFinancialData, setLocalFinancialData] = useState({});
  const [localCommentary, setLocalCommentary] = useState("");
  
  const onFinancialDataUpdateRef = useRef(onFinancialDataUpdate);
  useEffect(() => {
    onFinancialDataUpdateRef.current = onFinancialDataUpdate;
  }, [onFinancialDataUpdate]);

  // CRITICAL FIX: Add financialData to dependency array to sync with parent updates
  useEffect(() => {
    const data = financialData?.find((d) => d?.market === market) || {};
    setLocalFinancialData(data);
    setLocalCommentary(data?.commentary || "");
  }, [market, submission?.id, financialData]); // Added financialData here

  // Debounced save for commentary
  const debouncedSaveCommentary = useRef(
    debounce(async (value, marketData, subData) => {
      try {
        if (marketData?.id) {
          await FinancialData.update(marketData.id, { commentary: value });
        } else {
          const created = await FinancialData.create({
            region: subData?.region || region,
            market: market,
            month: subData?.month || month,
            monthly_revenue: 0, // Default to 0 instead of null
            monthly_budget: 0, // Default to 0 instead of null
            ytd_revenue: 0,
            ytd_budget: 0,
            commentary: value
          });
          setLocalFinancialData(created);
        }
        if (onFinancialDataUpdateRef.current) onFinancialDataUpdateRef.current();
      } catch (error) {
        console.error("Failed to save commentary:", error);
      }
    }, 1000)
  ).current;

  const handleCommentaryChange = (value) => {
    setLocalCommentary(value);
    debouncedSaveCommentary(value, localFinancialData, submission);
  };

  // Debounced save for financials
  const debouncedSaveFinancials = useRef(
    debounce(async (field, value, marketData, subData) => {
      try {
        // CRITICAL FIX: Always convert to number, default to 0 (never null/undefined)
        const numericValue = parseFloat(value) || 0;
        if (marketData?.id) {
          await FinancialData.update(marketData.id, { [field]: numericValue });
        } else {
          const created = await FinancialData.create({
            region: subData?.region || region,
            market: market,
            month: subData?.month || month,
            monthly_revenue: 0,
            monthly_budget: 0,
            ytd_revenue: 0,
            ytd_budget: 0,
            [field]: numericValue
          });
          setLocalFinancialData(created);
        }
        if (onFinancialDataUpdateRef.current) onFinancialDataUpdateRef.current();
      } catch (error) {
        console.error("Failed to save financial data:", error);
      }
    }, 1000)
  ).current;

  const handleLocalChange = (field, value) => {
    setLocalFinancialData(prev => ({ ...prev, [field]: value }));
    debouncedSaveFinancials(field, value, localFinancialData, submission);
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
          <DollarSign className="text-blue-600" />
          <span className="text-slate-900">1. 30-Day Financial Overview</span>
        </CardTitle>
        <CardDescription className="text-slate-600 pt-2">
          Based on current understandings of last month's financials, please provide your commentary outlining performance against budget and forecast, as well as the primary factors that drove revenue up or down.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg bg-slate-100">
          <h3 className="font-bold text-lg text-slate-800 mb-4">{market}</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div className="bg-white p-3 rounded-md border">
            <label className="text-sm text-slate-700 block mb-1 font-medium">Monthly Revenue</label>
            <Input
              type="number"
              value={formatCurrency(localFinancialData.monthly_revenue)}
              onChange={(e) => handleLocalChange('monthly_revenue', e.target.value)}
              onBlur={(e) => debouncedSaveFinancials.flush && debouncedSaveFinancials.flush()}
              disabled={disabled}
              className="font-semibold text-lg bg-slate-800 border-slate-300 text-slate-50 placeholder-slate-400"
              placeholder="0"
            />
          </div>
          <div className="bg-white p-3 rounded-md border">
            <label className="text-sm text-slate-700 block mb-1 font-medium">Monthly Budget</label>
            <Input
              type="number"
              value={formatCurrency(localFinancialData.monthly_budget)}
              onChange={(e) => handleLocalChange('monthly_budget', e.target.value)}
              onBlur={(e) => debouncedSaveFinancials.flush && debouncedSaveFinancials.flush()}
              disabled={disabled}
              className="font-semibold text-lg bg-slate-800 border-slate-300 text-slate-50 placeholder-slate-400"
              placeholder="0"
            />
          </div>
          </div>
          
          <Alert className="bg-blue-50 border-blue-200 text-blue-800 mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Heads Up!</AlertTitle>
            <AlertDescription>
              Monthly Revenue and Monthly Budget are added in once last month's numbers are finalized. If you don't see them, no need to fill them in as finance will handle it.
            </AlertDescription>
          </Alert>

          <div className="mt-4">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2 mb-2">
              <Text className="w-4 h-4" />
              Commentary
            </label>
            <Textarea
              value={localCommentary}
              onChange={(e) => handleCommentaryChange(e.target.value)}
              placeholder="Provide color on performance (e.g., key drivers, variances, surprises)..."
              disabled={disabled}
              className="bg-slate-800 border-slate-300 text-slate-50 placeholder-slate-400"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}