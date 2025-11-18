import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Smile } from "lucide-react";

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function OfficeOverallSentiment({ submission, onUpdate, disabled }) {
  const [overallSentiment, setOverallSentiment] = useState({ score: 5, commentary: "" });

  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Initialize ONCE
  useEffect(() => {
    setOverallSentiment(submission?.overall_sentiment || { score: 5, commentary: "" });
  }, [submission?.id]);

  // Debounced save
  const debouncedSave = useRef(
    debounce((value) => {
      if (onUpdateRef.current) {
        onUpdateRef.current(value);
      }
    }, 1000)
  ).current;

  const handleSentimentUpdate = (field, value) => {
    setOverallSentiment(prev => {
      const updated = { ...prev, [field]: value };
      debouncedSave(updated);
      return updated;
    });
  };

  const score = overallSentiment.score || 5;

  const getSentimentColor = (score) => {
    if (score <= 3) return 'text-red-500';
    if (score <= 5) return 'text-orange-500';
    if (score <= 7) return 'text-yellow-500';
    return 'text-green-500';
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-3">
          <Smile className="text-indigo-600" />
          <span className="text-slate-900">7. Overall Sentiment</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 border rounded-lg bg-slate-50">
          <label className="text-sm font-medium text-slate-900 mb-2 block">Overall Sentiment Score</label>
          <div className="flex items-center gap-4 mt-2">
            <Slider
              value={[score]}
              onValueChange={(value) => handleSentimentUpdate("score", value[0])}
              min={1} max={10} step={1}
              disabled={disabled}
              className="bg-slate-900 relative flex w-full touch-none select-none items-center [&>span]:bg-slate-300 [&>span]:border-slate-400"
            />
            <div className={`font-bold text-2xl w-12 text-center ${getSentimentColor(score)}`}>
              {score}
            </div>
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-slate-50">
          <label className="text-sm font-medium text-slate-900 mb-2 block">Overall Commentary</label>
          <Textarea
            value={overallSentiment.commentary || ""}
            onChange={(e) => handleSentimentUpdate("commentary", e.target.value)}
            placeholder="Summarize your overall market sentiment..."
            disabled={disabled}
            className="bg-slate-800 text-slate-50 border-slate-300 placeholder-slate-400 mt-2"
          />
        </div>
      </CardContent>
    </Card>
  );
}