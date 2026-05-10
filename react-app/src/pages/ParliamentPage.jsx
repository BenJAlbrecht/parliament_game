import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTIES, econLabel, socialLabel, logoSrc } from '$lib/data.js';
import { calculateSeats } from '$lib/layout.js';
import useGameStore from '$lib/store.js';
import { PARAMS } from '$lib/economy/params.js';
import { toGdpPerCapita, toAnnualRate, quarterToCalendar } from '$lib/economy/display.js';

const TURNS_PER_YEAR = 4;
const total          = PARTIES.reduce((s, p) => s + p.seats, 0);
const majority       = Math.floor(total / 2) + 1;

const compassX = e => (e + 10) / 20 * 200;
const compassY = s => (10 - s) / 20 * 200;

function loyaltyCls(loy) {
  return loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
}
const pct = n => Math.round(n / total * 100);

const ROW_STYLE = {
  display: 'flex', justifyContent: 'space-between',
  padding: '0.2rem 0', borderBottom: '1px solid #1e293b',
};

function EconDebug({ economyState, economyHistory }) {
  const stepsRun = economyHistory.length - 1;
  const last     = stepsRun > 0 ? economyHistory.at(-1) : null;
  const t        = stepsRun > 0 ? stepsRun : 1;

  const Y    = last?.Y           ?? economyState?.Y_star_0 ?? 0;
  const gap  = last?.gap         ?? 0;
  const u    = last?.u           ?? PARAMS.u_natural_baseline;
  const pi   = last?.pi          ?? PARAMS.pi_target;
  const i    = last?.i           ?? PARAMS.i_neutral;
  const scar = last?.scar_factor ?? 1.0;

  const rows = [
    ['Quarter',      quarterToCalendar(t).label],
    ['GDP/capita',   `€${toGdpPerCapita(Y).toLocaleString()}`],
    ['Inflation',    `${toAnnualRate(pi).toFixed(1)}%`],
    ['Unemployment', `${(u * 100).toFixed(1)}%`],
    ['Rate',         `${toAnnualRate(i).toFixed(1)}%`],
    ['Output gap',   `${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}%`],
    ['Scar',         `${((scar - 1) * 100).toFixed(1)}%`],
  ];

  return (
    <div style={{ marginTop: '1.5rem', fontFamily: 'Inconsolata, monospace', fontSize: '0.8rem', color: '#94a3b8' }}>
      <div style={{ marginBottom: '0.5rem', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#475569' }}>
        Economy {stepsRun === 0 ? '(initial)' : ''}
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={ROW_STYLE}>
          <span>{label}</span>
          <span style={{ color: '#e2e8f0' }}>{value}</span>
        </div>
      ))}
    </div>
  );
}

