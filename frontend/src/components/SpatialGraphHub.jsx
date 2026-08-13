import { useState, useMemo } from 'react';
import {
  Chart as ChartJS,
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar, Bar, Doughnut, PolarArea, Line } from 'react-chartjs-2';
import { BarChart3, PieChart, Activity, LineChart, ShieldAlert } from 'lucide-react';

ChartJS.register(
  RadialLinearScale,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Filler,
  Tooltip,
  Legend
);

const GRAPH_TYPES = [
  { id: 'bar', label: 'Points Bar', icon: BarChart3 },
  { id: 'doughnut', label: 'Score Share', icon: PieChart },
  { id: 'polar', label: 'Proximity Slices', icon: ShieldAlert },
  { id: 'radar', label: '360° Radar', icon: Activity },
];

const COLOR_PALETTE = [
  '#2563eb', // Blue
  '#0d9488', // Teal
  '#7c3aed', // Purple
  '#d97706', // Amber
  '#059669', // Emerald
  '#4f46e5', // Indigo
  '#e11d48', // Rose
];

export default function SpatialGraphHub({ features, score, explanation, title = 'Interactive Spatial Graph Hub' }) {
  const [activeGraph, setActiveGraph] = useState('bar');

  function str(val) {
    return val ? String(val) : '';
  }

  // Calculate real normalized percentage metrics (0 - 100) from backend attribution
  const metricsData = useMemo(() => {
    if (explanation && explanation.drivers && explanation.drivers.length > 0) {
      const labels = explanation.drivers.map((d) => d.name);
      const values = explanation.drivers.map((d) => {
        const match = d.impact ? d.impact.match(/([0-9.]+)\s*\/\s*([0-9.]+)/) : null;
        if (match) {
          const earned = parseFloat(match[1]);
          const maxW = parseFloat(match[2]);
          return Math.round((earned / maxW) * 100);
        }
        return 70;
      });
      return { labels, values };
    }

    if (!features) return null;

    const popVal = features.population_value || 0;
    const popScore = Math.min(100, Math.round((popVal / 200) * 100));

    const roadDist = features.road_distance ?? 1000;
    const roadScore = roadDist <= 20 ? 88 : roadDist <= 100 ? 75 : roadDist <= 300 ? 60 : 35;

    const landuse = str(features.landuse || 'residential').toLowerCase();
    const zoningScore = (landuse === 'commercial' || landuse === 'retail') ? 90 : 67;

    const busDist = features.bus_stop_distance ?? 2000;
    const busScore = busDist <= 300 ? 85 : busDist <= 1000 ? 55 : 20;

    const comp500 = features.competitors_500 || 0;
    const marketScore = comp500 >= 1 && comp500 <= 3 ? 87 : comp500 === 0 ? 67 : 27;

    const railDist = features.railway_distance ?? 5000;
    const railScore = railDist <= 1500 ? 90 : 60;

    const flood = str(features.flood_risk || 'low').toLowerCase();
    const floodScore = flood === 'high' ? 10 : 90;

    const labels = [
      'Local Population & Customers',
      'Main Road Accessibility',
      'Property Zoning',
      'Bus & Public Transport',
      'Market Demand & Competition',
      'Train & Metro Access',
      'Safety & Flood Risk',
    ];

    const values = [popScore, roadScore, zoningScore, busScore, marketScore, railScore, floodScore];

    return { labels, values };
  }, [features, explanation]);

  // Chart 1: Radar Chart
  const radarData = useMemo(() => {
    if (!metricsData) return null;
    return {
      labels: metricsData.labels,
      datasets: [
        {
          label: 'Attractiveness Score',
          data: metricsData.values,
          backgroundColor: 'rgba(37, 99, 235, 0.18)',
          borderColor: '#2563eb',
          borderWidth: 2.5,
          pointBackgroundColor: '#2563eb',
          pointBorderColor: '#ffffff',
          pointHoverBackgroundColor: '#ffffff',
          pointHoverBorderColor: '#2563eb',
          pointRadius: 4,
        },
      ],
    };
  }, [metricsData]);

  // Chart 2: Bar Chart
  const barData = useMemo(() => {
    if (!metricsData) return null;
    return {
      labels: metricsData.labels,
      datasets: [
        {
          label: 'Spatial Score',
          data: metricsData.values,
          backgroundColor: COLOR_PALETTE,
          borderRadius: 8,
        },
      ],
    };
  }, [metricsData]);

  // Chart 3: Doughnut Chart
  const doughnutData = useMemo(() => {
    if (!metricsData) return null;
    return {
      labels: metricsData.labels,
      datasets: [
        {
          label: 'Share %',
          data: metricsData.values,
          backgroundColor: COLOR_PALETTE,
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    };
  }, [metricsData]);

  // Chart 4: Polar Area Chart
  const polarData = useMemo(() => {
    if (!metricsData) return null;
    return {
      labels: metricsData.labels,
      datasets: [
        {
          label: 'Proximity Score',
          data: metricsData.values,
          backgroundColor: COLOR_PALETTE.map((c) => c + 'aa'),
          borderColor: '#ffffff',
          borderWidth: 1.5,
        },
      ],
    };
  }, [metricsData]);

  // Chart 5: Line Chart (Hourly Traffic Trend)
  const lineData = useMemo(() => {
    if (!metricsData) return null;
    const hours = ['8 AM', '11 AM', '2 PM', '5 PM', '8 PM', '11 PM'];
    const baseVal = Math.round(metricsData.values[0] * 1.2);
    const trendValues = [
      Math.round(baseVal * 0.4),
      Math.round(baseVal * 0.75),
      Math.round(baseVal * 0.9),
      Math.round(baseVal * 1.3),
      Math.round(baseVal * 1.1),
      Math.round(baseVal * 0.5),
    ];

    return {
      labels: hours,
      datasets: [
        {
          label: 'Estimated Customer Traffic Index',
          data: trendValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.12)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointBackgroundColor: '#2563eb',
        },
      ],
    };
  }, [metricsData]);

  // Common Options
  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(226, 232, 240, 0.8)' },
        grid: { color: 'rgba(226, 232, 240, 0.8)' },
        pointLabels: { font: { family: 'sans-serif', size: 10, weight: '700' }, color: '#1e293b' },
        ticks: { display: false, min: 0, max: 100 },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: { cornerRadius: 8, callbacks: { label: (ctx) => ` Score: ${ctx.raw} / 100` } },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    scales: {
      x: { max: 100, grid: { color: '#f1f5f9' }, ticks: { font: { weight: '600', size: 10 } } },
      y: { grid: { display: false }, ticks: { font: { weight: '700', size: 10 }, color: '#0f172a' } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { cornerRadius: 8, callbacks: { label: (ctx) => ` Score: ${ctx.raw} / 100` } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right', labels: { font: { weight: '700', size: 10 } } },
      tooltip: { cornerRadius: 8, callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.raw} Pts` } },
    },
  };

  const polarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: { ticks: { display: false } },
    },
    plugins: {
      legend: { position: 'right', labels: { font: { weight: '700', size: 10 } } },
      tooltip: { cornerRadius: 8 },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { grid: { color: '#f1f5f9' }, ticks: { font: { weight: '600', size: 10 } } },
      x: { grid: { display: false }, ticks: { font: { weight: '700', size: 10 } } },
    },
    plugins: {
      legend: { display: false },
      tooltip: { cornerRadius: 8, callbacks: { label: (ctx) => ` Traffic Index: ${ctx.raw}` } },
    },
  };

  if (!metricsData) return null;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm font-sans space-y-4">
      {/* Header & Graph View Selector Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2 text-blue-600">
          <Activity size={18} />
          <h3 className="text-xs font-bold uppercase tracking-wider text-black">
            {title}
          </h3>
        </div>

        {/* Tab Switcher Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
          {GRAPH_TYPES.map((gt) => {
            const Icon = gt.icon;
            const isActive = activeGraph === gt.id;
            return (
              <button
                key={gt.id}
                type="button"
                onClick={() => setActiveGraph(gt.id)}
                className={
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all duration-150 ' +
                  (isActive
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-700 hover:text-black hover:bg-white/60')
                }
              >
                <Icon size={13} />
                <span>{gt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Graph Container */}
      <div className="h-64 w-full relative">
        {activeGraph === 'radar' && <Radar data={radarData} options={radarOptions} />}
        {activeGraph === 'bar' && <Bar data={barData} options={barOptions} />}
        {activeGraph === 'doughnut' && <Doughnut data={doughnutData} options={doughnutOptions} />}
        {activeGraph === 'polar' && <PolarArea data={polarData} options={polarOptions} />}
        {activeGraph === 'line' && <Line data={lineData} options={lineOptions} />}
      </div>
    </div>
  );
}
