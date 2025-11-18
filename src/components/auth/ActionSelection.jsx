import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart, ArrowLeft } from "lucide-react";

export default function ActionSelection({ onActionSelected, onBack, selectedRole, verifiedRegion }) {
  const [isNavigating, setIsNavigating] = useState(false);

  const handleActionClick = (actionId) => {
    if (isNavigating) return; // Prevent multiple clicks
    setIsNavigating(true);
    onActionSelected(actionId);
  };

  const isMD = selectedRole === 'md';
  
  const actions = [
    {
      id: 'report',
      title: isMD ? 'Submit Office Report' : 'Submit Monthly Report',
      description: isMD ? 'Fill out and submit your office monthly report' : 'Fill out and submit your regional monthly report',
      icon: FileText,
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'dashboard',
      title: isMD ? 'View Office Dashboard' : 'View Regional Dashboard',
      description: 'Access real-time analytics and performance insights',
      icon: BarChart,
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-6">
          <CardTitle className="text-2xl font-bold text-slate-900">
            What would you like to do?
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Choose an action to continue as {selectedRole === 'md' ? 'Managing Director' : 'Regional Managing Director'}
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {actions.map((action) => (
            <Button
              key={action.id}
              onClick={() => handleActionClick(action.id)}
              disabled={isNavigating}
              className="w-full h-auto py-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 justify-start transition-colors duration-200 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
              variant="outline"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 bg-gradient-to-br ${action.color}`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <div className="text-left flex-grow">
                <div className="font-medium text-base text-slate-900">{action.title}</div>
                <div className="text-sm text-slate-500">{action.description}</div>
              </div>
              {isNavigating && (
                <div className="ml-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                </div>
              )}
            </Button>
          ))}

          <div className="text-center pt-4">
            <Button 
              variant="outline" 
              onClick={onBack} 
              disabled={isNavigating}
              className="bg-slate-100"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}