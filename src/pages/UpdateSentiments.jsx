import { useState } from 'react';
import { MonthlySubmission } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const sentimentData = {
  "South": {
    office: { score: 6.0, commentary: "Improving but still cautious; tenants show flight-to-quality while large commitments take longer." },
    retail: { score: 7.2, commentary: "Strong demand driven by Sun Belt population growth; grocery-anchored and small-format retail performing well." },
    healthcare: { score: 7.0, commentary: "Broad, stable demand across markets; continues to be a reliable growth sector." },
    industrial: { score: 6.0, commentary: "Steady fundamentals; activity solid but no longer at the previous peak." },
    multifamily: { score: 6.0, commentary: "Balanced supply and demand; steady occupancy and modest rent growth." },
    capital_markets: { score: 6.0, commentary: "Cautious but stable; investors remain active though selective." },
    other: { score: 6.0, commentary: "Sentiment moderate; no major swings across niche sectors." }
  },
  "Central": {
    office: { score: 6.2, commentary: "Stable with some downsizing pressure; suburban markets generally outperform CBDs." },
    retail: { score: 6.8, commentary: "Healthy in key residential corridors; rent growth and occupancy remain strong." },
    healthcare: { score: 7.2, commentary: "Region-wide strength; healthcare construction and demand remain high." },
    industrial: { score: 7.0, commentary: "Robust fundamentals; solid demand for mid-sized space." },
    multifamily: { score: 6.5, commentary: "Generally strong, with only mild softening in a few submarkets." },
    capital_markets: { score: 6.0, commentary: "Improving gradually as investors adapt to financing conditions." },
    other: { score: 5.0, commentary: "Moderate activity; not a major driver of regional performance." }
  },
  "Northeast": {
    office: { score: 5.4, commentary: "Slowly stabilizing in some metros (e.g., NYC) but many submarkets still face high vacancies and downsizing." },
    retail: { score: 5.0, commentary: "Mixed performance: high-street corridors solid, urban cores weaker." },
    healthcare: { score: 6.0, commentary: "Stable and resilient; steady demand across markets." },
    industrial: { score: 6.1, commentary: "Reasonably healthy fundamentals; steady but not exceptional growth." },
    multifamily: { score: 6.5, commentary: "Stronger performer; healthy demand with improving occupancy and rent trends." },
    capital_markets: { score: 4.3, commentary: "Weakest segment; investor caution and delayed transactions continue." },
    other: { score: 5.0, commentary: "Sentiment modest; niche sectors hold steady without major growth." }
  },
  "West": {
    office: { score: 5.0, commentary: "Uneven recovery: NorCal lifted by AI/tech demand, but Phoenix and Denver remain soft; flight-to-quality dominates." },
    retail: { score: 6.0, commentary: "Broadly positive; big-box and grocery-anchored demand strong, restaurant churn continues in some metros." },
    healthcare: { score: 6.4, commentary: "Consistently strong across sub-markets; demographics support long-term demand." },
    industrial: { score: 6.2, commentary: "Healthy fundamentals; Phoenix robust, SoCal and Las Vegas steady though tariffs pressure port activity." },
    multifamily: { score: 4.7, commentary: "Weakest performer; debt costs and oversupply suppress sales despite long-term demographic appeal." },
    capital_markets: { score: 5.8, commentary: "Cautious optimism; foreign capital returning in SoCal but overall volumes still below pre-rate-hike levels." },
    other: { score: 7.0, commentary: "Bright spot: strong demand for data centers, life-science, and flex space; innovation sectors driving growth." }
  }
};

export default function UpdateSentiments() {
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
  const [message, setMessage] = useState('');

  const handleUpdate = async () => {
    setStatus('processing');
    setMessage('');
    
    try {
      const regionsToUpdate = Object.keys(sentimentData);
      const updatePromises = [];
      
      const existingSubmissions = await MonthlySubmission.filter({ month: '2025-08' });

      for (const region of regionsToUpdate) {
        const existing = existingSubmissions.find(s => s.region === region);
        const sentimentPayload = { asset_class_sentiment: sentimentData[region] };

        if (existing) {
          // If a submission exists, update it
          updatePromises.push(
            MonthlySubmission.update(existing.id, sentimentPayload)
          );
        } else {
          // If no submission exists, create a new one
          const newSubmissionData = {
            region: region,
            managing_director: `system-generated@harryai.com`,
            month: '2025-08',
            status: 'draft',
            ...sentimentPayload,
          };
          updatePromises.push(
            MonthlySubmission.create(newSubmissionData)
          );
        }
      }
      
      await Promise.all(updatePromises);

      setStatus('success');
      setMessage(`Successfully created or updated sentiment scores for the following regions: ${regionsToUpdate.join(', ')}.`);

    } catch (error) {
      setStatus('error');
      setMessage(error.message || "An unknown error occurred during the update process.");
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader>
          <CardTitle>Bulk Update August Sentiments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-slate-600">
            Click the button below to automatically update the asset class sentiment scores for all regions based on the data you provided for August 2025. This is a one-time action.
          </p>
          
          <Button 
            onClick={handleUpdate} 
            disabled={status === 'processing' || status === 'success'}
            className="w-full"
          >
            {status === 'processing' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {status === 'idle' && 'Start Update'}
            {status === 'processing' && 'Updating...'}
            {status === 'success' && 'Update Complete'}
            {status === 'error' && 'Retry Update'}
          </Button>

          {status === 'success' && (
            <Alert variant="default" className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success!</AlertTitle>
              <AlertDescription className="text-green-700">
                {message} You can now navigate away from this page.
              </AlertDescription>
            </Alert>
          )}
          {status === 'error' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}