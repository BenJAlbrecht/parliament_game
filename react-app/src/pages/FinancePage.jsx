import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '$lib/store.js';
import { quarterToCalendar, toGdpPerCapita, toAnnualRate } from '$lib/economy/display.js';
import ParliamentWidget from '../components/ParliamentWidget.jsx';


/* ── SVG chart constants ─────────────────────────────────────────────────── */
const VW = 300, VH = 180;
const ML = 46, MR = 8, MT = 22, MB = 28;
const PW = VW - ML - MR;
const PH = VH - MT - MB;

const C_LINE  = '#94a3b8';
const C_GRID  = '#1e293b';
const C_AXIS  = '#334155';
const C_LABEL = '#64748b';
const C_BG    = '#0d0c17';
const MONO    = 'Inconsolata, monospace';

function yRange(vals) {
  const mn = Math.min(...vals);
  const mx = Math.max(...vals);
  if (mn === mx) {
    const pad = Math.abs(mn) * 0.15 || 1;
    return [mn - pad, mx + pad];
  }
  const span = mx - mn;
  return [mn - span * 0.1, mx + span * 0.1];
}

function EconChart({ title, xLabels, ticktext, yData, yAxisLabel, formatY }) {
  const n        = yData.length;
  const [lo, hi] = yRange(yData);

  const xPos = i => ML + (n <= 1 ? PW / 2 : (i / (n - 1)) * PW);
  const yPos = v => MT + PH - ((v - lo) / (hi - lo)) * PH;

  const yTicks = [0, 1, 2, 3].map(k => lo + (k / 3) * (hi - lo));
  const pts    = yData.map((v, i) => [xPos(i), yPos(v)]);
  const pathD  = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

  const xTickLabels = xLabels
    .map((_, i) => ({ text: ticktext[i], x: xPos(i) }))
    .filter(t => t.text);

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: '100%', display: 'block', background: C_BG }}>

      {/* Title */}
      <text x={ML} y={14} fontFamily="Oswald, sans-serif" fontSize="9"
            fill={C_LABEL} letterSpacing="1">
        {title.toUpperCase()}
      </text>

      {/* Y-axis unit label */}
      <text x={9} y={MT + PH / 2} fontFamily={MONO} fontSize="8" fill={C_LABEL}
            textAnchor="middle" transform={`rotate(-90,9,${(MT + PH / 2).toFixed(1)})`}>
        {yAxisLabel}
      </text>

      {/* Horizontal grid lines + y tick labels */}
      {yTicks.map((v, k) => {
        const y = yPos(v);
        return (
          <g key={k}>
            <line x1={ML} y1={y} x2={ML + PW} y2={y} stroke={C_GRID} strokeWidth="0.5" />
            <text x={ML - 3} y={y + 3} fontFamily={MONO} fontSize="7.5"
                  fill={C_LABEL} textAnchor="end">
              {formatY(v)}
            </text>
          </g>
        );
      })}

      {/* Axes */}
      <line x1={ML} y1={MT}      x2={ML}      y2={MT + PH} stroke={C_AXIS} strokeWidth="0.5" />
      <line x1={ML} y1={MT + PH} x2={ML + PW} y2={MT + PH} stroke={C_AXIS} strokeWidth="0.5" />

      {/* Data line */}
      {n > 1 && (
        <path d={pathD} fill="none" stroke={C_LINE} strokeWidth="1.5" strokeLinejoin="round" />
      )}

      {/* Data points */}
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={C_LINE} />
      ))}

      {/* X tick labels (year boundaries only) */}
      {xTickLabels.map((t, i) => (
        <g key={i}>
          <line x1={t.x} y1={MT + PH} x2={t.x} y2={MT + PH + 3}
                stroke={C_AXIS} strokeWidth="0.5" />
          <text x={t.x} y={MT + PH + 12} fontFamily={MONO} fontSize="8"
                fill={C_LABEL} textAnchor="middle">
            {t.text}
          </text>
        </g>
      ))}

    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function FinancePage() {
  const navigate = useNavigate();

  const party             = useGameStore((s) => s.playerParty);
  const coalition         = useGameStore((s) => s.selectedCoalition);
  const partners          = useGameStore((s) => s.coalitionPartners);
  const setHeaderAccent   = useGameStore((s) => s.setHeaderAccent);
  const economyHistory    = useGameStore((s) => s.economyHistory);
  const coalition_loyalty = useGameStore((s) => s.coalition_loyalty);

  useEffect(() => {
    if (!party || !coalition) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loyalty = useMemo(
    () => Object.fromEntries(partners.map(p => [p.name, Math.round((coalition_loyalty[p.name] ?? 1) * 100)])),
    [partners, coalition_loyalty],
  );

  const chartData = useMemo(() => {
    if (economyHistory.length <= 1) {
      const init = economyHistory[0] ?? {};
      const cal  = quarterToCalendar(1);
      return [{
        label: cal.label, t: 1,
        gdp:   toGdpPerCapita(init.Y_star_0 ?? 0),
        infl:  toAnnualRate(init.pi_prev ?? 0),
        unemp: (init.u_prev ?? 0) * 100,
        rate:  toAnnualRate(init.i_prev ?? 0),
      }];
    }
    return economyHistory.slice(1).map((entry, idx) => {
      const t   = idx + 1;
      const cal = quarterToCalendar(t);
      return {
        label: cal.label, t,
        gdp:   toGdpPerCapita(entry.Y),
        infl:  toAnnualRate(entry.pi),
        unemp: entry.u * 100,
        rate:  toAnnualRate(entry.i),
      };
    });
  }, [economyHistory]);

  const xLabels  = useMemo(() => chartData.map(d => d.label),  [chartData]);
  const ticktext = useMemo(() => chartData.map(d =>
    quarterToCalendar(d.t).quarter === 1 ? String(quarterToCalendar(d.t).year) : '',
  ), [chartData]);

  const fmtPct = v => v.toFixed(1) + '%';
  const fmtGdp = v => '€' + Math.round(v / 1000) + 'k';

  if (!party) return null;

  return (
    <div className="parliament-layout">

      {/* ════════════════════════════════════════════════════
          LEFT: Finance content
      ════════════════════════════════════════════════════ */}
      <div className="action-panel">

        <div className="finance-header">
          <button className="back-btn" onClick={() => navigate('/parliament')}>
            ← Parliament
          </button>
          <div className="finance-page-title">Finance Ministry</div>
        </div>

        <div className="finance-chart-grid">
          <div className="finance-chart-cell">
            <EconChart title="GDP per capita" xLabels={xLabels} ticktext={ticktext}
              yData={chartData.map(d => d.gdp)}  yAxisLabel="€"  formatY={fmtGdp} />
          </div>
          <div className="finance-chart-cell">
            <EconChart title="Inflation"      xLabels={xLabels} ticktext={ticktext}
              yData={chartData.map(d => d.infl)} yAxisLabel="%" formatY={fmtPct} />
          </div>
          <div className="finance-chart-cell">
            <EconChart title="Unemployment"   xLabels={xLabels} ticktext={ticktext}
              yData={chartData.map(d => d.unemp)} yAxisLabel="%" formatY={fmtPct} />
          </div>
          <div className="finance-chart-cell">
            <EconChart title="Interest rate"  xLabels={xLabels} ticktext={ticktext}
              yData={chartData.map(d => d.rate)}  yAxisLabel="%" formatY={fmtPct} />
          </div>
        </div>

      </div>{/* /.action-panel */}

      {/* ════════════════════════════════════════════════════
          RIGHT: Parliament widget
      ════════════════════════════════════════════════════ */}
      <div className="context-sidebar">
        <ParliamentWidget party={party} partners={partners} loyalty={loyalty} />
      </div>

    </div>
  );
}
