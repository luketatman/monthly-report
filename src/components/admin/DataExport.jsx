import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, FileText, Database, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import { WinLoss, Pitch, PersonnelUpdate } from '@/entities/all';

export default function DataExport({ submissions, officeSubmissions, financialData, regions }) {
  const [exportType, setExportType] = useState('submissions');
  const [exportFormat, setExportFormat] = useState('csv');
  
  // PDF Export State
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const handleExport = () => {
    let data = [];
    let filename = '';

    switch (exportType) {
      case 'submissions':
        data = submissions;
        filename = 'monthly_submissions';
        break;
      case 'financial':
        data = financialData;
        filename = 'financial_data';
        break;
      case 'regions':
        data = regions;
        filename = 'regions';
        break;
      default:
        return;
    }

    if (exportFormat === 'csv') {
      exportToCSV(data, filename);
    } else {
      exportToJSON(data, filename);
    }
  };

  const exportToCSV = (data, filename) => {
    if (data.length === 0) return;

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => {
          const value = row[header];
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    downloadFile(csvContent, `${filename}.csv`, 'text/csv');
  };

  const exportToJSON = (data, filename) => {
    const jsonContent = JSON.stringify(data, null, 2);
    downloadFile(jsonContent, `${filename}.json`, 'application/json');
  };

  const downloadFile = (content, filename, contentType) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePDFExport = async () => {
    if (!selectedRegion || !selectedMonth) return;
    
    const submission = submissions.find(
      s => s.region === selectedRegion && s.month === selectedMonth
    );

    if (!submission) {
      alert('No submission found for the selected region and month.');
      return;
    }

    await generatePDF(submission);
  };

  const generatePDF = async (submission) => {
    // Open window FIRST to avoid popup blocker
    const printWindow = window.open('', '_blank');
    
    if (!printWindow) {
      alert('Please allow popups for this site to generate PDF reports.');
      return;
    }
    
    // Show loading message
    printWindow.document.write('<html><body><h2>Generating report...</h2></body></html>');
    
    // Fetch all office submissions for this region and month (only submitted)
    const officeSubmissionsData = officeSubmissions.filter(
      os => os.region === submission.region && 
            os.month === submission.month && 
            os.status === 'submitted'
    ).sort((a, b) => a.market.localeCompare(b.market));
    
    // Fetch financial data for these offices
    const officeFinancials = financialData.filter(
      fd => fd.region === submission.region && fd.month === submission.month
    );
    
    // Fetch aggregated data for the region
    const regionWinLosses = await WinLoss.filter({
      region: submission.region,
      month: submission.month
    });
    
    const regionPitches = await Pitch.filter({
      region: submission.region,
      month: submission.month
    });
    
    const regionPersonnel = await PersonnelUpdate.filter({
      region: submission.region,
      month: submission.month
    });
    
    // Properly parse YYYY-MM format to avoid timezone issues
    const [year, month] = submission.month ? submission.month.split('-').map(Number) : [0, 0];
    const monthLabel = year && month ? format(new Date(year, month - 1, 1), 'MMMM yyyy') : 'Unknown';
    
    // Helper function to format currency
    const formatCurrency = (value) => {
      if (!value && value !== 0) return '$0';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value);
    };
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${submission.region} Region - ${monthLabel} Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 1000px;
            margin: 0 auto;
            color: #1e293b;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #1e40af;
            margin: 0 0 10px 0;
          }
          .header .subtitle {
            color: #64748b;
            font-size: 18px;
          }
          .section {
            margin-bottom: 30px;
            page-break-inside: avoid;
          }
          .section-title {
            background: #eff6ff;
            padding: 10px 15px;
            border-left: 4px solid #2563eb;
            font-weight: bold;
            font-size: 16px;
            color: #1e40af;
            margin-bottom: 15px;
          }
          .office-title {
            background: #f8fafc;
            padding: 10px 15px;
            border-left: 4px solid #64748b;
            font-weight: bold;
            font-size: 15px;
            color: #475569;
            margin: 20px 0 15px 0;
          }
          .field {
            margin-bottom: 15px;
          }
          .field-label {
            font-weight: 600;
            color: #475569;
            margin-bottom: 5px;
          }
          .field-value {
            color: #1e293b;
            line-height: 1.6;
            white-space: pre-wrap;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 15px;
          }
          .grid-4 {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 15px;
          }
          .sentiment-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
          }
          .sentiment-item {
            background: #f8fafc;
            padding: 10px;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .sentiment-score {
            font-size: 20px;
            font-weight: bold;
            color: #2563eb;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 13px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f1f5f9;
            font-weight: 600;
            color: #475569;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e2e8f0;
            text-align: center;
            color: #64748b;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Regional Monthly Business Review</h1>
          <div class="subtitle">${submission.region} Region - ${monthLabel}</div>
          <div class="subtitle" style="margin-top: 10px; font-size: 14px;">
            Status: <strong>${submission.status === 'submitted' ? 'Submitted' : 'Draft'}</strong>
            ${submission.submitted_at ? ` | Submitted: ${format(new Date(submission.submitted_at), 'MMM d, yyyy h:mm a')}` : ''}
          </div>
        </div>

        <div class="no-print" style="text-align: center; margin-bottom: 20px;">
          <button onclick="window.print()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
            Print / Save as PDF
          </button>
          <button onclick="window.close()" style="background: #64748b; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 10px;">
            Close
          </button>
        </div>

        <!-- RMD Regional Overview -->
        ${submission.rmd_regional_commentary ? `
        <div class="section">
          <div class="section-title">RMD Regional Overview</div>
          <div class="field">
            <div class="field-value">${submission.rmd_regional_commentary}</div>
          </div>
        </div>
        ` : ''}

        ${submission.rmd_ytd_year_end_commentary ? `
        <div class="section">
          <div class="section-title">RMD YTD Summary and Year-End Outlook</div>
          <div class="field">
            <div class="field-value">${submission.rmd_ytd_year_end_commentary}</div>
          </div>
        </div>
        ` : ''}

        <!-- Office Breakdown -->
        ${officeSubmissionsData.length > 0 ? `
        <div class="section">
          <div class="section-title">Office Performance Breakdown</div>
          ${officeSubmissionsData.map(office => {
            const officeFinancial = officeFinancials.find(f => f.market === office.market);
            return `
              <div class="office-title">${office.market} Office</div>
              
              ${officeFinancial ? `
              <div class="field">
                <div class="field-label">Financial Performance</div>
                <div class="grid-4">
                  <div>
                    <div style="font-size: 11px; color: #64748b;">Monthly Revenue</div>
                    <div style="font-weight: 600; color: #16a34a;">${formatCurrency(officeFinancial.monthly_revenue)}</div>
                  </div>
                  <div>
                    <div style="font-size: 11px; color: #64748b;">Monthly Budget</div>
                    <div style="font-weight: 600;">${formatCurrency(officeFinancial.monthly_budget)}</div>
                  </div>
                  <div>
                    <div style="font-size: 11px; color: #64748b;">YTD Revenue</div>
                    <div style="font-weight: 600; color: #16a34a;">${formatCurrency(officeFinancial.ytd_revenue)}</div>
                  </div>
                  <div>
                    <div style="font-size: 11px; color: #64748b;">YTD Budget</div>
                    <div style="font-weight: 600;">${formatCurrency(officeFinancial.ytd_budget)}</div>
                  </div>
                </div>
              </div>
              
              ${officeFinancial.commentary ? `
              <div class="field">
                <div class="field-label">Financial Commentary</div>
                <div class="field-value">${officeFinancial.commentary}</div>
              </div>
              ` : ''}
              
              ${officeFinancial.year_end_forecast ? `
              <div class="field">
                <div class="field-label">Year-End Forecast</div>
                <div class="grid">
                  <div>
                    <div style="font-size: 11px; color: #64748b;">Forecast</div>
                    <div style="font-weight: 600;">${formatCurrency(officeFinancial.year_end_forecast * 1000000)}</div>
                  </div>
                  <div>
                    <div style="font-size: 11px; color: #64748b;">Outlook</div>
                    <div style="font-size: 13px;">${officeFinancial.year_end_outlook || 'N/A'}</div>
                  </div>
                </div>
                ${officeFinancial.forecast_commentary ? `
                <div class="field-value" style="margin-top: 10px;">${officeFinancial.forecast_commentary}</div>
                ` : ''}
              </div>
              ` : ''}
              ` : '<div class="field-value" style="color: #64748b; font-style: italic;">No financial data available</div>'}
              
              ${office.asset_class_sentiment && Object.keys(office.asset_class_sentiment).length > 0 ? `
              <div class="field">
                <div class="field-label">Asset Class Sentiment</div>
                <div class="sentiment-grid">
                  ${Object.entries(office.asset_class_sentiment).map(([assetClass, data]) => `
                    <div class="sentiment-item">
                      <div style="font-weight: 600; color: #475569; margin-bottom: 5px; text-transform: capitalize; font-size: 12px;">
                        ${assetClass.replace(/_/g, ' ')}
                      </div>
                      <div class="sentiment-score">${data?.score || 'N/A'}</div>
                      ${data?.commentary ? `<div style="margin-top: 6px; font-size: 11px; color: #64748b;">${data.commentary}</div>` : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
              ` : ''}
              
              ${office.overall_sentiment ? `
              <div class="field">
                <div class="field-label">Overall Sentiment</div>
                <div style="font-size: 20px; font-weight: bold; color: #2563eb; margin-bottom: 5px;">
                  ${office.overall_sentiment.score || 'N/A'} / 10
                </div>
                ${office.overall_sentiment.commentary ? `
                <div class="field-value">${office.overall_sentiment.commentary}</div>
                ` : ''}
              </div>
              ` : ''}
            `;
          }).join('')}
        </div>
        ` : ''}

        <!-- Regional Activity Summary -->
        ${regionWinLosses.length > 0 || regionPitches.length > 0 || regionPersonnel.length > 0 ? `
        <div class="section">
          <div class="section-title">Regional Business Activity Summary</div>
          
          ${regionWinLosses.length > 0 ? `
          <div class="field">
            <div class="field-label">Wins & Losses</div>
            <table>
              <thead>
                <tr>
                  <th>Office</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Asset Type</th>
                  <th>Outcome</th>
                  <th>Revenue Impact</th>
                </tr>
              </thead>
              <tbody>
                ${regionWinLosses.map(wl => `
                  <tr>
                    <td>${wl.office_location || 'N/A'}</td>
                    <td>${wl.client || 'N/A'}</td>
                    <td>${wl.transaction_type || 'N/A'}</td>
                    <td>${wl.asset_type || 'N/A'}</td>
                    <td style="font-weight: 600; color: ${wl.outcome === 'Win' ? '#16a34a' : '#dc2626'};">${wl.outcome}</td>
                    <td>${formatCurrency(wl.budget_year_revenue_impact)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${regionPitches.length > 0 ? `
          <div class="field">
            <div class="field-label">Notable Pitches</div>
            <table>
              <thead>
                <tr>
                  <th>Office</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Stage</th>
                  <th>Revenue Impact</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${regionPitches.map(pitch => `
                  <tr>
                    <td>${pitch.office_location || 'N/A'}</td>
                    <td>${pitch.client || 'N/A'}</td>
                    <td>${pitch.transaction_type || 'N/A'}</td>
                    <td>${pitch.stage || 'N/A'}</td>
                    <td>${formatCurrency(pitch.budget_year_revenue_impact)}</td>
                    <td>${pitch.summary || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
          
          ${regionPersonnel.length > 0 ? `
          <div class="field">
            <div class="field-label">Personnel Updates</div>
            <table>
              <thead>
                <tr>
                  <th>Office</th>
                  <th>Name</th>
                  <th>Title/Specialty</th>
                  <th>Status</th>
                  <th>Revenue Impact</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${regionPersonnel.map(person => `
                  <tr>
                    <td>${person.office_location || 'N/A'}</td>
                    <td>${person.name || 'N/A'}</td>
                    <td>${person.title_specialty || 'N/A'}</td>
                    <td style="font-weight: 600; color: ${person.status === 'Hired' ? '#16a34a' : '#dc2626'};">${person.status}</td>
                    <td>${formatCurrency(person.revenue_impact)}</td>
                    <td>${person.notes || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          ` : ''}
        </div>
        ` : ''}

        <div class="footer">
          <p>Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
          <p>Avison Young - Monthly Business Review System</p>
        </div>
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
  };

  // Get unique months from BOTH RMD submissions and Office submissions
  const availableMonths = [...new Set([
    ...submissions.map(s => s.month),
    ...(officeSubmissions || []).map(s => s.month)
  ])].filter(Boolean).sort().reverse();

  // Get regions that have RMD submissions
  const regionsWithSubmissions = [...new Set(submissions.map(s => s.region))].filter(Boolean).sort();

  return (
    <div className="space-y-6">
      {/* PDF Export Section */}
      <Card className="shadow-lg bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <FileDown className="text-green-400" />
            <span className="text-white">Export RMD Submission as PDF</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 bg-slate-700">
          <div className="bg-slate-600 border border-slate-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-green-400" />
              <h3 className="font-semibold text-white">PDF Report Generator</h3>
            </div>
            <p className="text-sm text-slate-200">
              Generate a comprehensive regional report including RMD commentary, all office submissions, and aggregated business activity.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Select Region</label>
              <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Choose region..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  {regionsWithSubmissions.map(region => (
                    <SelectItem key={region} value={region} className="text-white">
                      {region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

             <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Select Month</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Choose month..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {availableMonths.map(month => {
                        const [year, monthNum] = month.split('-').map(Number);
                        const displayMonth = format(new Date(year, monthNum - 1, 1), 'MMMM yyyy');
                        return (
                          <SelectItem key={month} value={month} className="text-white">
                            {displayMonth}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
          </div>

          <Button 
            onClick={handlePDFExport} 
            disabled={!selectedRegion || !selectedMonth}
            className="w-full bg-green-600 hover:bg-green-700 text-white disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
            <FileDown className="w-4 h-4 mr-2" />
            Generate PDF Report
          </Button>
        </CardContent>
      </Card>

      {/* Original Export Section */}
      <Card className="shadow-lg bg-slate-700 border-slate-600">
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <Database className="text-blue-400" />
            <span className="text-white">Bulk Data Export</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 bg-slate-700">
          <div className="bg-slate-600 border border-slate-500 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-blue-400" />
              <h3 className="font-semibold text-white">Export Options</h3>
            </div>
            <p className="text-sm text-slate-200">
              Export your data for analysis in external tools or for backup purposes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Data Type</label>
              <Select value={exportType} onValueChange={setExportType}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select data type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="submissions" className="text-white">Monthly Submissions</SelectItem>
                  <SelectItem value="financial" className="text-white">Financial Data</SelectItem>
                  <SelectItem value="regions" className="text-white">Regions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Format</label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                  <SelectValue placeholder="Select format" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-600">
                  <SelectItem value="csv" className="text-white">CSV</SelectItem>
                  <SelectItem value="json" className="text-white">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleExport} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>

          <div className="text-sm text-slate-300">
            <p><strong>Current Data Counts:</strong></p>
            <ul className="mt-1 space-y-1">
              <li>• Monthly Submissions: {submissions.length}</li>
              <li>• Financial Records: {financialData.length}</li>
              <li>• Regions: {regions.length}</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}