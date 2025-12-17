import React, { useState, useEffect } from "react";
import { FinancialData, Region } from "@/entities/all";
import { ExtractDataFromUploadedFile, UploadFile } from "@/integrations/Core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Schema for bulk financial upload - region and office (market) are now included in the file
const financialDataSchema = {
    type: "array",
    items: {
        type: "object",
        properties: {
            region: { type: "string" },
            office: { type: "string" },
            monthly_revenue: { type: "number" },
            monthly_budget: { type: "number" },
            monthly_reforecast: { type: "number" },
            ytd_revenue: { type: "number" },
            ytd_budget: { type: "number" }
        },
        required: ["region", "office", "monthly_revenue", "monthly_budget", "ytd_revenue", "ytd_budget"]
    }
};

export default function FinancialUpload({ onDataUploaded }) {
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataToUpload, setDataToUpload] = useState([]);
  const [alert, setAlert] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState("");

  // Generate month options (current month and 11 months back)
  const monthOptions = React.useMemo(() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    setAlert(null);
    setDataToUpload([]); // Clear previous preview data

    if (!selectedFile) {
      return;
    }

    setProcessing(true);

    try {
      const { file_url } = await UploadFile({ file: selectedFile });

      const extractResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: financialDataSchema
      });

      if (extractResult.status === 'success' && extractResult.output) {
        if (extractResult.output.length === 0) {
          setAlert({ type: 'error', message: 'No data extracted from the file. Please check the file content and format.' });
        } else {
          setDataToUpload(extractResult.output);
          setAlert({ type: 'success', message: `${extractResult.output.length} records parsed from file. Review and upload.` });
        }
      } else {
        throw new Error(extractResult.details || 'Failed to extract data from file');
      }
    } catch (error) {
      console.error('File processing error:', error);
      setAlert({ type: 'error', message: `File processing failed: ${error.message}` });
      setDataToUpload([]);
      setFile(null); // Clear the file input on error
      if (document.getElementById('financial-file')) {
        document.getElementById('financial-file').value = '';
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (dataToUpload.length === 0 || !selectedMonth) {
      setAlert({ type: 'error', message: 'No data to upload or month not selected.' });
      return;
    }
    setUploading(true);
    setAlert(null);

    try {
      let createdCount = 0;
      let updatedCount = 0;

      // Process each row from the file
      for (const item of dataToUpload) {
        const market = item.office; // "Office" column in the CSV maps to market in our schema
        const region = item.region;

        // Check if a record already exists for this region/market/month
        const existingRecords = await FinancialData.filter({ 
          region, 
          market, 
          month: selectedMonth 
        });

        const recordData = {
          region,
          market,
          month: selectedMonth,
          monthly_revenue: parseFloat(item.monthly_revenue) || 0,
          monthly_budget: parseFloat(item.monthly_budget) || 0,
          monthly_reforecast: parseFloat(item.monthly_reforecast) || 0,
          ytd_revenue: parseFloat(item.ytd_revenue) || 0,
          ytd_budget: parseFloat(item.ytd_budget) || 0,
        };

        if (existingRecords.length > 0) {
          // Update existing record
          await FinancialData.update(existingRecords[0].id, recordData);
          updatedCount++;
        } else {
          // Create new record
          await FinancialData.create(recordData);
          createdCount++;
        }
      }

      setAlert({ 
        type: 'success', 
        message: `Successfully processed ${dataToUpload.length} records for ${selectedMonth} (${createdCount} created, ${updatedCount} updated)!` 
      });
      setDataToUpload([]);
      setFile(null);
      document.getElementById('financial-file').value = '';
      if (onDataUploaded) {
        onDataUploaded();
      }
    } catch (error) {
      console.error('Upload error:', error);
      setAlert({ type: 'error', message: `Upload failed: ${error.message}` });
    } finally {
      setUploading(false);
    }
  };

  const resetState = () => {
    setFile(null);
    setDataToUpload([]);
    setAlert(null);
    setProcessing(false);
    setUploading(false);
    if(document.getElementById('financial-file')) {
      document.getElementById('financial-file').value = '';
    }
  };

  return (
    <Card className="bg-slate-700 shadow-md">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Monthly Financials
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 p-4 rounded-lg bg-slate-800 border border-slate-600">
          <div className="space-y-2">
            <Label htmlFor="month-select" className="text-white">1. Select Month</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={processing || uploading}>
              <SelectTrigger id="month-select" className="w-full bg-slate-600 text-white border-slate-500">
                <SelectValue placeholder="Select a month for the financial data..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 text-white border-slate-600">
                {monthOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="financial-file" className="text-white">2. Upload Financial File</Label>
            <Input
              id="financial-file"
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={!selectedMonth || processing || uploading}
              className="bg-slate-600 border-slate-500 text-white file:text-white disabled:opacity-50"
            />
            <p className="text-xs text-slate-400">
              Required columns: Region, Office, Monthly_revenue, Monthly_budget, monthly_reforecast, Ytd_revenue, Ytd_budget
            </p>
          </div>
        </div>

        {processing && (
          <div className="flex items-center justify-center p-4 bg-slate-800 rounded-lg text-white">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span className="text-lg">Processing file...</span>
          </div>
        )}

        {alert && (
          <Alert variant={alert.type === 'success' ? 'default' : 'destructive'} className={alert.type === 'success' ? 'bg-green-900/50 text-green-200 border-green-700' : 'bg-red-900/50 text-red-200 border-red-700'}>
            {alert.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        )}

        {dataToUpload.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Preview for {monthOptions.find(m => m.value === selectedMonth)?.label || selectedMonth}</h3>
            <div className="max-h-96 overflow-y-auto border border-slate-600 rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-800">
                  <TableRow>
                    <TableHead className="text-white">Region</TableHead>
                    <TableHead className="text-white">Office</TableHead>
                    <TableHead className="text-white">Revenue</TableHead>
                    <TableHead className="text-white">Budget</TableHead>
                    <TableHead className="text-white">Reforecast</TableHead>
                    <TableHead className="text-white">YTD Revenue</TableHead>
                    <TableHead className="text-white">YTD Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dataToUpload.map((row, index) => (
                    <TableRow key={index} className="text-slate-300 border-slate-600">
                      <TableCell>{row.region}</TableCell>
                      <TableCell>{row.office}</TableCell>
                      <TableCell>{row.monthly_revenue}</TableCell>
                      <TableCell>{row.monthly_budget}</TableCell>
                      <TableCell>{row.monthly_reforecast}</TableCell>
                      <TableCell>{row.ytd_revenue}</TableCell>
                      <TableCell>{row.ytd_budget}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={resetState} disabled={uploading} className="bg-slate-600 hover:bg-slate-500 text-white border-slate-500">Cancel</Button>
              <Button onClick={handleUpload} disabled={uploading} className="bg-blue-600 hover:bg-blue-700 text-white">
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    Upload {dataToUpload.length} Records
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}