export default function ParliamentPage() {
  const navigate = useNavigate();

  const party           = useGameStore((s) => s.playerParty);
  const partners        = useGameStore((s) => s.coalitionPartners);
  const coalition       = useGameStore((s) => s.selectedCoalition);
  const setHeaderAccent = useGameStore((s) => s.setHeaderAccent);
  const economyState    = useGameStore((s) => s.economyState);
  const economyHistory  = useGameStore((s) => s.economyHistory);
  const initEconomy     = useGameStore((s) => s.initEconomy);
  const advanceQuarter  = useGameStore((s) => s.advanceQuarter);

  const [seats,        setSeats]        = useState([]);
  const [loyalty,      setLoyalty]      = useState({});
  const [turnCount,    setTurnCount]    = useState(0);
  const [hoveredParty, setHoveredParty] = useState(null);
  const [drawerParty,  setDrawerParty]  = useState(null);

  useEffect(() => {
    if (!party || !coalition) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
    const computedSeats = calculateSeats(PARTIES);
    setSeats(computedSeats);
    setLoyalty(Object.fromEntries(partners.map(p => [p.name, 100])));
    setTurnCount(1);
    initEconomy();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!drawerParty) return;
    const onKey = e => { if (e.key === 'Escape') setDrawerParty(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerParty]);

  const year       = Math.ceil(turnCount / TURNS_PER_YEAR);
  const turnInYear = ((turnCount - 1) % TURNS_PER_YEAR) + 1;

  const govIndices = useMemo(() => {
    if (!party) return new Set();
    const names = new Set([party.name, ...partners.map(p => p.name)]);
    return new Set(PARTIES.map((p, i) => names.has(p.name) ? i : -1).filter(i => i >= 0));
  }, [party, partners]);

  const govParties = PARTIES.filter(p => party && (p === party || partners.includes(p)));
  const oppParties = PARTIES.filter(p => !party || (p !== party && !partners.includes(p)));
  const govSeats   = govParties.reduce((s, p) => s + p.seats, 0);
  const oppSeats   = oppParties.reduce((s, p) => s + p.seats, 0);

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
            <div className="year-counter-label" style={{ color: party.color }}>Year {year}</div>
            <div className="year-pips">
              {[1, 2, 3, 4].map(pip => (
                <div key={pip} className={`year-pip${pip <= turnInYear ? ' year-pip--filled' : ''}`} />
              ))}
            </div>
            <div className="year-counter-sub">Q{turnInYear}</div>
          </div>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <button className="primary" onClick={() => {
            advanceQuarter({ G_path: 270, tax_rate: 0.25 });
            setTurnCount(prev => prev + 1);
          }}>
            Next Turn →
          </button>
        </div>

        <EconDebug economyState={economyState} economyHistory={economyHistory} />

      </div>{/* /.action-panel */}


      {/* ════════════════════════════════════════════════════
          RIGHT: Context sidebar
      ════════════════════════════════════════════════════ */}
      <div className="context-sidebar">

        {/* Parliament widget */}
        <div className="sidebar-card sidebar-card--flush">
          <div className="sidebar-card-header">Parliament</div>

          <svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
            {seats.map((seat, i) => {
              const p       = PARTIES[seat.partyIndex];
              const inGov   = govIndices.has(seat.partyIndex);
              const opacity = hoveredParty ? (p === hoveredParty ? 1 : 0.1) : (inGov ? 1 : 0.3);
              return (
                <circle key={i}
                  cx={seat.x} cy={seat.y} r="5"
                  fill={p.color}
                  opacity={opacity}
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setHoveredParty(p)}
                  onMouseLeave={() => setHoveredParty(null)}
                  onClick={() => setDrawerParty(p)}
                >
                  <title>{p.name}</title>
                </circle>
              );
            })}
          </svg>

          <div className="sidebar-caption">{total} seats · Majority: {majority}</div>

          <div className="parl-party-list">
            <div className="parl-group-label">
              <span>Government</span>
              <span className="parl-group-stat">{govSeats} / {total} seats · {pct(govSeats)}%</span>
            </div>
            {govParties.map(p => {
              const isPlayer = p === party;
              const loy      = !isPlayer ? (loyalty[p.name] ?? 100) : null;
              const loyCls   = loy !== null ? loyaltyCls(loy) : '';
              return (
                <div
                  key={p.name}
                  className={`parl-row${isPlayer ? ' parl-row--player' : ''}${hoveredParty === p ? ' parl-row--hovered' : ''}`}
                  onMouseEnter={() => setHoveredParty(p)}
                  onMouseLeave={() => setHoveredParty(null)}
                  onClick={() => setDrawerParty(p)}
                >
                  <div className="parl-row-top">
                    <span className="swatch" style={{ background: p.color }} />
                    <span className="sidebar-party-name">{p.name}</span>
                    {isPlayer && <span className="you-tag">YOU</span>}
                    <span className="sidebar-party-seats">{p.seats}</span>
                  </div>
                  {loy !== null && (
                    <div className="parl-loyalty-row">
                      <div className="sidebar-loyalty-track">
                        <div className={`sidebar-loyalty-fill ${loyCls}`} style={{ width: `${loy}%` }} />
                      </div>
                      <span className={`parl-loyalty-pct ${loyCls}`}>{loy.toFixed(1)}%</span>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="parl-separator" />

            <div className="parl-group-label parl-group-label--opp">
              <span>Opposition</span>
              <span className="parl-group-stat">{oppSeats} / {total} seats · {pct(oppSeats)}%</span>
            </div>
            {oppParties.map(p => (
              <div
                key={p.name}
                className={`parl-row parl-row--opp${hoveredParty === p ? ' parl-row--hovered' : ''}`}
                onMouseEnter={() => setHoveredParty(p)}
                onMouseLeave={() => setHoveredParty(null)}
                onClick={() => setDrawerParty(p)}
              >
                <span className="swatch" style={{ background: p.color }} />
                <span className="sidebar-party-name">{p.name}</span>
                <span className="sidebar-party-seats">{p.seats}</span>
              </div>
            ))}
          </div>
        </div>

      </div>{/* /.context-sidebar */}

      {/* ════════════════════════════════════════════════════
          DRAWER: Party info panel (purely informational)
      ════════════════════════════════════════════════════ */}
      {drawerParty && (
        <>
          <div className="party-drawer-scrim" onClick={() => setDrawerParty(null)} />
          <div className="party-drawer" role="dialog" aria-modal="true">

            <button className="party-drawer-close" onClick={() => setDrawerParty(null)}
                    aria-label="Close">×</button>

            <div className="party-drawer-header" style={{ borderTopColor: drawerParty.color }}>
              <img className="party-drawer-logo" src={logoSrc(drawerParty.name)} alt="" />
              <div className="party-drawer-header-body">
                <div className="party-drawer-name" style={{ color: drawerParty.color }}>
                  {drawerParty.name}
                </div>
                <div className="party-drawer-meta">
                  {drawerParty.ideology} · {drawerParty.seats} seats
                </div>
                <p className="party-drawer-tagline">{drawerParty.bio.summary}</p>
              </div>
            </div>

            <div className="party-drawer-section">
              <div className="party-drawer-section-label">Political Position</div>
              <svg className="party-drawer-compass"
                   viewBox="-52 -22 304 244" xmlns="http://www.w3.org/2000/svg"
                   aria-hidden="true">
                <rect x="0" y="0" width="200" height="200" fill="#14121e" stroke="#334155" strokeWidth="1" />
                <line x1="0" y1="100" x2="200" y2="100" stroke="#334155" strokeWidth="1" />
                <line x1="100" y1="0" x2="100" y2="200" stroke="#334155" strokeWidth="1" />
                <text textAnchor="middle" x="100" y="-7"  fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Authoritarian</text>
                <text textAnchor="middle" x="100" y="219" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Libertarian</text>
                <text textAnchor="end"    x="-6"  y="104" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Left</text>
                <text textAnchor="start"  x="206" y="104" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Right</text>
                {PARTIES.map(p => p !== drawerParty && (
                  <circle key={p.name}
                    cx={compassX(p.economic)} cy={compassY(p.social)}
                    r="5" fill={p.color} opacity="0.4" />
                ))}
                <circle cx={compassX(drawerParty.economic)} cy={compassY(drawerParty.social)}
                        r="14" fill="none" stroke={drawerParty.color} strokeWidth="1.5" opacity="0.4" />
                <circle cx={compassX(drawerParty.economic)} cy={compassY(drawerParty.social)}
                        r="7" fill={drawerParty.color} />
              </svg>
              <div className="party-drawer-compass-caption">
                {econLabel(drawerParty.economic)} · {socialLabel(drawerParty.social)}
              </div>
            </div>

            <div className="party-drawer-section">
              <div className="party-drawer-section-label">Background</div>
              <p className="party-drawer-bio">{drawerParty.bio.history}</p>
            </div>

            {drawerParty.caucuses?.length > 0 && (
              <div className="party-drawer-section">
                <div className="party-drawer-section-label">Internal Caucuses</div>
                {drawerParty.caucuses.map(caucus => (
                  <div key={caucus.name} className="party-drawer-caucus">
                    <div className="party-drawer-caucus-top">
                      <span className="party-drawer-caucus-name">{caucus.name}</span>
                      <span className="party-drawer-caucus-share">{caucus.share}%</span>
                    </div>
                    <div className="party-drawer-caucus-bar">
                      <div className="party-drawer-caucus-bar-fill"
                           style={{ width: `${caucus.share}%`, background: drawerParty.color }} />
                    </div>
                    <p className="party-drawer-caucus-desc">{caucus.desc}</p>
                  </div>
                ))}
              </div>
            )}

          </div>
        </>
      )}

    </div>
  );
}
