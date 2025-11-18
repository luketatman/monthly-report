import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Activity, Info, MessageSquare, Building } from "lucide-react";

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

const assetClasses = ["Office", "Retail", "Healthcare", "Industrial", "Multifamily", "Capital Markets", "Other"];
const scores = Array.from({ length: 10 }, (_, i) => i + 1);

export default function SentimentForm({ submission, onUpdate, disabled, officeSubmissions = [] }) {
  const [sentiments, setSentiments] = useState({});
  
  // Store callback in ref to avoid dependency issues
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Initialize ONCE based on submission ID
  useEffect(() => {
    setSentiments(submission?.asset_class_sentiment || {});
  }, [submission?.id]);

  // Debounced save
  const debouncedSave = useRef(
    debounce((value) => {
      if (onUpdateRef.current && Object.keys(value).length > 0) {
        onUpdateRef.current(value);
      }
    }, 1000)
  ).current;

  const handleSentimentChange = (assetClass, field, value) => {
    const acKey = assetClass.toLowerCase().replace(' ', '_');
    
    setSentiments(prev => {
      const updated = {
        ...prev,
        [acKey]: { ...(prev[acKey] || {}), [field]: value }
      };
      debouncedSave(updated);
      return updated;
    });
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Activity className="text-sky-600" />
          <span className="text-slate-900">6. Market Sentiment by Asset Class</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {assetClasses.map((ac) => {
          const acKey = ac.toLowerCase().replace(' ', '_');
          const sentimentData = sentiments[acKey] || {};
          
          const prefilledData = submission?.asset_class_sentiment?.[acKey] || {};
          const hasPrefilledData = prefilledData.commentary && prefilledData.commentary.includes('Average sentiment from');
          
          const relevantOfficeSubmissions = officeSubmissions.filter(
            (sub) => sub.asset_class_sentiment?.[acKey]?.score || sub.asset_class_sentiment?.[acKey]?.commentary
          );

          return (
            <div key={ac} className="p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold text-slate-800 mb-2">{ac}</h3>
              <div className="grid md:grid-cols-[1fr_2fr] gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">Sentiment Score (1-10 or N/A)</label>
                  <Select
                    value={sentimentData.score !== undefined && sentimentData.score !== null ? String(sentimentData.score) : ""}
                    onValueChange={(value) => handleSentimentChange(ac, "score", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-white border-slate-300 text-slate-900">
                      <SelectValue placeholder="Score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A - Not Applicable</SelectItem>
                      {scores.map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {hasPrefilledData && (
                    <div className="flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3 text-blue-500" />
                      <span className="text-xs text-blue-600">Pre-filled from office data</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">Commentary</label>
                  <Textarea
                    value={sentimentData.commentary || ""}
                    onChange={(e) => handleSentimentChange(ac, "commentary", e.target.value)}
                    placeholder={sentimentData.score === "N/A" ? "Elaborate further if there are any needs around this asset class at this time" : "Provide commentary..."}
                    disabled={disabled}
                    className="bg-white border-slate-300 text-slate-900"
                  />
                  {hasPrefilledData && (
                    <p className="text-xs text-slate-500 mt-1">
                      Replace the pre-filled text with your regional commentary
                    </p>
                  )}
                </div>
              </div>
              
              {relevantOfficeSubmissions.length > 0 && (
                <Accordion type="single" collapsible className="w-full mt-4">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-sm text-slate-600 hover:no-underline">
                      View Office Submissions ({relevantOfficeSubmissions.length})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 max-h-48 overflow-y-auto pr-2 bg-white p-3 rounded-md">
                        {relevantOfficeSubmissions.map((os) => (
                          <div key={os.id} className="p-2 border rounded-md bg-slate-50 text-xs">
                            <div className="flex justify-between items-center font-semibold">
                              <span className="flex items-center gap-1.5 text-slate-700">
                                <Building size={12} />
                                {os.market}
                              </span>
                              <span className="text-slate-800">
                                Score: {os.asset_class_sentiment[acKey]?.score}
                              </span>
                            </div>
                            <p className="text-slate-600 mt-1 pl-1">
                              <em className="flex items-start gap-1.5">
                                <MessageSquare size={12} className="mt-0.5 shrink-0" /> 
                                <span>{os.asset_class_sentiment[acKey]?.commentary || "No commentary."}</span>
                              </em>
                            </p>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}