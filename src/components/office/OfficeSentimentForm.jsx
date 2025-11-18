import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from "lucide-react";

const assetClasses = ["Office", "Retail", "Healthcare", "Industrial", "Multifamily", "Capital Markets", "Other"];
const scores = Array.from({ length: 10 }, (_, i) => i + 1);

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function OfficeSentimentForm({ submission, onUpdate, disabled }) {
  const [localSentiments, setLocalSentiments] = useState({});

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Initialize ONCE
  useEffect(() => {
    setLocalSentiments(submission?.asset_class_sentiment || {});
  }, [submission?.id]);

  // Debounced save
  const debouncedSave = useRef(
    debounce((value) => {
      if (onUpdateRef.current) {
        onUpdateRef.current(value);
      }
    }, 1000)
  ).current;

  const handleLocalChange = (assetClass, field, value) => {
    const acKey = assetClass.toLowerCase().replace(' ', '_');
    setLocalSentiments(prev => {
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
          const sentimentData = localSentiments?.[acKey] || {};
          
          return (
            <div key={ac} className="p-4 border rounded-lg bg-slate-50">
              <h3 className="font-semibold text-slate-800 mb-2">{ac}</h3>
              <div className="grid md:grid-cols-[1fr_2fr] gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">Sentiment Score (1-10 or N/A)</label>
                  <Select
                    value={sentimentData.score ? String(sentimentData.score) : ""}
                    onValueChange={(value) => handleLocalChange(ac, "score", value)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400">
                      <SelectValue placeholder="Score" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="N/A">N/A - Not Applicable</SelectItem>
                      {scores.map((s) => (
                        <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-900 mb-2 block">Commentary</label>
                  <Textarea
                    value={sentimentData.commentary || ""}
                    onChange={(e) => handleLocalChange(ac, "commentary", e.target.value)}
                    placeholder={sentimentData.score === "N/A" ? "Elaborate further if there are any needs around this asset class" : "Provide commentary..."}
                    disabled={disabled}
                    className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400"
                  />
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}