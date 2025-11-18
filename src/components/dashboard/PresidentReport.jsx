import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function PresidentReport({ 
  filters, 
  filteredData,
  allSubmissions,
  allOfficeSubmissions,
  allWinLosses,
  allPitches,
  allPersonnelUpdates 
}) {
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    
    try {
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        alert('Please allow popups for this site to generate reports.');
        setGenerating(false);
        return;
      }
      
      printWindow.document.write('<html><body><h2>Generating comprehensive national report...</h2><p>This may take a moment...</p></body></html>');

      // Get period label
      const { periodType, year, month, quarter } = filters;
      let periodLabel = '';
      if (periodType === 'monthly') {
        const monthDate = new Date(year, month - 1, 1);
        periodLabel = format(monthDate, 'MMMM yyyy');
      } else if (periodType === 'quarterly') {
        periodLabel = `Q${quarter} ${year}`;
      } else {
        periodLabel = `Year ${year}`;
      }

      // Get regions breakdown
      const regions = [...new Set(filteredData.submissions.map(s => s.region))].sort();
      
      // Calculate relevant months for filtering
      let relevantMonths = [];
      if (periodType === 'monthly') {
        relevantMonths.push(`${year}-${String(month).padStart(2, '0')}`);
      } else if (periodType === 'quarterly') {
        const startMonth = (quarter - 1) * 3 + 1;
        for (let i = 0; i < 3; i++) {
          relevantMonths.push(`${year}-${String(startMonth + i).padStart(2, '0')}`);
        }
      } else if (periodType === 'yearly') {
        for(let i = 1; i <= 12; i++) {
          relevantMonths.push(`${year}-${String(i).padStart(2, '0')}`);
        }
      }
      
      // Filter function for period
      const filterByPeriod = (item) => item.month && relevantMonths.includes(item.month);
      
      // Sorting with tiebreaker: budget_year first, then total_revenue
      const sortWithTiebreaker = (a, b) => {
        const aBudget = a.budget_year_revenue_impact || 0;
        const bBudget = b.budget_year_revenue_impact || 0;
        if (aBudget !== bBudget) return bBudget - aBudget;
        return (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0);
      };
      
      // Top 15 Wins (90-day forecast) - filtered by period
      const topWins = [...allWinLosses]
        .filter(wl => wl.outcome === 'Win' && filterByPeriod(wl))
        .sort(sortWithTiebreaker)
        .slice(0, 15);

      // Top 5 Losses - filtered by period
      const topLosses = [...allWinLosses]
        .filter(wl => wl.outcome === 'Loss' && filterByPeriod(wl))
        .sort(sortWithTiebreaker)
        .slice(0, 5);

      // Top 10 Pitches - split by stage, filtered by period
      const outForSignature = [...allPitches]
        .filter(p => p.stage === 'Out for Signature' && filterByPeriod(p))
        .sort((a, b) => (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0))
        .slice(0, 5);

      const waitingToHear = [...allPitches]
        .filter(p => p.stage === 'Waiting to Hear Back' && filterByPeriod(p))
        .sort((a, b) => (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0))
        .slice(0, 5);

      // Top 5 Hires and Departures - filtered by period
      // Sort by absolute value of revenue impact (handles negative numbers for losses)
      const topHires = [...allPersonnelUpdates]
        .filter(p => p.status === 'Hired' && filterByPeriod(p))
        .sort((a, b) => Math.abs(b.revenue_impact || 0) - Math.abs(a.revenue_impact || 0))
        .slice(0, 5);

      const topTerminations = [...allPersonnelUpdates]
        .filter(p => (p.status === 'Terminated' || p.status === 'Resigned') && filterByPeriod(p))
        .sort((a, b) => Math.abs(b.revenue_impact || 0) - Math.abs(a.revenue_impact || 0))
        .slice(0, 5);

      // Calculate aggregated financial metrics
      const totalRevenue = filteredData.financialData.reduce((sum, f) => sum + (f.monthly_revenue || 0), 0);
      const totalBudget = filteredData.financialData.reduce((sum, f) => sum + (f.monthly_budget || 0), 0);
      const totalYTDRevenue = filteredData.financialData.reduce((sum, f) => sum + (f.ytd_revenue || 0), 0);
      const totalYTDBudget = filteredData.financialData.reduce((sum, f) => sum + (f.ytd_budget || 0), 0);

      // Generate AI summaries
      const performanceSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following national brokerage performance data for ${periodLabel}, provide a concise 2-3 paragraph executive summary of overall performance:
        
Total Revenue: $${totalRevenue.toLocaleString()}
Total Budget: $${totalBudget.toLocaleString()}
YTD Revenue: $${totalYTDRevenue.toLocaleString()}
YTD Budget: $${totalYTDBudget.toLocaleString()}
Regions Reporting: ${regions.join(', ')}
Total Wins: ${topWins.length}
Total Losses: ${topLosses.length}
Active Pitches: ${allPitches.length}

Focus on: revenue performance vs budget, regional coverage, and overall business health.`,
      });

      const personnelSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following personnel data for ${periodLabel}, provide a concise 2 paragraph summary:

New Hires: ${topHires.length} (Top hire revenue impact: $${topHires[0]?.revenue_impact || 0})
Departures: ${topTerminations.length} (Top departure revenue impact: $${topTerminations[0]?.revenue_impact || 0})

Analyze the talent movement and its potential impact on business.`,
      });

      const businessDevSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following business development data for ${periodLabel}, provide a concise 2-3 paragraph analysis:

