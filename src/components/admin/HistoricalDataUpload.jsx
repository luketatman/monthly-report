
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Upload, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { FinancialData, WinLoss, Pitch, PersonnelUpdate } from '@/entities/all';

const UploadSection = ({ title, entity, requiredHeaders, onUpload }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setMessage(null);
  };

  // Simple CSV parser
  const parseCSV = (text) => {
    const lines = text.trim().split('\n');
    const header = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length === header.length && values.some(v => v !== '')) {
        const entry = {};
        for (let j = 0; j < header.length; j++) {
          entry[header[j]] = values[j];
        }
        data.push(entry);
      }
    }
    return data;
  };

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file first.' });
      return;
    }
    setLoading(true);
    setMessage(null);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const text = e.target.result;
        const parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          throw new Error("CSV is empty or could not be parsed. Make sure it contains data and correct headers.");
        }
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(header => !Object.keys(parsedData[0]).includes(header));
        if (missingHeaders.length > 0) {
          throw new Error(`Missing required headers: ${missingHeaders.join(', ')}. Please check your CSV file.`);
        }

        // Convert numeric fields from string
        const cleanedData = parsedData.map(item => {
            const newItem = {...item};
            for(const key in newItem) {
                // Attempt to convert to Number only if it's a string that can be parsed as a number
                if (typeof newItem[key] === 'string' && newItem[key].trim() !== '' && !isNaN(Number(newItem[key]))) {
                    newItem[key] = Number(newItem[key]);
                }
            }
            return newItem;
        });

        await entity.bulkCreate(cleanedData);
        setMessage({ type: 'success', text: `Successfully uploaded ${cleanedData.length} records.` });
        setFile(null); // Clear file input after successful upload
        if (onUpload) onUpload();
      } catch (error) {
        console.error("Upload error:", error);
        setMessage({ type: 'error', text: `Upload failed: ${error.message}` });
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card className="bg-slate-700 border-slate-600">
      <CardHeader>
        <CardTitle className="text-lg text-white">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 bg-slate-700">
        <div>
          <p className="text-sm text-slate-300 mb-2">Required CSV columns:</p>
          <p className="text-xs font-mono bg-slate-800 text-white p-2 rounded break-all">{requiredHeaders.join(', ')}</p>
        </div>
        <div className="flex gap-2">
          <Input type="file" accept=".csv" onChange={handleFileChange} className="flex-grow bg-slate-800 border-slate-600 text-white" key={file ? file.name : "no-file"} />
          <Button onClick={handleUpload} disabled={loading || !file} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Upload className="w-4 h-4 mr-2" />
            {loading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'bg-green-800 border-green-600 text-white' : 'bg-red-800 border-red-600 text-white'}>
            {message.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
            <AlertTitle>{message.type === 'success' ? 'Success' : 'Error'}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default function HistoricalDataUpload({ onDataUploaded }) {
  return (
    <div className="space-y-6">
      <Card className="bg-slate-600 border-slate-500">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <FileText className="w-8 h-8 text-blue-400 mt-1" />
            <div>
              <h2 className="text-xl font-bold text-white">Upload Historical Data</h2>
              <p className="text-slate-200 mt-1">
                Upload CSV files for the past three months to populate the dashboard.
                Ensure your CSV files have the correct headers and are formatted properly before uploading.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6">
        <UploadSection
          title="Financial Data"
          entity={FinancialData}
          requiredHeaders={['region', 'market', 'month', 'monthly_revenue', 'monthly_budget', 'ytd_revenue', 'ytd_budget', 'commentary']}
          onUpload={onDataUploaded}
        />
        <UploadSection
          title="Wins & Losses"
          entity={WinLoss}
          requiredHeaders={['region', 'month', 'client', 'office_location', 'transaction_type', 'estimated_revenue', 'services_involved', 'outcome', 'reason']}
          onUpload={onDataUploaded}
        />
        <UploadSection
          title="Pitches"
          entity={Pitch}
          requiredHeaders={['region', 'month', 'client', 'office_location', 'estimated_revenue', 'type', 'origination_source', 'summary']}
          onUpload={onDataUploaded}
        />
        <UploadSection
          title="Personnel Updates"
          entity={PersonnelUpdate}
          requiredHeaders={['region', 'month', 'name', 'office_location', 'status', 'revenue_impact', 'notes']}
          onUpload={onDataUploaded}
        />
      </div>
    </div>
  );
}
