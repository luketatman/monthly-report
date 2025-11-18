import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, FileText, Building } from "lucide-react";

export default function OfficeSubmissionsReview({ officeSubmissions, markets, loading }) {
  const calculateOfficeProgress = (submission) => {
    if (!submission) return 0;
    
    // If the submission is marked as submitted, it's automatically 100% complete
    if (submission.status === 'submitted') {
      return 100;
    }
    
    // For draft submissions, calculate based on completion of sections
    let completed = 0;
    const total = 3; // financial commentary, asset sentiment, overall sentiment

    if (submission.financial_commentary && submission.financial_commentary.trim() !== '') {
      completed++;
    }
    // Check if asset_class_sentiment is an object and has at least one entry with score > 0
    if (submission.asset_class_sentiment && typeof submission.asset_class_sentiment === 'object' && Object.values(submission.asset_class_sentiment).some(ac => ac && typeof ac === 'object' && ac.score !== undefined && ac.score > 0)) {
      completed++;
    }
    if (submission.overall_sentiment && submission.overall_sentiment.score !== undefined && submission.overall_sentiment.score > 0) {
      completed++;
    }
    return Math.round((completed / total) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-700">
            <FileText className="w-5 h-5" />
            Office Submissions Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">Loading office submissions...</p>
        </CardContent>
      </Card>
    );
  }

  const submittedCount = officeSubmissions.filter(s => s.status === 'submitted').length;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-slate-900">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Office Submissions Review</span>
          </div>
          <Badge variant={submittedCount > 0 ? "default" : "secondary"}>
            {submittedCount} / {markets.length} Submitted
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {markets.length === 0 ? (
          <p className="text-center text-slate-500 py-4">No offices found for this region.</p>
        ) : (
          <div className="space-y-4">
            {markets.map(marketName => {
              const submission = officeSubmissions.find(s => s.market === marketName);
              const isSubmitted = submission && submission.status === 'submitted';
              const progress = calculateOfficeProgress(submission);

              return (
                <div key={marketName} className="p-4 border rounded-lg bg-slate-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {isSubmitted ? (
                      <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    )}
                    <div>
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-500" />
                        {marketName}
                      </h4>
                      <p className={`text-sm ${isSubmitted ? 'text-green-600' : 'text-red-600'}`}>
                        {isSubmitted ? 'Submitted' : 'Not Submitted'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full sm:w-48">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-slate-600">Progress</span>
                      <span className="text-xs font-bold text-slate-700">{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}