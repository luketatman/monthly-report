import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';

export default function RegionalReport({ 
  filters, 
  filteredData,
  allSubmissions,
  allOfficeSubmissions,
  allWinLosses,
  allPitches,
  allPersonnelUpdates,
  userRegion,
  isMarketView
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
      
      printWindow.document.write('<html><body><h2>Generating regional report...</h2><p>This may take a moment...</p></body></html>');

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
      
      const filterByPeriod = (item) => item.month && relevantMonths.includes(item.month);
      
      const sortWithTiebreaker = (a, b) => {
        const aBudget = a.budget_year_revenue_impact || 0;
        const bBudget = b.budget_year_revenue_impact || 0;
        if (aBudget !== bBudget) return bBudget - aBudget;
        return (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0);
      };
      
      // Top 15 Wins
      const topWins = [...allWinLosses]
        .filter(wl => wl.outcome === 'Win' && filterByPeriod(wl))
        .sort(sortWithTiebreaker)
        .slice(0, 15);

      // Top 5 Losses
      const topLosses = [...allWinLosses]
        .filter(wl => wl.outcome === 'Loss' && filterByPeriod(wl))
        .sort(sortWithTiebreaker)
        .slice(0, 5);

      // Top Pitches
      const outForSignature = [...allPitches]
        .filter(p => p.stage === 'Out for Signature' && filterByPeriod(p))
        .sort((a, b) => (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0))
        .slice(0, 5);

      const waitingToHear = [...allPitches]
        .filter(p => p.stage === 'Waiting to Hear Back' && filterByPeriod(p))
        .sort((a, b) => (b.total_revenue_impact || 0) - (a.total_revenue_impact || 0))
        .slice(0, 5);

      // Personnel
      const topHires = [...allPersonnelUpdates]
        .filter(p => p.status === 'Hired' && filterByPeriod(p))
        .sort((a, b) => Math.abs(b.revenue_impact || 0) - Math.abs(a.revenue_impact || 0))
        .slice(0, 5);

      const topTerminations = [...allPersonnelUpdates]
        .filter(p => (p.status === 'Terminated' || p.status === 'Resigned') && filterByPeriod(p))
        .sort((a, b) => Math.abs(b.revenue_impact || 0) - Math.abs(a.revenue_impact || 0))
        .slice(0, 5);

      // Financial metrics
      const totalRevenue = filteredData.financialData.reduce((sum, f) => sum + (f.monthly_revenue || 0), 0);
      const totalBudget = filteredData.financialData.reduce((sum, f) => sum + (f.monthly_budget || 0), 0);
      const totalYTDRevenue = filteredData.financialData.reduce((sum, f) => sum + (f.ytd_revenue || 0), 0);
      const totalYTDBudget = filteredData.financialData.reduce((sum, f) => sum + (f.ytd_budget || 0), 0);

      // AI summaries
      const performanceSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on the following ${isMarketView ? 'office' : 'regional'} performance data for ${periodLabel}, provide a concise 2 paragraph executive summary:
        
Total Revenue: $${totalRevenue.toLocaleString()}
Total Budget: $${totalBudget.toLocaleString()}
YTD Revenue: $${totalYTDRevenue.toLocaleString()}
YTD Budget: $${totalYTDBudget.toLocaleString()}
Total Wins: ${topWins.length}
Total Losses: ${topLosses.length}
Active Pitches: ${allPitches.filter(filterByPeriod).length}

Focus on: revenue performance vs budget and overall business health for ${userRegion}.`,
      });

      const personnelSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on personnel data for ${periodLabel} in ${userRegion}, provide a concise 2 paragraph summary:

New Hires: ${topHires.length} (Top hire revenue impact: $${topHires[0]?.revenue_impact || 0})
Departures: ${topTerminations.length} (Top departure revenue impact: $${topTerminations[0]?.revenue_impact || 0})

Analyze talent movement and its potential impact.`,
      });

      const businessDevSummary = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on business development data for ${periodLabel} in ${userRegion}, provide a concise 2 paragraph analysis:

