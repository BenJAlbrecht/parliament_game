import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoSrc } from '$lib/data.js';
import useGameStore from '$lib/store.js';
import { quarterToCalendar, BASE_GDP_CAPITA, BASE_Y_MODEL, POPULATION } from '$lib/economy/display.js';
import ParliamentWidget from '../components/ParliamentWidget.jsx';

const G_PATH_ANNUAL_BN = 4 * (BASE_GDP_CAPITA / BASE_Y_MODEL) * POPULATION / 1e9;

export default function ParliamentPage() {
  const navigate = useNavigate();

  const party               = useGameStore((s) => s.playerParty);
  const partners            = useGameStore((s) => s.coalitionPartners);
  const coalition           = useGameStore((s) => s.selectedCoalition);
  const setHeaderAccent     = useGameStore((s) => s.setHeaderAccent);
  const economyHistory      = useGameStore((s) => s.economyHistory);
  const initEconomy         = useGameStore((s) => s.initEconomy);
  const initCoalitionLoyalty = useGameStore((s) => s.initCoalitionLoyalty);
  const skipTurn            = useGameStore((s) => s.skipTurn);
  const coalition_loyalty   = useGameStore((s) => s.coalition_loyalty);
  const current_G_path      = useGameStore((s) => s.current_G_path);
  const current_tax_rate    = useGameStore((s) => s.current_tax_rate);

  useEffect(() => {
    if (!party || !coalition) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
    initEconomy();
    initCoalitionLoyalty();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cal = quarterToCalendar(economyHistory.length || 1);

  const loyaltyForWidget = useMemo(
    () => Object.fromEntries(partners.map(p => [p.name, Math.round((coalition_loyalty[p.name] ?? 1) * 100)])),
    [partners, coalition_loyalty],
  );

  const spendingBn = Math.round(current_G_path * G_PATH_ANNUAL_BN);

  if (!party) return null;

  return (
    <div className="parliament-layout">

      {/* ════════════════════════════════════════════════════
          LEFT: Action panel
      ════════════════════════════════════════════════════ */}
      <div className="action-panel">

        {/* Party header */}
        <div className="party-header">
          <div className="party-header-left">
            <img className="party-header-logo" src={logoSrc(party.name)} alt="" />
            <div className="party-header-identity">
              <span className="party-header-name" style={{ color: party.color }}>{party.name}</span>
              <span className="party-header-role">Leader of the {coalition.name}</span>
            </div>
          </div>
          <div className="year-counter">
            <div className="year-counter-label" style={{ color: party.color }}>{cal.year}</div>
            <div className="year-pips">
              {[1, 2, 3, 4].map(pip => (
                <div key={pip} className={`year-pip${pip <= cal.quarter ? ' year-pip--filled' : ''}`} />
              ))}
            </div>
            <div className="year-counter-sub">Q{cal.quarter}</div>
          </div>
        </div>

        {/* Fiscal state */}
        <div className="parl-fiscal-state">
          <div className="parl-fiscal-item">
            <span className="parl-fiscal-label">Spending</span>
            <span className="parl-fiscal-value">€{spendingBn.toLocaleString()}B/yr</span>
          </div>
          <div className="parl-fiscal-item">
            <span className="parl-fiscal-label">Tax rate</span>
            <span className="parl-fiscal-value">{(current_tax_rate * 100).toFixed(0)}%</span>
          </div>
        </div>

        {/* Coalition loyalty */}
        {partners.length > 0 && (
          <div className="parl-loyalty-readout">
            <div className="parl-loyalty-header">Coalition Loyalty</div>
            {partners.map(p => {
              const pct = Math.round((coalition_loyalty[p.name] ?? 1) * 100);
              const cls = pct >= 70 ? 'loyalty-up' : pct >= 40 ? 'loyalty-neutral' : 'loyalty-down';
              return (
                <div key={p.name} className="parl-loyalty-row">
                  <span className="swatch" style={{ background: p.color }} />
                  <span className="parl-loyalty-name">{p.name}</span>
                  <span className={`parl-loyalty-pct ${cls}`}>{pct}%</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Action buttons */}
        <div className="parl-action-btns">
          <button className="primary" onClick={() => navigate('/legislature')}>Propose Bill</button>
          <button onClick={skipTurn}>Skip Turn</button>
          <button onClick={() => navigate('/finance')}>Finance Ministry</button>
        </div>

      </div>{/* /.action-panel */}

      {/* ════════════════════════════════════════════════════
          RIGHT: Context sidebar
      ════════════════════════════════════════════════════ */}
      <div className="context-sidebar">
        <ParliamentWidget party={party} partners={partners} loyalty={loyaltyForWidget} />
      </div>

    </div>
  );
}
