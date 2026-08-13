import { useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { Radar as RadarIcon } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

export default function SpatialRadarChart({ features, score, title = '360° Spatial Attractiveness Profile' }) {
  const chartData = useMemo(() => {
    if (!features) return null;

    // 1. Population (0-100)
    const popVal = features.population_value || 0;
    const popScore = Math.min(100, Math.max(20, Math.round((popVal / 100) * 100)));

    // 2. Road Access (0-100)
    const roadDist = features.road_distance ?? 1000;
    const roadScore = roadDist <= 50 ? 100 : roadDist <= 100 ? 88 : roadDist <= 300 ? 70 : roadDist <= 500 ? 55 : 30;

    // 3. Property Zoning (0-100)
    const landuse = str(features.landuse || 'residential').toLowerCase();
    const zoningScore = (landuse === 'commercial' || landuse === 'retail') ? 95 : (landuse === 'residential' || landuse === 'mixed' || landuse === 'industrial') ? 70 : 30;

    // 4. Bus Transit Access (0-100)
    const busDist = features.bus_stop_distance ?? 2000;
    const busScore = busDist <= 300 ? 95 : busDist <= 500 ? 85 : busDist <= 1000 ? 65 : busDist <= 1500 ? 50 : 25;

    // 5. Market Demand & Synergy (0-100)
    const comp500 = features.competitors_500 || 0;
    const marketScore = comp500 >= 1 && comp500 <= 3 ? 90 : comp500 === 0 ? 75 : comp500 <= 6 ? 60 : 35;

    // 6. Train Access (0-100)
    const railDist = features.railway_distance ?? 5000;
    const railScore = railDist <= 1500 ? 95 : railDist <= 3000 ? 75 : railDist <= 5000 ? 55 : 30;

    // 7. Flood Safety (0-100)
    const flood = str(features.flood_risk || 'low').toLowerCase();
    const floodScore = flood === 'high' ? 20 : 90;

    return {
      labels: [
        '👥 Foot Traffic',
        '🚗 Road Access',
        '🏢 Property Zoning',
        '🚌 Bus Transit',
        '🏪 Market Demand',
        '🚆 Train Access',
        '🛡️ Flood Safety',
      ],
      datasets: [
        {
          label: 'Spatial Score',
          data: [popScore, roadScore, zoningScore, busScore, marketScore, railScore, floodScore],
          backgroundColor: 'rgba(37, 99, 235, 0.18)',
          borderColor: '#2563eb',
          borderWidth: 2.5,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#2563eb',
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    };
  }, [features]);

  function str(val) {
    return val ? String(val) : '';
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: {
          color: 'rgba(226, 232, 240, 0.8)',
        },
        grid: {
          color: 'rgba(226, 232, 240, 0.8)',
        },
        pointLabels: {
          font: {
            family: 'sans-serif',
            size: 11,
            weight: '700',
          },
          color: '#1e293b',
        },
        ticks: {
          display: false,
          min: 0,
          max: 100,
          stepSize: 20,
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleFont: { family: 'sans-serif', size: 12, weight: '700' },
        bodyFont: { family: 'sans-serif', size: 11, weight: '600' },
        padding: 10,
        cornerRadius: 10,
        callbacks: {
          label: (context) => ` Attractiveness: ${context.raw} / 100`,
        },
      },
    },
  };

  if (!chartData) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm font-sans space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-blue-600">
          <RadarIcon size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-black">
            {title}
          </h3>
        </div>
        <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-bold text-blue-700">
          AI Radar Model
        </span>
      </div>

      <div className="h-64 w-full relative">
        <Radar data={chartData} options={options} />
      </div>
    </div>
  );
}