Wins: ${topWins.length} deals (Total budget year revenue: $${topWins.reduce((sum, w) => sum + (w.budget_year_revenue_impact || 0), 0).toLocaleString()})
Losses: ${topLosses.length} deals (Total budget year revenue: $${topLosses.reduce((sum, l) => sum + (l.budget_year_revenue_impact || 0), 0).toLocaleString()})
Active Pitches: ${allPitches.length} opportunities

Key wins include: ${topWins.slice(0, 3).map(w => w.client).join(', ')}
Notable losses: ${topLosses.slice(0, 3).map(l => l.client).join(', ')}

Analyze win/loss ratio, pipeline strength, and strategic implications.`,
      });

      // Calculate sentiment scores and trends with error handling
      let sentimentTrends = {};
      let sentimentDataText = 'Sentiment data being compiled from regional submissions';
      
      try {
        const assetClasses = ['office', 'retail', 'healthcare', 'industrial', 'multifamily', 'capital_markets', 'other'];
        
        const calculateSentimentAverages = (submissions) => {
          const assetScores = {};
          assetClasses.forEach(ac => {
            const scores = [];
            (submissions || []).forEach(s => {
              try {
                if (s.asset_class_sentiment?.[ac]?.score) {
                  const score = s.asset_class_sentiment[ac].score;
                  if (score !== 'N/A') {
                    const parsed = parseInt(score, 10);
                    if (!isNaN(parsed) && parsed >= 1 && parsed <= 10) {
                      scores.push(parsed);
                    }
                  }
                }
              } catch (e) { /* Skip invalid entries */ }
            });
            assetScores[ac] = scores.length > 0 
              ? scores.reduce((sum, s) => sum + s, 0) / scores.length 
              : null;
          });
          return assetScores;
        };

        const currentSentiment = calculateSentimentAverages([
          ...(filteredData.submissions || []), 
          ...(allOfficeSubmissions || []).filter(filterByPeriod)
        ]);
        
        let previousPeriodMonths = [];
        if (periodType === 'monthly') {
          const prevMonth = month === 1 ? 12 : month - 1;
          const prevYear = month === 1 ? year - 1 : year;
          previousPeriodMonths.push(`${prevYear}-${String(prevMonth).padStart(2, '0')}`);
        } else if (periodType === 'quarterly') {
          const prevQuarter = quarter === 1 ? 4 : quarter - 1;
          const prevYear = quarter === 1 ? year - 1 : year;
          const startMonth = (prevQuarter - 1) * 3 + 1;
          for (let i = 0; i < 3; i++) {
            previousPeriodMonths.push(`${prevYear}-${String(startMonth + i).padStart(2, '0')}`);
          }
        } else {
          const prevYear = year - 1;
          for (let i = 1; i <= 12; i++) {
            previousPeriodMonths.push(`${prevYear}-${String(i).padStart(2, '0')}`);
          }
        }
        
        const previousPeriodSubmissions = [
          ...(allSubmissions || []), 
          ...(allOfficeSubmissions || [])
        ].filter(s => s.month && previousPeriodMonths.includes(s.month) && s.status === 'submitted');
        
        const previousSentiment = calculateSentimentAverages(previousPeriodSubmissions);
        
        assetClasses.forEach(ac => {
          if (currentSentiment[ac] !== null && previousSentiment[ac] !== null) {
            sentimentTrends[ac] = {
              current: currentSentiment[ac],
              previous: previousSentiment[ac],
              change: currentSentiment[ac] - previousSentiment[ac]
            };
          }
        });

        if (Object.keys(sentimentTrends).length > 0) {
          sentimentDataText = Object.entries(sentimentTrends)
            .map(([asset, data]) => 
              `${asset.replace(/_/g, ' ')}: ${data.current.toFixed(1)}/10 (${data.change >= 0 ? '+' : ''}${data.change.toFixed(1)})`
            ).join(', ');
        }
      } catch (error) {
        console.error('Sentiment calculation error:', error);
      }

      const marketSentimentSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on sentiment data from ${regions.length} regions for ${periodLabel}, provide a 2-3 paragraph market outlook:

${sentimentDataText}

Analyze market sentiment, asset class trends, and forward-looking outlook.`,
      });

      // Helper function
      const formatCurrency = (value) => {
        if (!value && value !== 0) return '$0';
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(value);
      };

      // Generate HTML
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>President's Report - ${periodLabel}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 30px;
              max-width: 1200px;
              margin: 0 auto;
              color: #1e293b;
              font-size: 12px;
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
              font-size: 28px;
            }
            .section {
              margin-bottom: 25px;
              page-break-inside: avoid;
            }
            .section-title {
              background: #eff6ff;
              padding: 8px 12px;
              border-left: 4px solid #2563eb;
              font-weight: bold;
              font-size: 14px;
              color: #1e40af;
              margin-bottom: 12px;
            }
            .region-title {
              background: #f8fafc;
              padding: 6px 10px;
              border-left: 3px solid #64748b;
              font-weight: bold;
              font-size: 13px;
              color: #475569;
              margin: 15px 0 10px 0;
            }
            .grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 10px;
              margin-bottom: 10px;
            }
            .metric-box {
              background: #f8fafc;
              padding: 10px;
              border-radius: 6px;
              border: 1px solid #e2e8f0;
            }
            .metric-label {
              font-size: 10px;
              color: #64748b;
              margin-bottom: 4px;
            }
            .metric-value {
              font-size: 16px;
              font-weight: bold;
              color: #1e293b;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 8px;
              font-size: 11px;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 6px;
              text-align: left;
            }
            th {
              background: #f1f5f9;
              font-weight: 600;
              color: #475569;
              font-size: 11px;
            }
            .ai-summary {
              background: #f0fdf4;
              border-left: 3px solid #16a34a;
              padding: 12px;
              margin: 10px 0;
              line-height: 1.6;
            }
            .footer {
              margin-top: 30px;
              padding-top: 15px;
              border-top: 2px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 10px;
            }
            @media print {
              body { padding: 15px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>President's National Business Review</h1>
            <div style="color: #64748b; font-size: 16px; margin-top: 5px;">${periodLabel}</div>
            <div style="color: #64748b; font-size: 12px; margin-top: 8px;">US Brokerage Performance Summary</div>
          </div>

          <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
              Print / Save as PDF
            </button>
            <button onclick="window.close()" style="background: #64748b; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; margin-left: 10px;">
              Close
            </button>
          </div>

          <!-- AI Performance Summary -->
          <div class="section">
            <div class="section-title">Executive Summary - Period Performance</div>
            <div class="ai-summary">
              ${performanceSummary}
            </div>
          </div>

          <!-- Regional Financial Breakdown -->
          <div class="section">
            <div class="section-title">Regional Financial Overview</div>
            ${regions.map(regionName => {
              const regionFinancials = filteredData.financialData.filter(f => f.region === regionName);
              const regionRevenue = regionFinancials.reduce((sum, f) => sum + (f.monthly_revenue || 0), 0);
              const regionBudget = regionFinancials.reduce((sum, f) => sum + (f.monthly_budget || 0), 0);
              const regionReforecast = regionFinancials.reduce((sum, f) => sum + (f.monthly_reforecast || 0), 0);
              const regionYTDRevenue = regionFinancials.reduce((sum, f) => sum + (f.ytd_revenue || 0), 0);
              const regionYTDBudget = regionFinancials.reduce((sum, f) => sum + (f.ytd_budget || 0), 0);
              
              const pctToBudget = regionBudget > 0 ? ((regionRevenue / regionBudget) * 100) : 0;
              const pctToReforecast = regionReforecast > 0 ? ((regionRevenue / regionReforecast) * 100) : 0;
              const ytdPctToBudget = regionYTDBudget > 0 ? ((regionYTDRevenue / regionYTDBudget) * 100) : 0;
              
              const budgetColor = pctToBudget >= 100 ? '#16a34a' : pctToBudget >= 90 ? '#f59e0b' : '#dc2626';
              const ytdColor = ytdPctToBudget >= 100 ? '#16a34a' : ytdPctToBudget >= 90 ? '#f59e0b' : '#dc2626';
              
              return `
                <div class="region-title">${regionName} Region</div>
                <div class="grid">
                  <div class="metric-box">
                    <div class="metric-label">Period Revenue</div>
                    <div class="metric-value" style="color: #16a34a;">${formatCurrency(regionRevenue)}</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">Period Budget</div>
                    <div class="metric-value">${formatCurrency(regionBudget)}</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">% to Budget</div>
                    <div class="metric-value" style="color: ${budgetColor};">${pctToBudget.toFixed(1)}%</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">% to Reforecast</div>
                    <div class="metric-value">${pctToReforecast > 0 ? pctToReforecast.toFixed(1) + '%' : 'N/A'}</div>
                  </div>
                </div>
                <div class="grid" style="margin-top: 8px;">
                  <div class="metric-box">
                    <div class="metric-label">YTD Revenue</div>
                    <div class="metric-value" style="color: #16a34a;">${formatCurrency(regionYTDRevenue)}</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">YTD Budget</div>
                    <div class="metric-value">${formatCurrency(regionYTDBudget)}</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">YTD % to Budget</div>
                    <div class="metric-value" style="color: ${ytdColor};">${ytdPctToBudget.toFixed(1)}%</div>
                  </div>
                  <div class="metric-box">
                    <div class="metric-label">Variance to Budget</div>
                    <div class="metric-value" style="color: ${regionRevenue - regionBudget >= 0 ? '#16a34a' : '#dc2626'};">
                      ${formatCurrency(regionRevenue - regionBudget)}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          ${regions.length > 0 && (filteredData.submissions.length > 0 || filteredData.financialData.length > 0) ? `
          <div class="section">
            <div class="section-title">Regional Commentary by Period</div>
            ${regions.slice(0, 4).map(regionName => {
              const regionSubmissions = (filteredData.submissions || []).filter(s => s.region === regionName);
              const regionFinancials = (filteredData.financialData || []).filter(f => f.region === regionName);
              
              const monthlyData = {};
              regionFinancials.forEach(f => {
                if (f.month && !monthlyData[f.month]) {
                  monthlyData[f.month] = { commentary: [] };
                }
                if (f.month && f.commentary) {
                  monthlyData[f.month].commentary.push({ market: f.market, commentary: f.commentary });
                }
              });
              
              regionSubmissions.forEach(s => {
                if (s.month) {
                  if (!monthlyData[s.month]) {
                    monthlyData[s.month] = { commentary: [] };
                  }
                  if (s.rmd_regional_commentary) {
                    monthlyData[s.month].rmdCommentary = s.rmd_regional_commentary;
                  }
                }
              });
              
              const sortedMonths = Object.keys(monthlyData).sort().slice(0, 3);
              
              if (sortedMonths.length === 0) return '';
              
              return `
                <div class="region-title">${regionName} Region</div>
                ${sortedMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthLabel = format(new Date(year, monthNum - 1, 1), 'MMMM yyyy');
                  const data = monthlyData[month];
                  
                  return `
                    <div style="margin: 10px 0; padding: 10px; background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 4px;">
                      <div style="font-weight: 600; color: #475569; margin-bottom: 6px; font-size: 12px;">${monthLabel}</div>
                      ${data.rmdCommentary ? `<div style="line-height: 1.4; margin-bottom: 6px;">${data.rmdCommentary.substring(0, 300)}${data.rmdCommentary.length > 300 ? '...' : ''}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              `;
            }).join('')}
          </div>
          ` : ''}

          <!-- Top Deals 90 Day Forecast -->
          <div class="section">
            <div class="section-title">Top Deals 90-Day Forecast (Top 15 Wins)</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
                  <th>Asset Type</th>
                  <th>SF</th>
                  <th>Budget Year Revenue</th>
                  <th>Total Revenue</th>
                  <th>Engagement</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${topWins.map(win => `
                  <tr>
                    <td>${win.client || 'N/A'}</td>
                    <td>${win.office_location || 'N/A'}</td>
                    <td>${win.transaction_type || 'N/A'}</td>
                    <td>${win.asset_type || 'N/A'}</td>
                    <td>${win.square_footage?.toLocaleString() || 'N/A'}</td>
                    <td style="font-weight: 600; color: #16a34a;">${formatCurrency(win.budget_year_revenue_impact)}</td>
                    <td>${formatCurrency(win.total_revenue_impact)}</td>
                    <td>${win.engagement_type || 'N/A'}</td>
                    <td>${win.reason || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Top Losses -->
          <div class="section">
            <div class="section-title">Top 5 Lost Opportunities</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
                  <th>Asset Type</th>
                  <th>SF</th>
                  <th>Budget Year Revenue</th>
                  <th>Total Revenue</th>
                  <th>Engagement</th>
                  <th>Reason</th>
                </tr>
              </thead>
              <tbody>
                ${topLosses.map(loss => `
                  <tr>
                    <td>${loss.client || 'N/A'}</td>
                    <td>${loss.office_location || 'N/A'}</td>
                    <td>${loss.transaction_type || 'N/A'}</td>
                    <td>${loss.asset_type || 'N/A'}</td>
                    <td>${loss.square_footage?.toLocaleString() || 'N/A'}</td>
                    <td style="font-weight: 600; color: #dc2626;">${formatCurrency(loss.budget_year_revenue_impact)}</td>
                    <td>${formatCurrency(loss.total_revenue_impact)}</td>
                    <td>${loss.engagement_type || 'N/A'}</td>
                    <td>${loss.reason || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Tier 1 & 2 Client Pitches -->
          <div class="section">
            <div class="section-title">Tier 1 & 2 Client Pitches</div>
            
            <div style="font-weight: 600; margin: 10px 0 5px 0; color: #1e40af;">Out for Signature (Top 5)</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
                  <th>Asset Type</th>
                  <th>Lead Broker</th>
                  <th>Total Revenue</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${outForSignature.map(pitch => `
                  <tr>
                    <td>${pitch.client || 'N/A'}</td>
                    <td>${pitch.office_location || 'N/A'}</td>
                    <td>${pitch.transaction_type || 'N/A'}</td>
                    <td>${pitch.asset_type || 'N/A'}</td>
                    <td>${pitch.lead_broker || 'N/A'}</td>
                    <td style="font-weight: 600;">${formatCurrency(pitch.total_revenue_impact)}</td>
                    <td>${pitch.summary || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="font-weight: 600; margin: 15px 0 5px 0; color: #1e40af;">Waiting to Hear Back (Top 5)</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
                  <th>Asset Type</th>
                  <th>Lead Broker</th>
                  <th>Total Revenue</th>
                  <th>Summary</th>
                </tr>
              </thead>
              <tbody>
                ${waitingToHear.map(pitch => `
                  <tr>
                    <td>${pitch.client || 'N/A'}</td>
                    <td>${pitch.office_location || 'N/A'}</td>
                    <td>${pitch.transaction_type || 'N/A'}</td>
                    <td>${pitch.asset_type || 'N/A'}</td>
                    <td>${pitch.lead_broker || 'N/A'}</td>
                    <td style="font-weight: 600;">${formatCurrency(pitch.total_revenue_impact)}</td>
                    <td>${pitch.summary || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- Personnel Changes -->
          <div class="section">
            <div class="section-title">Key Personnel Changes</div>
            
            <div style="font-weight: 600; margin: 10px 0 5px 0; color: #16a34a;">Top 5 Hires</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title/Specialty</th>
                  <th>Office</th>
                  <th>Revenue Impact</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${topHires.map(hire => `
                  <tr>
                    <td>${hire.name || 'N/A'}</td>
                    <td>${hire.title_specialty || 'N/A'}</td>
                    <td>${hire.office_location || 'N/A'}</td>
                    <td style="font-weight: 600; color: #16a34a;">${formatCurrency(hire.revenue_impact)}</td>
                    <td>${hire.notes || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="font-weight: 600; margin: 15px 0 5px 0; color: #dc2626;">Top 5 Departures</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title/Specialty</th>
                  <th>Office</th>
                  <th>Status</th>
                  <th>Revenue Impact</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${topTerminations.map(term => `
                  <tr>
                    <td>${term.name || 'N/A'}</td>
                    <td>${term.title_specialty || 'N/A'}</td>
                    <td>${term.office_location || 'N/A'}</td>
                    <td>${term.status || 'N/A'}</td>
                    <td style="font-weight: 600; color: #dc2626;">${formatCurrency(term.revenue_impact)}</td>
                    <td>${term.notes || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <!-- AI Personnel Analysis -->
          <div class="section">
            <div class="section-title">AI Analysis - Talent Movement</div>
            <div class="ai-summary">
              ${personnelSummary}
            </div>
          </div>

          <!-- AI Business Development Analysis -->
          <div class="section">
            <div class="section-title">AI Analysis - Business Development</div>
            <div class="ai-summary">
              ${businessDevSummary}
            </div>
          </div>

          ${Object.keys(sentimentTrends).length > 0 ? `
          <div class="section">
            <div class="section-title">Market Sentiment by Asset Class</div>
            <table>
              <thead>
                <tr>
                  <th>Asset Class</th>
                  <th>Current Score</th>
                  <th>Previous</th>
                  <th>Change</th>
                  <th>Trend</th>
                </tr>
              </thead>
              <tbody>
                ${Object.entries(sentimentTrends).map(([asset, data]) => {
                  if (!data) return '';
                  const changeColor = data.change > 0 ? '#16a34a' : data.change < 0 ? '#dc2626' : '#64748b';
                  const trendArrow = data.change > 0 ? '↑' : data.change < 0 ? '↓' : '→';
                  
                  return `
                    <tr>
                      <td style="font-weight: 600; text-transform: capitalize;">${asset.replace(/_/g, ' ')}</td>
                      <td style="font-weight: 600; font-size: 14px;">${data.current.toFixed(1)}/10</td>
                      <td>${data.previous.toFixed(1)}/10</td>
                      <td style="font-weight: 600; color: ${changeColor};">${data.change >= 0 ? '+' : ''}${data.change.toFixed(1)}</td>
                      <td style="font-size: 18px; color: ${changeColor};">${trendArrow}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Asset Class Commentary by Region and Month</div>
            ${(() => {
              const assetClasses = Object.keys(sentimentTrends);
              const allCurrentSubs = [...(filteredData.submissions || []), ...(allOfficeSubmissions || []).filter(filterByPeriod)];
              
              return assetClasses.map(asset => {
                const commentariesByRegionMonth = {};
                
                allCurrentSubs.forEach(sub => {
                  if (sub.asset_class_sentiment?.[asset]?.commentary && sub.region && sub.month) {
                    const key = sub.region + '-' + sub.month;
                    if (!commentariesByRegionMonth[key]) {
                      commentariesByRegionMonth[key] = {
                        region: sub.region,
                        month: sub.month,
                        score: sub.asset_class_sentiment[asset].score,
                        commentary: sub.asset_class_sentiment[asset].commentary
                      };
                    }
                  }
                });
                
                const commentaries = Object.values(commentariesByRegionMonth).sort((a, b) => {
                  if (a.region !== b.region) return a.region.localeCompare(b.region);
                  return b.month.localeCompare(a.month);
                });
                
                if (commentaries.length === 0) return '';
                
                const assetTitle = asset.replace(/_/g, ' ');
                
                return `
                  <div style="margin-bottom: 20px;">
                    <div style="font-weight: 600; color: #1e40af; margin-bottom: 8px; text-transform: capitalize; font-size: 13px;">
                      ${assetTitle}
                    </div>
                    ${commentaries.map(c => {
                      const [year, monthNum] = c.month.split('-');
                      const monthLabel = format(new Date(year, monthNum - 1, 1), 'MMM yyyy');
                      const truncatedCommentary = c.commentary.substring(0, 300) + (c.commentary.length > 300 ? '...' : '');
                      return `
                        <div style="margin: 8px 0; padding: 8px 10px; background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 3px;">
                          <div style="font-weight: 600; font-size: 11px; color: #475569; margin-bottom: 4px;">
                            ${c.region} - ${monthLabel} (Score: ${c.score}/10)
                          </div>
                          <div style="font-size: 10px; line-height: 1.4;">${truncatedCommentary}</div>
                        </div>
                      `;
                    }).join('')}
                  </div>
                `;
              }).join('');
            })()}
          </div>
          ` : ''}

          <!-- AI Market Sentiment & Outlook -->
          <div class="section">
            <div class="section-title">AI Analysis - Market Sentiment & Outlook</div>
            <div class="ai-summary">
              ${marketSentimentSummary}
            </div>
          </div>

          <div class="footer">
            <p>Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            <p>Avison Young - President's National Business Review</p>
          </div>
        </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('An error occurred while generating the report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="mt-8 mb-12">
      <Button
        onClick={generateReport}
        disabled={generating}
        className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white text-lg py-6 px-8"
      >
        {generating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating Report...
          </>
        ) : (
          <>
            <FileDown className="w-5 h-5 mr-2" />
            Generate President's Report
          </>
        )}
      </Button>
      <p className="text-sm text-slate-600 mt-2">
        Comprehensive national report for {filters.periodType === 'monthly' ? format(new Date(filters.year, filters.month - 1), 'MMMM yyyy') : filters.periodType === 'quarterly' ? `Q${filters.quarter} ${filters.year}` : `Year ${filters.year}`}
      </p>
    </div>
  );
}