Wins: ${topWins.length} deals (Total: $${topWins.reduce((sum, w) => sum + (w.budget_year_revenue_impact || 0), 0).toLocaleString()})
Losses: ${topLosses.length} deals (Total: $${topLosses.reduce((sum, l) => sum + (l.budget_year_revenue_impact || 0), 0).toLocaleString()})
Active Pitches: ${allPitches.filter(filterByPeriod).length}

Analyze win/loss ratio and pipeline strength.`,
      });

      // Calculate sentiment scores with error handling
      let sentimentTrends = {};
      let currentSubmissions = [];
      
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
              } catch (e) { /* Skip */ }
            });
            assetScores[ac] = scores.length > 0 ? scores.reduce((sum, s) => sum + s, 0) / scores.length : null;
          });
          return assetScores;
        };

        currentSubmissions = isMarketView 
          ? (allOfficeSubmissions || []).filter(filterByPeriod)
          : (allSubmissions || []).filter(filterByPeriod);
        
        const currentSentiment = calculateSentimentAverages(currentSubmissions);
        
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
        
        const previousSubmissions = isMarketView
          ? (allOfficeSubmissions || []).filter(s => s.month && previousPeriodMonths.includes(s.month))
          : (allSubmissions || []).filter(s => s.month && previousPeriodMonths.includes(s.month));
        
        const previousSentiment = calculateSentimentAverages(previousSubmissions);
        
        assetClasses.forEach(ac => {
          if (currentSentiment[ac] !== null && previousSentiment[ac] !== null) {
            sentimentTrends[ac] = {
              current: currentSentiment[ac],
              previous: previousSentiment[ac],
              change: currentSentiment[ac] - previousSentiment[ac]
            };
          }
        });
      } catch (error) {
        console.error('Sentiment calculation error:', error);
      }

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
          <title>${userRegion} ${isMarketView ? 'Office' : 'Region'} Report - ${periodLabel}</title>
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
            <h1>${userRegion} ${isMarketView ? 'Office' : 'Region'} Business Review</h1>
            <div style="color: #64748b; font-size: 16px; margin-top: 5px;">${periodLabel}</div>
          </div>

          <div class="no-print" style="text-align: center; margin-bottom: 20px;">
            <button onclick="window.print()" style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer;">
              Print / Save as PDF
            </button>
            <button onclick="window.close()" style="background: #64748b; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; margin-left: 10px;">
              Close
            </button>
          </div>

          <div class="section">
            <div class="section-title">Executive Summary</div>
            <div class="ai-summary">${performanceSummary}</div>
          </div>

          <div class="section">
            <div class="section-title">Financial Overview</div>
            <div class="grid">
              <div class="metric-box">
                <div class="metric-label">Period Revenue</div>
                <div class="metric-value" style="color: #16a34a;">${formatCurrency(totalRevenue)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Period Budget</div>
                <div class="metric-value">${formatCurrency(totalBudget)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">% to Budget</div>
                <div class="metric-value" style="color: ${totalBudget > 0 && (totalRevenue / totalBudget) >= 1 ? '#16a34a' : totalBudget > 0 && (totalRevenue / totalBudget) >= 0.9 ? '#f59e0b' : '#dc2626'};">
                  ${totalBudget > 0 ? ((totalRevenue / totalBudget) * 100).toFixed(1) : '0'}%
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">Variance to Budget</div>
                <div class="metric-value" style="color: ${totalRevenue - totalBudget >= 0 ? '#16a34a' : '#dc2626'};">
                  ${formatCurrency(totalRevenue - totalBudget)}
                </div>
              </div>
            </div>
            <div class="grid" style="margin-top: 8px;">
              <div class="metric-box">
                <div class="metric-label">YTD Revenue</div>
                <div class="metric-value" style="color: #16a34a;">${formatCurrency(totalYTDRevenue)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">YTD Budget</div>
                <div class="metric-value">${formatCurrency(totalYTDBudget)}</div>
              </div>
              <div class="metric-box">
                <div class="metric-label">YTD % to Budget</div>
                <div class="metric-value" style="color: ${totalYTDBudget > 0 && (totalYTDRevenue / totalYTDBudget) >= 1 ? '#16a34a' : totalYTDBudget > 0 && (totalYTDRevenue / totalYTDBudget) >= 0.9 ? '#f59e0b' : '#dc2626'};">
                  ${totalYTDBudget > 0 ? ((totalYTDRevenue / totalYTDBudget) * 100).toFixed(1) : '0'}%
                </div>
              </div>
              <div class="metric-box">
                <div class="metric-label">YTD Variance</div>
                <div class="metric-value" style="color: ${totalYTDRevenue - totalYTDBudget >= 0 ? '#16a34a' : '#dc2626'};">
                  ${formatCurrency(totalYTDRevenue - totalYTDBudget)}
                </div>
              </div>
            </div>
          </div>

          <!-- Detailed Financial by Office/Market -->
          <div class="section">
            <div class="section-title">${isMarketView ? 'Monthly' : 'Office'} Financial Performance</div>
            <table>
              <thead>
                <tr>
                  <th>${isMarketView ? 'Month' : 'Office'}</th>
                  <th>Revenue</th>
                  <th>Budget</th>
                  <th>% to Budget</th>
                  <th>Reforecast</th>
                  <th>% to Reforecast</th>
                  <th>Variance</th>
                </tr>
              </thead>
              <tbody>
                ${filteredData.financialData.map(fin => {
                  const pctToBudget = fin.monthly_budget > 0 ? ((fin.monthly_revenue / fin.monthly_budget) * 100) : 0;
                  const pctToReforecast = fin.monthly_reforecast > 0 ? ((fin.monthly_revenue / fin.monthly_reforecast) * 100) : 0;
                  const variance = (fin.monthly_revenue || 0) - (fin.monthly_budget || 0);
                  const budgetColor = pctToBudget >= 100 ? '#16a34a' : pctToBudget >= 90 ? '#f59e0b' : '#dc2626';
                  
                  const displayLabel = isMarketView 
                    ? format(new Date(fin.month + '-01'), 'MMM yyyy')
                    : fin.market;
                  
                  return `
                    <tr>
                      <td style="font-weight: 600;">${displayLabel}</td>
                      <td style="color: #16a34a; font-weight: 600;">${formatCurrency(fin.monthly_revenue)}</td>
                      <td>${formatCurrency(fin.monthly_budget)}</td>
                      <td style="color: ${budgetColor}; font-weight: 600;">${pctToBudget.toFixed(1)}%</td>
                      <td>${fin.monthly_reforecast ? formatCurrency(fin.monthly_reforecast) : 'N/A'}</td>
                      <td>${pctToReforecast > 0 ? pctToReforecast.toFixed(1) + '%' : 'N/A'}</td>
                      <td style="color: ${variance >= 0 ? '#16a34a' : '#dc2626'}; font-weight: 600;">
                        ${formatCurrency(variance)}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          ${(filteredData.financialData.length > 0 || currentSubmissions.length > 0) ? `
          <div class="section">
            <div class="section-title">${isMarketView ? 'Office' : 'Regional'} Commentary by Period</div>
            ${(() => {
              try {
                const monthlyData = {};
                
                (filteredData.financialData || []).forEach(f => {
                  if (f.month && f.commentary) {
                    if (!monthlyData[f.month]) {
                      monthlyData[f.month] = { commentary: [] };
                    }
                    monthlyData[f.month].commentary.push({ 
                      label: isMarketView ? 'Financial Commentary' : f.market, 
                      commentary: f.commentary.substring(0, 500)
                    });
                  }
                });
                
                (currentSubmissions || []).forEach(s => {
                  if (s.month && s.rmd_regional_commentary) {
                    if (!monthlyData[s.month]) {
                      monthlyData[s.month] = { commentary: [] };
                    }
                    monthlyData[s.month].rmdCommentary = s.rmd_regional_commentary.substring(0, 500);
                  }
                });
                
                const sortedMonths = Object.keys(monthlyData).sort().slice(0, 3);
                
                return sortedMonths.map(month => {
                  const [year, monthNum] = month.split('-');
                  const monthLabel = format(new Date(year, monthNum - 1, 1), 'MMMM yyyy');
                  const data = monthlyData[month];
                  
                  return `
                    <div style="margin: 10px 0; padding: 10px; background: #f8fafc; border-left: 3px solid #94a3b8; border-radius: 4px;">
                      <div style="font-weight: 600; color: #475569; margin-bottom: 6px; font-size: 12px;">${monthLabel}</div>
                      ${data.rmdCommentary ? `<div style="line-height: 1.4; margin-bottom: 6px;">${data.rmdCommentary}${data.rmdCommentary.length >= 500 ? '...' : ''}</div>` : ''}
                      ${data.commentary.length > 0 ? data.commentary.slice(0, 2).map(c => `
                        <div style="margin: 4px 0; font-size: 11px;">
                          ${!isMarketView ? `<strong>${c.label}:</strong> ` : ''}${c.commentary}${c.commentary.length >= 500 ? '...' : ''}
                        </div>
                      `).join('') : ''}
                    </div>
                  `;
                }).join('');
              } catch (e) {
                return '<div>Commentary unavailable</div>';
              }
            })()}
          </div>
          ` : ''}

          <div class="section">
            <div class="section-title">Top 15 Wins</div>
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
                    <td>${win.reason || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Top 5 Losses</div>
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
                    <td>${loss.reason || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Active Pitches</div>
            
            <div style="font-weight: 600; margin: 10px 0 5px 0;">Out for Signature</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
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
                    <td>${pitch.lead_broker || 'N/A'}</td>
                    <td style="font-weight: 600;">${formatCurrency(pitch.total_revenue_impact)}</td>
                    <td>${pitch.summary || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="font-weight: 600; margin: 15px 0 5px 0;">Waiting to Hear Back</div>
            <table>
              <thead>
                <tr>
                  <th>Client</th>
                  <th>Office</th>
                  <th>Type</th>
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
                    <td>${pitch.lead_broker || 'N/A'}</td>
                    <td style="font-weight: 600;">${formatCurrency(pitch.total_revenue_impact)}</td>
                    <td>${pitch.summary || 'N/A'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="section">
            <div class="section-title">Personnel Changes</div>
            
            <div style="font-weight: 600; margin: 10px 0 5px 0; color: #16a34a;">Top 5 Hires</div>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Title</th>
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
                  <th>Title</th>
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

          <div class="section">
            <div class="section-title">AI Analysis - Talent Movement</div>
            <div class="ai-summary">${personnelSummary}</div>
          </div>

          <div class="section">
            <div class="section-title">AI Analysis - Business Development</div>
            <div class="ai-summary">${businessDevSummary}</div>
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
            <div class="section-title">Asset Class Commentary by Office and Month</div>
            ${(() => {
              const assetClasses = Object.keys(sentimentTrends);
              const allCurrentSubs = allOfficeSubmissions.filter(filterByPeriod);

              return assetClasses.map(asset => {
                const commentariesByOfficeMonth = {};

                allCurrentSubs.forEach(sub => {
                  if (sub.asset_class_sentiment?.[asset]?.commentary && sub.market && sub.month) {
                    const key = sub.market + '-' + sub.month;
                    if (!commentariesByOfficeMonth[key]) {
                      commentariesByOfficeMonth[key] = {
                        office: sub.market,
                        month: sub.month,
                        score: sub.asset_class_sentiment[asset].score,
                        commentary: sub.asset_class_sentiment[asset].commentary
                      };
                    }
                  }
                });

                const commentaries = Object.values(commentariesByOfficeMonth).sort((a, b) => {
                  if (a.office !== b.office) return a.office.localeCompare(b.office);
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
                            ${c.office} - ${monthLabel} (Score: ${c.score}/10)
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

          <div class="footer">
            <p>Generated on ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
            <p>Avison Young - ${userRegion} ${isMarketView ? 'Office' : 'Regional'} Business Review</p>
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
            Generate {isMarketView ? 'Office' : 'Regional'} Report
          </>
        )}
      </Button>
      <p className="text-sm text-slate-600 mt-2">
        Comprehensive report for {filters.periodType === 'monthly' ? format(new Date(filters.year, filters.month - 1), 'MMMM yyyy') : filters.periodType === 'quarterly' ? `Q${filters.quarter} ${filters.year}` : `Year ${filters.year}`}
      </p>
    </div>
  );
}