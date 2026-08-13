// LocaVista Dedicated Executive PDF Report Generator

export function printAssessmentPDF(data) {
  const locationName = data.locationName || data.location_name || 'Selected Location';
  const score = data.score ?? 75.0;
  const useCase = (data.useCase || data.use_case || 'restaurant').toUpperCase();
  const lat = data.latitude ? Number(data.latitude).toFixed(4) : 'N/A';
  const lng = data.longitude ? Number(data.longitude).toFixed(4) : 'N/A';
  const recommendation = data.explanation?.recommendation || data.recommendation || 'Site evaluated using 7-factor geospatial ML attribution model.';
  const drivers = data.explanation?.drivers || data.drivers || [];
  const competitors = data.features?.nearest_competitors || data.competitors || [];
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>LocaVista Executive Report - ${locationName}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-box { background: #2563eb; color: #fff; font-weight: 800; font-size: 20px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
        .brand-title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
        .brand-sub { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 2px; }
        .meta-right { text-align: right; font-size: 11px; color: #64748b; font-weight: 600; }
        
        .score-card { background: #f0f6ff; border: 1px solid #bfdbfe; border-radius: 16px; padding: 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .score-val { font-size: 42px; font-weight: 900; color: #2563eb; line-height: 1; }
        .score-label { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #1e40af; margin-bottom: 6px; }
        .badge { background: #2563eb; color: #fff; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }

        .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
        .rec-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; font-size: 12px; line-height: 1.6; font-weight: 500; margin-bottom: 20px; color: #334155; }
        
        .grid-drivers { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .driver-row { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
        .driver-name { font-size: 12px; font-weight: 700; color: #0f172a; }
        .driver-detail { font-size: 10px; color: #64748b; margin-top: 2px; }
        .driver-impact { font-size: 11px; font-weight: 700; color: #047857; background: #ecfdf5; border: 1px solid #a7f3d0; padding: 3px 8px; border-radius: 6px; white-space: nowrap; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th { text-align: left; padding: 8px; background: #f1f5f9; color: #475569; font-weight: 700; uppercase; border-bottom: 1px solid #cbd5e1; }
        td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500; }

        .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 12px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <div class="logo-box">LV</div>
          <div>
            <h1 class="brand-title">LocaVista — Site Intelligence</h1>
            <div class="brand-sub">Enterprise AI Location Assessment Report</div>
          </div>
        </div>
        <div class="meta-right">
          <div><strong>Date:</strong> ${currentDate}</div>
          <div><strong>Target Site:</strong> ${locationName}</div>
          <div><strong>Coordinates:</strong> ${lat}, ${lng}</div>
        </div>
      </div>

      <div class="score-card">
        <div>
          <div class="score-label">AI Site Readiness Score (${useCase})</div>
          <div class="score-val">${score} <span style="font-size: 20px; color: #64748b; font-weight: 600;">/ 100</span></div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px; font-weight: 600;">Evaluated via 7-Factor Machine Learning Model</div>
        </div>
        <div class="badge">${score >= 80 ? 'EXCELLENT LOCATION' : score >= 65 ? 'STRONG CANDIDATE' : 'MODERATE SUITABILITY'}</div>
      </div>

      <div class="section-title">AI Recommendation Summary</div>
      <div class="rec-box">${recommendation}</div>

      ${drivers.length > 0 ? `
        <div class="section-title">Key Score Drivers & Factor Attribution</div>
        <div class="grid-drivers">
          ${drivers.map(d => `
            <div class="driver-row">
              <div>
                <div class="driver-name">${d.name}</div>
                ${d.detail ? `<div class="driver-detail">${d.detail}</div>` : ''}
              </div>
              <div class="driver-impact">${d.impact}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${competitors.length > 0 ? `
        <div class="section-title">Surrounding Competitor Cluster Analysis</div>
        <table>
          <thead>
            <tr>
              <th>Competitor Name</th>
              <th>Category</th>
              <th style="text-align: right;">Distance (Meters)</th>
            </tr>
          </thead>
          <tbody>
            ${competitors.slice(0, 6).map(c => `
              <tr>
                <td><strong>${c.name}</strong></td>
                <td style="text-transform: capitalize;">${c.category || 'Retail / Commercial'}</td>
                <td style="text-align: right;"><strong>${c.distance_m} m</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      ` : ''}

      <div class="footer">
        <div>LocaVista Enterprise Geospatial Intelligence Engine</div>
        <div>Confidential Commercial Assessment</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

export function printComparePDF({ nameA, nameB, posA, posB, resultA, resultB, useCase }) {
  const locNameA = nameA || resultA?.location_name || 'Location A';
  const locNameB = nameB || resultB?.location_name || 'Location B';
  const scoreA = resultA?.score ?? 75.0;
  const scoreB = resultB?.score ?? 70.0;
  const category = (useCase || 'restaurant').toUpperCase();
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const latA = posA?.latitude ? Number(posA.latitude).toFixed(4) : (resultA?.latitude ? Number(resultA.latitude).toFixed(4) : 'N/A');
  const lngA = posA?.longitude ? Number(posA.longitude).toFixed(4) : (resultA?.longitude ? Number(resultA.longitude).toFixed(4) : 'N/A');
  const latB = posB?.latitude ? Number(posB.latitude).toFixed(4) : (resultB?.latitude ? Number(resultB.latitude).toFixed(4) : 'N/A');
  const lngB = posB?.longitude ? Number(posB.longitude).toFixed(4) : (resultB?.longitude ? Number(resultB.longitude).toFixed(4) : 'N/A');

  const recA = resultA?.explanation?.recommendation || 'Site evaluated using multi-variable spatial econometrics.';
  const recB = resultB?.explanation?.recommendation || 'Site evaluated using multi-variable spatial econometrics.';

  const driversA = resultA?.explanation?.drivers || [];
  const driversB = resultB?.explanation?.drivers || [];

  const compA = resultA?.features?.nearest_competitors || [];
  const compB = resultB?.features?.nearest_competitors || [];

  let winnerText = 'Evenly Matched Locations';
  let winnerBadgeClass = 'badge-neutral';
  if (scoreA > scoreB) {
    winnerText = `Winner: ${locNameA} (+${(scoreA - scoreB).toFixed(1)} pts higher)`;
    winnerBadgeClass = 'badge-winner';
  } else if (scoreB > scoreA) {
    winnerText = `Winner: ${locNameB} (+${(scoreB - scoreA).toFixed(1)} pts higher)`;
    winnerBadgeClass = 'badge-winner';
  }

  const printWindow = window.open('', '_blank', 'width=950,height=1150');
  if (!printWindow) {
    window.print();
    return;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>LocaVista Dual Assessment Report - ${locNameA} vs ${locNameB}</title>
      <style>
        @page { size: A4 portrait; margin: 12mm; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #0f172a; margin: 0; padding: 20px; background: #fff; }
        .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
        .logo { display: flex; align-items: center; gap: 10px; }
        .logo-box { background: #2563eb; color: #fff; font-weight: 800; font-size: 20px; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; border-radius: 10px; }
        .brand-title { font-size: 18px; font-weight: 800; color: #0f172a; text-transform: uppercase; margin: 0; }
        .brand-sub { font-size: 11px; font-weight: 600; color: #64748b; margin-top: 2px; }
        .meta-right { text-align: right; font-size: 11px; color: #64748b; font-weight: 600; }
        
        .winner-banner { background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857; padding: 10px 16px; border-radius: 12px; font-weight: 800; font-size: 13px; text-align: center; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
        
        .dual-scores { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
        .score-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 16px; padding: 16px; }
        .score-card.winner { background: #f0f6ff; border-color: #93c5fd; }
        .site-title { font-size: 14px; font-weight: 800; color: #0f172a; margin-bottom: 6px; }
        .score-val { font-size: 36px; font-weight: 900; color: #2563eb; line-height: 1; margin-bottom: 4px; }
        .score-sub { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; }

        .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; margin-top: 16px; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }

        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
        th { text-align: left; padding: 8px; background: #f1f5f9; color: #475569; font-weight: 700; border-bottom: 1px solid #cbd5e1; }
        td { padding: 8px; border-bottom: 1px solid #f1f5f9; color: #1e293b; font-weight: 500; }
        .highlight-td { font-weight: 700; color: #2563eb; background: #eff6ff; }

        .dual-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; font-size: 11px; line-height: 1.5; color: #334155; }

        .footer { margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 10px; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">
          <div class="logo-box">LV</div>
          <div>
            <h1 class="brand-title">LocaVista — Site Intelligence</h1>
            <div class="brand-sub">Side-by-Side Dual Assessment & Location Comparison</div>
          </div>
        </div>
        <div class="meta-right">
          <div><strong>Date:</strong> ${currentDate}</div>
          <div><strong>Category:</strong> ${category}</div>
        </div>
      </div>

      <div class="winner-banner">
        <span>🏆 COMPARISON ASSESSMENT RESULT:</span>
        <span>${winnerText}</span>
      </div>

      <div class="dual-scores">
        <div class="score-card ${scoreA >= scoreB ? 'winner' : ''}">
          <div class="site-title">Location A: ${locNameA}</div>
          <div class="score-val">${scoreA} <span style="font-size: 16px; color: #64748b;">/ 100</span></div>
          <div class="score-sub">Coords: ${latA}, ${lngA}</div>
        </div>
        <div class="score-card ${scoreB >= scoreA ? 'winner' : ''}">
          <div class="site-title">Location B: ${locNameB}</div>
          <div class="score-val">${scoreB} <span style="font-size: 16px; color: #64748b;">/ 100</span></div>
          <div class="score-sub">Coords: ${latB}, ${lngB}</div>
        </div>
      </div>

      <div class="section-title">Comparative Metrics Matrix</div>
      <table>
        <thead>
          <tr>
            <th>Evaluation Metric</th>
            <th>Location A (${locNameA})</th>
            <th>Location B (${locNameB})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>AI Readiness Score</strong></td>
            <td className="${scoreA >= scoreB ? 'highlight-td' : ''}"><strong>${scoreA} / 100</strong></td>
            <td className="${scoreB >= scoreA ? 'highlight-td' : ''}"><strong>${scoreB} / 100</strong></td>
          </tr>
          <tr>
            <td><strong>Business Vertical Category</strong></td>
            <td>${category}</td>
            <td>${category}</td>
          </tr>
          <tr>
            <td><strong>Nearest Highway Access</strong></td>
            <td>${resultA?.features?.dist_highway_m ? `${resultA.features.dist_highway_m} m` : 'N/A'}</td>
            <td>${resultB?.features?.dist_highway_m ? `${resultB.features.dist_highway_m} m` : 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Nearest Bus Station Access</strong></td>
            <td>${resultA?.features?.dist_bus_stop_m ? `${resultA.features.dist_bus_stop_m} m` : 'N/A'}</td>
            <td>${resultB?.features?.dist_bus_stop_m ? `${resultB.features.dist_bus_stop_m} m` : 'N/A'}</td>
          </tr>
          <tr>
            <td><strong>Competitors in 500m Trade Area</strong></td>
            <td>${compA.length} Competitors</td>
            <td>${compB.length} Competitors</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">AI Recommendation Comparison</div>
      <div class="dual-grid">
        <div class="box">
          <strong>Location A (${locNameA}):</strong><br/>
          ${recA}
        </div>
        <div class="box">
          <strong>Location B (${locNameB}):</strong><br/>
          ${recB}
        </div>
      </div>

      ${(driversA.length > 0 || driversB.length > 0) ? `
        <div class="section-title">Key Factor Driver Comparison</div>
        <div class="dual-grid">
          <div class="box">
            <strong>Location A Key Drivers:</strong>
            <ul style="padding-left: 16px; margin-top: 6px; margin-bottom: 0;">
              ${driversA.map(d => `<li><strong>${d.name}:</strong> ${d.impact}</li>`).join('')}
            </ul>
          </div>
          <div class="box">
            <strong>Location B Key Drivers:</strong>
            <ul style="padding-left: 16px; margin-top: 6px; margin-bottom: 0;">
              ${driversB.map(d => `<li><strong>${d.name}:</strong> ${d.impact}</li>`).join('')}
            </ul>
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <div>LocaVista Enterprise Geospatial Intelligence Engine</div>
        <div>Confidential Side-by-Side Assessment</div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
