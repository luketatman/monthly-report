import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Smile, MessageSquare, Building, Info } from "lucide-react";

function debounce(func, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), delay);
  };
}

export default function OverallSentiment({ submission, onUpdate, disabled, officeSubmissions = [] }) {
  const [overallSentiment, setOverallSentiment] = useState({ score: 5, commentary: "" });
  
  // Store callback in ref
  const onUpdateRef = useRef(onUpdate);
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  // Initialize ONCE based on submission ID
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

  const handleSentimentChange = (field, value) => {
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

  const relevantOfficeSubmissions = officeSubmissions.filter(
    (os) => os.overall_sentiment?.score || os.overall_sentiment?.commentary
  );

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
              onValueChange={(value) => handleSentimentChange("score", value[0])}
              min={1} max={10} step={1}
              disabled={disabled}
            />
            <div className={`font-bold text-2xl w-12 text-center ${getSentimentColor(score)}`}>
              {score}
            </div>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <Info className="w-3 h-3 text-blue-500" />
            <span className="text-xs text-blue-600">Pre-filled average from office data</span>
          </div>
        </div>
        <div className="p-4 border rounded-lg bg-slate-50">
          <label className="text-sm font-medium text-slate-900 mb-2 block">Overall Commentary</label>
          <Textarea
            value={overallSentiment.commentary || ""}
            onChange={(e) => handleSentimentChange("commentary", e.target.value)}
            placeholder="Summarize your overall market sentiment..."
            disabled={disabled}
            className="mt-2 bg-white border-slate-300 text-slate-900"
          />
        </div>

        {relevantOfficeSubmissions.length > 0 && (
          <Accordion type="single" collapsible className="w-full">
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
                          Score: {os.overall_sentiment.score}
                        </span>
                      </div>
                      <p className="text-slate-600 mt-1 pl-1">
                        <em className="flex items-start gap-1.5">
                          <MessageSquare size={12} className="mt-0.5 shrink-0" />
                          <span>{os.overall_sentiment.commentary || "No commentary."}</span>
                        </em>
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}