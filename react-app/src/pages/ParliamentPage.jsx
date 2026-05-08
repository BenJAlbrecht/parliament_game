import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PARTIES, DOMAIN_SCALES, DOMAIN_ORDER, STARTING_DOMAINS,
  ECON_PARAMS, STARTING_ECONOMY, ECONOMIC_HISTORY,
  econLabel, socialLabel, logoSrc,
} from '$lib/data.js';
import { calculateSeats } from '$lib/layout.js';
import { init, initAgenda, proposeBill, getDomainState, getSessionStats } from '$lib/vote.js';
import useGameStore from '$lib/store.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const TURNS_PER_YEAR = 3;
const TOTAL_YEARS    = 3;
const TOTAL_TURNS    = TURNS_PER_YEAR * TOTAL_YEARS;
const total          = PARTIES.reduce((s, p) => s + p.seats, 0);
const majority       = Math.floor(total / 2) + 1;

// SVG chart layout
const FC_W = 400, FC_H = 120, FC_LM = 40, FC_RM = 8, FC_TM = 10, FC_BM = 24;
const FC_PW = FC_W - FC_LM - FC_RM;
const FC_PH = FC_H - FC_TM - FC_BM;

// Compass layout
const CP = 38, CS = 280 - 2 * 38;
const cx0 = CP + (10 / 20) * CS;
const cy0 = CP + (10 / 20) * CS;

// ── Pure helpers ──────────────────────────────────────────────────────────────
function computeEconYear(econState, domainState, econParams) {
  const { G, tax_rate, i, Y_star, pi_expected } = econState;
  const eff_u_star = ECON_PARAMS.u_star + (domainState.border - 3) * 0.003;
  const eff_ys_g   = econParams.potential_growth + (3 - domainState.border) * 0.001;
  const eff_I0     = econParams.I_0 + (3 - domainState.foreign) * 4;
  const I          = eff_I0 - ECON_PARAMS.d * i;
  const newY       = (ECON_PARAMS.a + I + G) / (1 - ECON_PARAMS.mpc * (1 - tax_rate));
  const newYs      = Y_star * (1 + eff_ys_g);
  const newU       = Math.max(0, eff_u_star - ECON_PARAMS.okun * ((newY - newYs) / newYs));
  const newPi      = pi_expected + ECON_PARAMS.beta * (eff_u_star - newU);
  const T          = tax_rate * newY;
  const deficit    = G - T;
  const debt       = econState.debt * (1 + i) + deficit;
  const growth     = (newY - econState.Y) / econState.Y;
  return {
    G, tax_rate, i,
    Y: Math.round(newY), Y_star: Math.round(newYs),
    u: newU, pi: newPi, pi_expected: newPi,
    T: Math.round(T), deficit: Math.round(deficit),
    debt: Math.round(debt), Y_growth: growth,
  };
}

function generateHeadline(econ) {
  const g = econ.Y_growth ?? 0, u = econ.u, pi = econ.pi;
  if (g  < -0.01) return `Economy contracts ${Math.abs(g * 100).toFixed(1)}% — recession deepens`;
  if (pi > 0.06)  return `Inflation surges to ${(pi * 100).toFixed(1)}% — crisis warning signs emerge`;
  if (pi > 0.04 && g > 0.02) return 'Strong growth fuels inflationary pressure';
  if (u  > 0.08)  return `Unemployment climbs to ${(u * 100).toFixed(1)}% — stagnation takes hold`;
  if (g  > 0.03)  return `Economy expands ${(g * 100).toFixed(1)}% — strongest growth in years`;
  if (u  < 0.04)  return `Labour market tightens as unemployment falls to ${(u * 100).toFixed(1)}%`;
  if (econ.deficit > 50) return 'Deficit widens as spending outpaces revenue';
  return `Modest ${(g * 100).toFixed(1)}% growth as the economy navigates policy transition`;
}

function cPx(i, n)      { return FC_LM + (i / Math.max(n - 1, 1)) * FC_PW; }
function cPy(v, lo, hi) { const r = hi - lo || 1; return FC_TM + (1 - (v - lo) / r) * FC_PH; }
function cPts(data, key, lo, hi) {
  return data.map((d, i) => `${cPx(i, data.length).toFixed(1)},${cPy(d[key], lo, hi).toFixed(1)}`).join(' ');
}
function cRange(data, ...keys) {
  const vals = data.flatMap(d => keys.map(k => d[k]));
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.12 || 2;
  return [lo - pad, hi + pad];
}
function cYTicks(lo, hi, n = 3) {
  return Array.from({ length: n }, (_, i) => lo + (i / (n - 1)) * (hi - lo));
}
function cXLabels(data) {
  return data.map((d, i) => ({ i, year: d.year })).filter(({ year }) => year % 5 === 0 || year > 0);
}
function fmtInt(v) { return Math.round(v).toLocaleString(); }
function fmtPct(v) { return v.toFixed(1) + '%'; }
function mapX(e)   { return CP + ((e + 10) / 20) * CS; }
function mapY(s)   { return CP + ((10 - s) / 20) * CS; }
function partyAbbr(p) {
  const w = p.name.split(/\s+/);
  return w.length > 1 ? w.map(x => x[0]).join('') : p.name.slice(0, 2).toUpperCase();
}
function loyaltyCls(loy) {
  return loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
}
const pct = n => Math.round(n / total * 100);

// ── Component ─────────────────────────────────────────────────────────────────
export default function ParliamentPage() {
  const navigate = useNavigate();

  const party             = useGameStore((s) => s.playerParty);
  const partners          = useGameStore((s) => s.coalitionPartners);
  const coalition         = useGameStore((s) => s.selectedCoalition);
  const goals             = useGameStore((s) => s.committedGoals);
  const mandate           = useGameStore((s) => s.playerMandate);
  const setEndingData     = useGameStore((s) => s.setEndingData);
  const setHeaderAccent   = useGameStore((s) => s.setHeaderAccent);
  const setSessionEconHistory = useGameStore((s) => s.setSessionEconHistory);

  // ── Session state ──────────────────────────────────────────────────────────
  const [seats,             setSeats]             = useState([]);
  const [votes,             setVotes]             = useState([]);
  const [loyalty,           setLoyalty]           = useState({});
  const [domainState,       setDomainState]       = useState({ ...STARTING_DOMAINS });
  const [currentEconParams, setCurrentEconParams] = useState({ ...ECON_PARAMS });
  const [turnCount,         setTurnCount]         = useState(0);
  const [billsProposed,     setBillsProposed]     = useState(0);
  const [turnsAbstained,    setTurnsAbstained]    = useState(0);
  const [agenda,            setAgenda]            = useState([]);
  const [econState,         setEconState]         = useState({ ...STARTING_ECONOMY });
  const [yearHistory,       setYearHistory]       = useState([]);
  const [prevEconForReport, setPrevEconForReport] = useState(null);
  const [reportHeadline,    setReportHeadline]    = useState('');
  const [phase,             setPhase]             = useState('policy');
  const [selectedBill,      setSelectedBill]      = useState(null);
  const [voteResult,        setVoteResult]        = useState(null);
  const [abstained,         setAbstained]         = useState(false);
  const [collapsed,         setCollapsed]         = useState(false);
  const [openDomain,        setOpenDomain]        = useState(null);

  // ── Init ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!party || !coalition) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
    const computedSeats = calculateSeats(PARTIES);
    setSeats(computedSeats);
    setVotes(new Array(computedSeats.length).fill(null));
    init(computedSeats, party, partners);
    setAgenda(initAgenda());
    setLoyalty(Object.fromEntries(partners.map(p => [p.name, 100])));
    setDomainState({ ...STARTING_DOMAINS });
    setCurrentEconParams({ ...ECON_PARAMS });
    setEconState({ ...STARTING_ECONOMY });
    setTurnCount(1);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ────────────────────────────────────────────────────────────────
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

  const allEconData = useMemo(() => [
    ...ECONOMIC_HISTORY,
    {
      year: 0, Y: STARTING_ECONOMY.Y, Y_star: STARTING_ECONOMY.Y_star,
      u_pct:  +(STARTING_ECONOMY.u  * 100).toFixed(1),
      pi_pct: +(STARTING_ECONOMY.pi * 100).toFixed(1),
      deficit: STARTING_ECONOMY.deficit, debt: STARTING_ECONOMY.debt,
    },
    ...yearHistory.map((e, i) => ({
      year: i + 1, Y: e.Y, Y_star: e.Y_star,
      u_pct:  +(e.u  * 100).toFixed(1),
      pi_pct: +(e.pi * 100).toFixed(1),
      deficit: e.deficit, debt: e.debt,
    })),
  ], [yearHistory]);

  const agendaData = useMemo(() => {
    if (!party) return [];
    return agenda.map((bill) => {
      let ayes = party.seats;
      for (const p of partners) {
        const L = loyalty[p.name] / 100;
        const k = Math.abs(bill.score - p[bill.type]);
        const c = Math.max(0, 1 - k / 10);
        ayes += Math.floor((L + (1 - L) * c) * p.seats);
      }
      return { bill, passable: ayes >= majority };
    });
  }, [agenda, party, partners, loyalty]);

  const allBlocked   = agendaData.length > 0 && agendaData.every(d => !d.passable);

  const agendaGroups = useMemo(() => {
    const map = new Map();
    agendaData.forEach(d => {
      const dim = d.bill.domain ?? 'other';
      if (!map.has(dim)) map.set(dim, []);
      map.get(dim).push(d);
    });
    return [...map.entries()].sort(([a], [b]) =>
      (DOMAIN_ORDER.indexOf(a) + 1 || 99) - (DOMAIN_ORDER.indexOf(b) + 1 || 99)
    );
  }, [agendaData]);

  const billBreakdown = useMemo(() => {
    if (!selectedBill || !party) return [];
    return PARTIES.map(p => {
      if (p === party) return { party: p, ayes: p.seats, nays: 0, role: 'player' };
      if (partners.includes(p)) {
        const L    = loyalty[p.name] / 100;
        const k    = Math.abs(selectedBill.score - p[selectedBill.type]);
        const c    = Math.max(0, 1 - k / 10);
        const ayes = Math.floor((L + (1 - L) * c) * p.seats);
        return { party: p, ayes, nays: p.seats - ayes, role: 'partner' };
      }
      return { party: p, ayes: 0, nays: p.seats, role: 'opposition' };
    });
  }, [selectedBill, party, partners, loyalty]);

  const billAyes     = billBreakdown.reduce((s, b) => s + b.ayes, 0);
  const billNays     = total - billAyes;
  const billPassable = billAyes >= majority;
  const billGovRows  = billBreakdown.filter(b => b.role !== 'opposition');
  const billOppRows  = billBreakdown.filter(b => b.role === 'opposition');

  const confidentVote = useMemo(() => {
    if (!party) return { passes: true, govAyes: 0, oppNays: 0 };
    let ayes = party.seats, nays = 0;
    for (const p of partners) {
      const loy   = loyalty[p.name] ?? 100;
      const share = loy / 100;
      ayes += Math.floor(share * p.seats);
      nays += p.seats - Math.floor(share * p.seats);
    }
    const oppSeatsTotal = PARTIES.filter(p => p !== party && !partners.includes(p))
      .reduce((s, p) => s + p.seats, 0);
    return { passes: ayes >= majority, govAyes: ayes, oppNays: oppSeatsTotal + nays };
  }, [party, partners, loyalty]);

  const gameStartIdx = ECONOMIC_HISTORY.length;

  // ── Handlers ───────────────────────────────────────────────────────────────
  function buildStats() {
    return {
      ...getSessionStats(),
      turnsAbstained,
      allPartnersLoyalAbove50: partners.every(p => (loyalty[p.name] ?? 0) > 50),
      domainState:  { ...domainState },
      policyState:  { ...domainState },
    };
  }

  function startNextTurn(currentSeats) {
    setVotes(new Array((currentSeats ?? seats).length).fill(null));
    setPhase('policy');
    setAbstained(false);
    setVoteResult(null);
    setSelectedBill(null);
    setTurnCount(prev => prev + 1);
  }

  function handleAbstain() {
    setTurnsAbstained(prev => prev + 1);
    setAbstained(true);
    setPhase('result');
  }

  function handlePropose() {
    setBillsProposed(prev => prev + 1);
    setAgenda(prev => prev.filter(b => b.title !== selectedBill.title));
    const result = proposeBill(selectedBill);
    setVotes(result.votes);
    setLoyalty({ ...result.newLoyalty });
    setDomainState(getDomainState());

    if (result.econEffect) {
      const ef = result.econEffect;
      setEconState(prev => {
        let next = { ...prev };
        if (ef.G        != null) next = { ...next, G: next.G + ef.G };
        if (ef.tax_rate != null) next = { ...next, tax_rate: Math.max(0.05, Math.min(0.60, next.tax_rate + ef.tax_rate)) };
        return next;
      });
      if (ef.I_0      != null) setCurrentEconParams(prev => ({ ...prev, I_0: Math.max(50, prev.I_0 + ef.I_0) }));
      if (ef.Y_star_g != null) setCurrentEconParams(prev => ({ ...prev, potential_growth: Math.max(0, Math.min(0.06, prev.potential_growth + ef.Y_star_g)) }));
    }

    setVoteResult(result);
    setCollapsed(partners.some(p => (result.newLoyalty[p.name] ?? 100) <= 0));
    setPhase('result');
  }

  function handleNext() {
    if (collapsed) {
      setEndingData({ finalLoyalty: { ...loyalty }, billsProposed, collapsed: true, stats: buildStats() });
      navigate('/ending');
      return;
    }
    if (turnCount % TURNS_PER_YEAR === 0) {
      const snap     = computeEconYear(econState, domainState, currentEconParams);
      const newHist  = [...yearHistory, snap];
      setPrevEconForReport({ ...econState });
      setEconState(snap);
      setYearHistory(newHist);
      setSessionEconHistory(newHist);
      setReportHeadline(generateHeadline(snap));
      setPhase('annual-report');
    } else {
      startNextTurn();
    }
  }

  function closeAnnualReport() {
    if (turnCount >= TOTAL_TURNS) {
      setPhase('confidence-vote');
    } else {
      startNextTurn();
    }
  }

  function closeConfidenceVote() {
    setEndingData({ finalLoyalty: { ...loyalty }, billsProposed, collapsed: false, stats: buildStats() });
    navigate('/ending');
  }

  if (!party) return null;

  // ── Chart pre-computations (finance phase) ────────────────────────────────
  const _n   = allEconData.length;
  const _gsX = cPx(gameStartIdx, _n);
  const _gR  = cRange(allEconData, 'Y', 'Y_star');
  const _gT  = cYTicks(_gR[0], _gR[1], 3);
  const _uR  = cRange(allEconData, 'u_pct');
  const _uT  = cYTicks(_uR[0], _uR[1], 3);
  const _piR = cRange(allEconData, 'pi_pct');
  const _piT = cYTicks(_piR[0], _piR[1], 3);
  const _dR  = cRange(allEconData, 'debt');
  const _dT  = cYTicks(_dR[0], _dR[1], 3);
  const _xL  = cXLabels(allEconData);

  // ── Render ────────────────────────────────────────────────────────────────
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
              {[1, 2, 3].map(pip => (
                <div key={pip} className={`year-pip${pip <= turnInYear ? ' year-pip--filled' : ''}`} />
              ))}
            </div>
            <div className="year-counter-sub">Turn {turnInYear} of {TURNS_PER_YEAR}</div>
          </div>
        </div>

        {/* ── Phase: Policy Home ── */}
        {phase === 'policy' && (
          <div>
            <div className="panel-section-label" style={{ marginTop: '1.25rem' }}>Policy State</div>
            <div className="policy-dim-list">
              {Object.entries(DOMAIN_SCALES).map(([key, dim]) => {
                const val  = domainState[key] ?? 3;
                const desc = dim.steps[val - 1] ?? '';
                const [lp, rp] = dim.poles;
                return (
                  <div key={key} className="policy-dimension">
                    <div className="policy-dim-name">{dim.label}</div>
                    <div className="policy-spectrum">
                      <span className="policy-pole policy-pole--left">{lp}</span>
                      <div className="policy-track">
                        {[1, 2, 3, 4, 5].map(step => (
                          <div key={step} className={`policy-step${step === val ? ' policy-step--active' : ''}`} />
                        ))}
                      </div>
                      <span className="policy-pole policy-pole--right">{rp}</span>
                    </div>
                    <div className="policy-dim-desc">{desc}</div>
                  </div>
                );
              })}
            </div>
            <div className="panel-section-label" style={{ marginTop: '1.5rem' }}>Actions</div>
            <button className="primary primary--secondary" style={{ marginTop: '0.75rem' }} onClick={() => { setPhase('agenda'); setOpenDomain(null); }}>
              Legislative Agenda →
            </button>
            <button className="primary primary--secondary" style={{ marginTop: '0.5rem' }} onClick={() => setPhase('finance')}>
              Finance Ministry →
            </button>
          </div>
        )}

        {/* ── Phase: Legislative Agenda ── */}
        {phase === 'agenda' && (
          <div className="agenda-document">
            <div className="agenda-toolbar">
              <button className="agenda-back-btn" onClick={() => setPhase('policy')}>← Back</button>
              <span className="agenda-toolbar-title">Legislative Agenda</span>
              <span className="agenda-toolbar-meta">Turn {turnInYear} of {TURNS_PER_YEAR} · Year {year}</span>
            </div>
            <div className="agenda-section-hdr">
              <span className="agenda-section-hdr-icon">▣</span> Bills by Domain
            </div>
            <div className="agenda-doc-inner">
              {allBlocked ? (
                <>
                  <div className="blocked-banner">All remaining bills are blocked — coalition support too low.</div>
                  <button className="primary" onClick={handleAbstain}>Abstain (skip turn) →</button>
                </>
              ) : (
                <div className="domain-accordion">
                  {agendaGroups.map(([dim, items]) => {
                    const dimScale      = dim !== 'fiscal' ? DOMAIN_SCALES[dim] : null;
                    const curVal        = dim !== 'fiscal' ? (domainState[dim] ?? 3) : 0;
                    const passableCount = items.filter(d => d.passable).length;
                    const isOpen        = openDomain === dim;
                    const allDimBlocked = passableCount === 0;
                    return (
                      <div key={dim} className={`domain-row${isOpen ? ' domain-row--open' : ''}`}>
                        <button
                          className={`domain-header${!allDimBlocked ? ' domain-header--passable' : ' domain-header--blocked'}`}
                          onClick={() => setOpenDomain(openDomain === dim ? null : dim)}
                        >
                          <div className="domain-header-left">
                            {dim === 'fiscal' ? (
                              <>
                                <span className="domain-fiscal-vals">G {econState.G} · Tax {(econState.tax_rate * 100).toFixed(0)}%</span>
                                <span className="domain-name">Fiscal Policy</span>
                              </>
                            ) : (
                              <>
                                <div className="domain-pips">
                                  {[1, 2, 3, 4, 5].map(step => (
                                    <div key={step} className={`domain-pip${step <= curVal ? ' domain-pip--filled' : ''}`} />
                                  ))}
                                </div>
                                <span className="domain-name">{dimScale?.label ?? dim}</span>
                                <span className="domain-lv">Lv.{curVal}</span>
                              </>
                            )}
                          </div>
                          <div className="domain-header-right">
                            <span className={`domain-count${allDimBlocked ? ' domain-count--zero' : ''}`}>
                              {passableCount}/{items.length}
                            </span>
                            <span className={`domain-chevron${isOpen ? ' domain-chevron--open' : ''}`}>›</span>
                          </div>
                        </button>
                        {isOpen && (
                          <div className="domain-bills">
                            {items.map(({ bill, passable }) => {
                              const newVal     = Math.max(1, Math.min(5, curVal + (bill.domainDelta ?? 0)));
                              const targetPole = (bill.domainDelta ?? 0) > 0 ? dimScale?.poles[1] : dimScale?.poles[0];
                              const newStep    = dimScale?.steps[newVal - 1] ?? '';
                              return (
                                <div
                                  key={bill.title}
                                  className={`agenda-item${passable ? ' agenda-item--passable' : ' agenda-item--blocked'}`}
                                  onClick={() => { setSelectedBill(bill); setPhase('bill-detail'); }}
                                  role="button"
                                  tabIndex={0}
                                  onKeyDown={e => e.key === 'Enter' && (setSelectedBill(bill), setPhase('bill-detail'))}
                                >
                                  <div className="agenda-item-top">
                                    <div className="agenda-item-title">{bill.title}</div>
                                    <span className={`agenda-item-status${passable ? ' agenda-status--pass' : ' agenda-status--block'}`}>
                                      {passable ? '✓' : '✗'}
                                    </span>
                                  </div>
                                  {dimScale && bill.domainDelta && (
                                    <div className="agenda-item-effect">
                                      <span className={`effect-delta${bill.domainDelta > 0 ? ' effect-delta--up' : ' effect-delta--down'}`}>
                                        {bill.domainDelta > 0 ? '▲' : '▼'}
                                      </span>
                                      <span className="effect-pole">{targetPole}</span>
                                      <div className="effect-steps">
                                        {[1, 2, 3, 4, 5].map(step => (
                                          <div key={step} className={
                                            `effect-pip` +
                                            (step === curVal && step !== newVal ? ' effect-pip--cur'    : '') +
                                            (step === newVal                    ? ' effect-pip--new'    : '') +
                                            (step < Math.min(curVal, newVal)    ? ' effect-pip--filled' : '')
                                          } />
                                        ))}
                                      </div>
                                      <span className="effect-label">{newStep}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Phase: Bill Detail ── */}
        {phase === 'bill-detail' && selectedBill && (() => {
          const bill        = selectedBill;
          const accentColor = billPassable ? '#22c55e' : '#f87171';
          const posLabel    = bill.type === 'economic' ? econLabel(bill.score) : socialLabel(bill.score);
          return (
            <div className="agenda-document">
              <div className="agenda-toolbar">
                <button className="agenda-back-btn" onClick={() => setPhase('agenda')}>← Back</button>
                <span className="agenda-toolbar-title">Bill Detail</span>
                <span className="agenda-toolbar-meta">Bill No. {billsProposed + 1} · First Reading</span>
              </div>
              <div className="agenda-section-hdr" style={{ background: '#2563a8' }}>
                <span className="agenda-section-hdr-icon">◈</span> {bill.title}
              </div>
              <div className="agenda-doc-inner">
                <div className="bill-header-card" style={{ borderTopColor: accentColor }}>
                  <div className="bill-header-body">
                    <div className="bill-header-title">{bill.title}</div>
                    <div className="bill-header-meta">
                      <span className="bill-card-type">{bill.domain}</span>
                      <span className="bill-position-tag">{posLabel}</span>
                    </div>
                  </div>
                  <div className={`bill-verdict bill-verdict--${billPassable ? 'pass' : 'block'}`}>
                    {billPassable ? 'PASSES ✓' : 'BLOCKED ✗'}
                  </div>
                </div>

                <div className="bill-section">
                  <div className="bill-section-header">
                    <span className="bill-section-label">Vote Breakdown</span>
                    <span className="bill-section-note">{billAyes} aye · {billNays} nay · need {majority}</span>
                  </div>
                  {[...billGovRows, ...billOppRows].map(b => {
                    const ayePct = (b.ayes / b.party.seats) * 100;
                    return (
                      <div key={b.party.name} className={`bill-bd-row${b.role === 'opposition' ? ' bill-bd-row--opp' : ''}`}>
                        <span className="bill-bd-dot" style={{ background: b.party.color }} />
                        <span className="bill-bd-name">
                          {b.party.name}
                          {b.role === 'player' && <span className="you-tag">YOU</span>}
                        </span>
                        <div className="bill-bd-bar">
                          <div className="bill-bd-bar-fill" style={{ width: `${ayePct}%`, background: b.party.color }} />
                        </div>
                        <span className="bill-bd-counts">
                          <span style={{ color: b.party.color }}>{b.ayes}</span>
                          <span className="bill-bd-sep"> / </span>{b.nays}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="bill-section">
                  <div className="bill-section-header">
                    <span className="bill-section-label">Coalition Loyalty</span>
                    <span className="bill-section-note">if passed</span>
                  </div>
                  {partners.map(p => {
                    const distance   = Math.abs(bill.score - p[bill.type]);
                    const delta      = Math.max(-20, Math.min(5, 5 - distance * 1.5));
                    const sign       = delta >= 0 ? '+' : '';
                    const cls        = delta > 0 ? 'loyalty-up' : delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
                    const currentLoy = loyalty[p.name] ?? 100;
                    return (
                      <div key={p.name} className="bill-loy-row">
                        <span className="bill-loy-dot" style={{ background: p.color }} />
                        <span className="bill-loy-name">{p.name}</span>
                        <div className="bill-loy-meter">
                          <div className="bill-loy-fill" style={{ width: `${currentLoy}%`, background: `${p.color}40` }} />
                        </div>
                        <span className="bill-loy-pct">{currentLoy.toFixed(0)}%</span>
                        <span className={`bill-loy-delta ${cls}`}>{sign}{delta.toFixed(1)}</span>
                      </div>
                    );
                  })}
                </div>

                {bill.domainDelta && bill.domain !== 'fiscal' && (() => {
                  const sc     = DOMAIN_SCALES[bill.domain];
                  const curVal = domainState[bill.domain] ?? 3;
                  const newVal = Math.max(1, Math.min(5, curVal + bill.domainDelta));
                  const [lp, rp] = sc.poles;
                  const dSign  = bill.domainDelta > 0 ? '+' : '';
                  const dColor = bill.domainDelta > 0 ? 'loyalty-up' : 'loyalty-down';
                  return (
                    <div className="bill-section">
                      <div className="bill-section-header">
                        <span className="bill-section-label">Policy Effect</span>
                        <span className="bill-section-note">if passed &nbsp;<span className={dColor}>{dSign}{bill.domainDelta}</span></span>
                      </div>
                      <div className="bill-policy-dim-name">{sc.label}</div>
                      <div className="policy-spectrum policy-spectrum--compact">
                        <span className="policy-pole policy-pole--left">{lp}</span>
                        <div className="policy-track">
                          {[1, 2, 3, 4, 5].map(step => (
                            <div key={step} className={
                              'policy-step' +
                              (step === newVal && bill.domainDelta > 0 ? ' policy-step--up'   : '') +
                              (step === newVal && bill.domainDelta < 0 ? ' policy-step--down' : '') +
                              (step === curVal && step !== newVal      ? ' policy-step--dim'  : '')
                            } />
                          ))}
                        </div>
                        <span className="policy-pole policy-pole--right">{rp}</span>
                      </div>
                      <div className="bill-policy-transition">
                        <span className="bill-policy-from">{sc.steps[curVal - 1]}</span>
                        <span className={`bill-policy-arrow ${dColor}`}>→</span>
                        <span className={`bill-policy-to ${dColor}`}>{sc.steps[newVal - 1]}</span>
                      </div>
                    </div>
                  );
                })()}

                {bill.econEffect && (
                  <div className="bill-section">
                    <div className="bill-section-header">
                      <span className="bill-section-label">Economic Effect</span>
                      <span className="bill-section-note">if passed · permanent</span>
                    </div>
                    {bill.econEffect.G != null && (
                      <div className="bill-econ-row">
                        <span className="bill-econ-key">Government Spending (G)</span>
                        <span className={`bill-econ-val ${bill.econEffect.G > 0 ? 'loyalty-up' : 'loyalty-down'}`}>
                          {bill.econEffect.G > 0 ? '+' : ''}{bill.econEffect.G}
                        </span>
                      </div>
                    )}
                    {bill.econEffect.tax_rate != null && (
                      <div className="bill-econ-row">
                        <span className="bill-econ-key">Tax Rate</span>
                        <span className={`bill-econ-val ${bill.econEffect.tax_rate > 0 ? 'loyalty-down' : 'loyalty-up'}`}>
                          {bill.econEffect.tax_rate > 0 ? '+' : ''}{(bill.econEffect.tax_rate * 100).toFixed(1)} pp
                        </span>
                      </div>
                    )}
                    {bill.econEffect.I_0 != null && (
                      <div className="bill-econ-row">
                        <span className="bill-econ-key">Baseline Investment (I₀)</span>
                        <span className={`bill-econ-val ${bill.econEffect.I_0 > 0 ? 'loyalty-up' : 'loyalty-down'}`}>
                          {bill.econEffect.I_0 > 0 ? '+' : ''}{bill.econEffect.I_0}
                        </span>
                      </div>
                    )}
                    {bill.econEffect.Y_star_g != null && (
                      <div className="bill-econ-row">
                        <span className="bill-econ-key">Potential Growth</span>
                        <span className={`bill-econ-val ${bill.econEffect.Y_star_g > 0 ? 'loyalty-up' : 'loyalty-down'}`}>
                          {bill.econEffect.Y_star_g > 0 ? '+' : ''}{(bill.econEffect.Y_star_g * 100).toFixed(1)}%/yr
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {billPassable
                  ? <button className="primary bill-propose-btn" onClick={handlePropose}>Propose Bill →</button>
                  : <div className="bill-blocked-msg">Coalition support too low — cannot bring this bill to the floor.</div>
                }
              </div>
            </div>
          );
        })()}

        {/* ── Phase: Vote Result ── */}
        {phase === 'result' && (
          <div className="phase-result">
            {abstained ? (
              <>
                <div className="vote-result-bill">Turn skipped</div>
                <div className="vote-verdict-abstained">ABSTAINED</div>
                <div className="vote-result-note">No bills could pass — coalition support too low.</div>
              </>
            ) : voteResult && (
              <>
                <div className="vote-result-bill">{selectedBill?.title}</div>
                <div className={voteResult.passed ? 'vote-verdict-passed' : 'vote-verdict-failed'}>
                  {voteResult.passed ? 'PASSED' : 'FAILED'}
                </div>
              </>
            )}
            <div className="vote-result-turn-hint">
              {turnCount % TURNS_PER_YEAR === 0
                ? `Year ${year} complete — Annual report follows`
                : `Turn ${turnInYear} of ${TURNS_PER_YEAR} · Year ${year}`
              }
            </div>
            <button className="primary" style={{ marginTop: '1.25rem' }} onClick={handleNext}>
              {collapsed
                ? 'Coalition Collapsed →'
                : turnCount % TURNS_PER_YEAR === 0
                  ? 'Annual Report →'
                  : 'Next Turn →'
              }
            </button>
          </div>
        )}

        {/* ── Phase: Annual Economic Report ── */}
        {phase === 'annual-report' && prevEconForReport && (
          <div className="phase-annual-report">
            <div className="report-year-tag">Year {year} of {TOTAL_YEARS}</div>
            <div className="report-title">Annual Economic Report</div>
            <div className="report-headline">"{reportHeadline}"</div>
            <div className="report-indicators">
              {[
                { label: 'GDP',         value: econState.Y.toLocaleString(),          delta: `${econState.Y >= prevEconForReport.Y ? '▲' : '▼'} ${Math.abs(((econState.Y - prevEconForReport.Y) / prevEconForReport.Y) * 100).toFixed(1)}%`,         cls: econState.Y >= prevEconForReport.Y ? 'loyalty-up' : 'loyalty-down' },
                { label: 'Unemployment', value: `${(econState.u * 100).toFixed(1)}%`, delta: `${econState.u <= prevEconForReport.u ? '▼' : '▲'} ${Math.abs((econState.u - prevEconForReport.u) * 100).toFixed(1)}pp`,                                   cls: econState.u <= prevEconForReport.u ? 'loyalty-up' : 'loyalty-down' },
                { label: 'Inflation',   value: `${(econState.pi * 100).toFixed(1)}%`, delta: `${econState.pi >= prevEconForReport.pi ? '▲' : '▼'} ${Math.abs((econState.pi - prevEconForReport.pi) * 100).toFixed(1)}pp`,                               cls: econState.pi <= 0.025 ? 'loyalty-up' : econState.pi <= 0.04 ? 'loyalty-neutral' : 'loyalty-down' },
                { label: 'Deficit',     value: `${econState.deficit > 0 ? '+' : ''}${econState.deficit}`,                                                                                                                           delta: `${econState.deficit <= prevEconForReport.deficit ? '▼' : '▲'} vs last year`,                    cls: econState.deficit <= prevEconForReport.deficit ? 'loyalty-up' : 'loyalty-down' },
                { label: 'Public Debt', value: econState.debt.toLocaleString(),        delta: `${econState.debt > prevEconForReport.debt ? '▲' : '▼'} +${econState.debt - prevEconForReport.debt}`,                                                       cls: econState.debt <= prevEconForReport.debt ? 'loyalty-up' : 'loyalty-down' },
              ].map(ind => (
                <div key={ind.label} className="report-ind">
                  <div className="report-ind-label">{ind.label}</div>
                  <div className="report-ind-value">{ind.value}</div>
                  <div className={`report-ind-delta ${ind.cls}`}>{ind.delta}</div>
                </div>
              ))}
            </div>
            <button className="primary" style={{ marginTop: '1.5rem' }} onClick={closeAnnualReport}>
              {year < TOTAL_YEARS ? `Begin Year ${year + 1} →` : 'Proceed to Vote of Confidence →'}
            </button>
          </div>
        )}

        {/* ── Phase: Vote of Confidence ── */}
        {phase === 'confidence-vote' && (
          <div className="phase-confidence">
            <div className="report-year-tag">End of Session</div>
            <div className="report-title">Vote of Confidence</div>
            <p className="confidence-desc">
              The three-year parliamentary term concludes. The chamber votes on whether
              the government retains its mandate.
            </p>
            <div className="confidence-parties">
              {govParties.map(p => {
                const isPlayer = p === party;
                const loy  = !isPlayer ? (loyalty[p.name] ?? 100) : 100;
                const ayes = isPlayer ? p.seats : Math.floor(loy / 100 * p.seats);
                return (
                  <div key={p.name} className="confidence-party-row">
                    <span className="swatch" style={{ background: p.color }} />
                    <span className="confidence-party-name" style={{ color: p.color }}>{p.name}</span>
                    {isPlayer && <span className="you-tag">YOU</span>}
                    <div className="confidence-bar">
                      <div className="confidence-bar-fill" style={{ width: `${loy}%`, background: `${p.color}40` }} />
                    </div>
                    <span className="confidence-ayes">{ayes} ayes</span>
                  </div>
                );
              })}
            </div>
            <div className={`confidence-verdict confidence-verdict--${confidentVote.passes ? 'pass' : 'fail'}`}>
              {confidentVote.passes ? 'CONFIDENCE MAINTAINED ✓' : 'CONFIDENCE LOST ✗'}
            </div>
            <div className="confidence-total">
              {confidentVote.govAyes} ayes in favour · majority: {majority}
            </div>
            <button className="primary" style={{ marginTop: '1.5rem' }} onClick={closeConfidenceVote}>
              End Session →
            </button>
          </div>
        )}

        {/* ── Phase: Finance Ministry ── */}
        {phase === 'finance' && (
          <div className="finance-document">
            <div className="finance-toolbar">
              <button className="finance-back-btn" onClick={() => setPhase('policy')}>← Back</button>
              <span className="finance-toolbar-title">Economic Analysis</span>
              <span className="finance-toolbar-meta">{ECONOMIC_HISTORY.length + 1 + yearHistory.length} periods on record</span>
            </div>

            <div className="finance-section-hdr finance-section-hdr--indicators">
              <span className="finance-section-hdr-icon">▣</span> Current Period Indicators
            </div>
            <div className="finance-table">
              <div className="finance-th">Indicator</div>
              <div className="finance-th finance-th--num">Value</div>
              <div className="finance-th">Status</div>

              <div className="finance-td">GDP</div>
              <div className="finance-td finance-td--num">{econState.Y.toLocaleString()}</div>
              <div className={`finance-td finance-td--${econState.Y >= econState.Y_star ? 'up' : 'down'}`}>{econState.Y >= econState.Y_star ? '▲ above potential' : '▼ below potential'}</div>

              <div className="finance-td">Potential GDP</div>
              <div className="finance-td finance-td--num">{econState.Y_star.toLocaleString()}</div>
              <div className="finance-td">+{((currentEconParams.potential_growth + (3 - domainState.border) * 0.001) * 100).toFixed(1)}%/yr trend</div>

              <div className="finance-td">Unemployment</div>
              <div className="finance-td finance-td--num">{(econState.u * 100).toFixed(1)}%</div>
              <div className="finance-td">natural rate: {((ECON_PARAMS.u_star + (domainState.border - 3) * 0.003) * 100).toFixed(1)}%</div>

              <div className="finance-td">Inflation</div>
              <div className="finance-td finance-td--num">{(econState.pi * 100).toFixed(1)}%</div>
              <div className={`finance-td finance-td--${econState.pi > 0.04 ? 'down' : econState.pi > 0.02 ? 'neutral' : 'up'}`}>{econState.pi > 0.04 ? 'above target' : econState.pi > 0.02 ? 'moderate' : 'below target'}</div>

              <div className="finance-td">Expected Inflation</div>
              <div className="finance-td finance-td--num">{(econState.pi_expected * 100).toFixed(1)}%</div>
              <div className="finance-td">adaptive expectations</div>

              <div className="finance-td">Interest Rate</div>
              <div className="finance-td finance-td--num">{(econState.i * 100).toFixed(1)}%</div>
              <div className="finance-td">independent central bank</div>

              <div className="finance-td">Deficit / Surplus</div>
              <div className="finance-td finance-td--num">{econState.deficit > 0 ? '+' : ''}{econState.deficit}</div>
              <div className="finance-td">{((econState.deficit / econState.Y) * 100).toFixed(1)}% of GDP</div>

              <div className="finance-td finance-td--last">Public Debt</div>
              <div className="finance-td finance-td--num finance-td--last">{econState.debt.toLocaleString()}</div>
              <div className="finance-td finance-td--last">{Math.round(econState.debt / econState.Y * 100)}% of GDP</div>
            </div>

            <div className="finance-section-hdr finance-section-hdr--charts">
              <span className="finance-section-hdr-icon">◈</span> Historical Time Series
              <span className="finance-section-hdr-legend">
                <span className="finance-hdr-legend-divider" /> Gov. formation
              </span>
            </div>
            <div className="finance-charts">

              {/* GDP */}
              <div className="finance-chart-block">
                <div className="finance-chart-label">GDP &amp; Potential GDP</div>
                <svg viewBox={`0 0 ${FC_W} ${FC_H}`} className="finance-chart-svg">
                  {_gT.map(tick => { const ty = cPy(tick, _gR[0], _gR[1]); return (
                    <g key={tick}>
                      <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" strokeWidth="1"/>
                      <text x={FC_LM - 4} y={ty + 3.5} textAnchor="end" fill="#5a6e7a" fontSize="9" fontFamily="Inconsolata,monospace">{fmtInt(tick)}</text>
                    </g>
                  );})}
                  <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" strokeWidth="0.8"/>
                  {_xL.map(({ i, year: yr }) => { const lx = cPx(i, _n); return (
                    <g key={i}>
                      <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" strokeWidth="0.8"/>
                      <text x={lx} y={FC_TM + FC_PH + 14} textAnchor="middle" fill="#5a6e7a" fontSize="8" fontFamily="Inconsolata,monospace">{yr === 0 ? '0' : yr > 0 ? `Y${yr}` : yr}</text>
                    </g>
                  );})}
                  <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" strokeWidth="1" strokeDasharray="3,2"/>
                  <polyline points={cPts(allEconData, 'Y_star', _gR[0], _gR[1])} fill="none" stroke="#4472c4" strokeWidth="1.2" strokeDasharray="3,2"/>
                  <polyline points={cPts(allEconData, 'Y',      _gR[0], _gR[1])} fill="none" stroke="#217346" strokeWidth="2"/>
                </svg>
                <div className="finance-chart-legend">
                  <span className="finance-legend-item"><span className="finance-legend-dot" style={{ background: '#217346' }}/>GDP</span>
                  <span className="finance-legend-item"><span className="finance-legend-dash"/>Potential</span>
                </div>
              </div>

              {/* Unemployment */}
              <div className="finance-chart-block">
                <div className="finance-chart-label">Unemployment (%)</div>
                <svg viewBox={`0 0 ${FC_W} ${FC_H}`} className="finance-chart-svg">
                  {_uT.map(tick => { const ty = cPy(tick, _uR[0], _uR[1]); return (
                    <g key={tick}>
                      <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" strokeWidth="1"/>
                      <text x={FC_LM - 4} y={ty + 3.5} textAnchor="end" fill="#5a6e7a" fontSize="9" fontFamily="Inconsolata,monospace">{fmtPct(tick)}</text>
                    </g>
                  );})}
                  <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" strokeWidth="0.8"/>
                  {_xL.map(({ i, year: yr }) => { const lx = cPx(i, _n); return (
                    <g key={i}>
                      <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" strokeWidth="0.8"/>
                      <text x={lx} y={FC_TM + FC_PH + 14} textAnchor="middle" fill="#5a6e7a" fontSize="8" fontFamily="Inconsolata,monospace">{yr === 0 ? '0' : yr > 0 ? `Y${yr}` : yr}</text>
                    </g>
                  );})}
                  <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" strokeWidth="1" strokeDasharray="3,2"/>
                  <polyline points={cPts(allEconData, 'u_pct', _uR[0], _uR[1])} fill="none" stroke="#c2410c" strokeWidth="2"/>
                </svg>
              </div>

              {/* Inflation */}
              <div className="finance-chart-block">
                <div className="finance-chart-label">Inflation (%)</div>
                <svg viewBox={`0 0 ${FC_W} ${FC_H}`} className="finance-chart-svg">
                  {_piT.map(tick => { const ty = cPy(tick, _piR[0], _piR[1]); return (
                    <g key={tick}>
                      <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" strokeWidth="1"/>
                      <text x={FC_LM - 4} y={ty + 3.5} textAnchor="end" fill="#5a6e7a" fontSize="9" fontFamily="Inconsolata,monospace">{fmtPct(tick)}</text>
                    </g>
                  );})}
                  <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" strokeWidth="0.8"/>
                  {_xL.map(({ i, year: yr }) => { const lx = cPx(i, _n); return (
                    <g key={i}>
                      <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" strokeWidth="0.8"/>
                      <text x={lx} y={FC_TM + FC_PH + 14} textAnchor="middle" fill="#5a6e7a" fontSize="8" fontFamily="Inconsolata,monospace">{yr === 0 ? '0' : yr > 0 ? `Y${yr}` : yr}</text>
                    </g>
                  );})}
                  <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" strokeWidth="1" strokeDasharray="3,2"/>
                  <polyline points={cPts(allEconData, 'pi_pct', _piR[0], _piR[1])} fill="none" stroke="#b91c1c" strokeWidth="2"/>
                </svg>
              </div>

              {/* Public Debt */}
              <div className="finance-chart-block">
                <div className="finance-chart-label">Public Debt</div>
                <svg viewBox={`0 0 ${FC_W} ${FC_H}`} className="finance-chart-svg">
                  {_dT.map(tick => { const ty = cPy(tick, _dR[0], _dR[1]); return (
                    <g key={tick}>
                      <line x1={FC_LM} y1={ty} x2={FC_W - FC_RM} y2={ty} stroke="#dde5ec" strokeWidth="1"/>
                      <text x={FC_LM - 4} y={ty + 3.5} textAnchor="end" fill="#5a6e7a" fontSize="9" fontFamily="Inconsolata,monospace">{fmtInt(tick)}</text>
                    </g>
                  );})}
                  <line x1={FC_LM} y1={FC_TM + FC_PH} x2={FC_W - FC_RM} y2={FC_TM + FC_PH} stroke="#a8bcc8" strokeWidth="0.8"/>
                  {_xL.map(({ i, year: yr }) => { const lx = cPx(i, _n); return (
                    <g key={i}>
                      <line x1={lx} y1={FC_TM + FC_PH} x2={lx} y2={FC_TM + FC_PH + 3} stroke="#a8bcc8" strokeWidth="0.8"/>
                      <text x={lx} y={FC_TM + FC_PH + 14} textAnchor="middle" fill="#5a6e7a" fontSize="8" fontFamily="Inconsolata,monospace">{yr === 0 ? '0' : yr > 0 ? `Y${yr}` : yr}</text>
                    </g>
                  );})}
                  <line x1={_gsX} y1={FC_TM} x2={_gsX} y2={FC_TM + FC_PH} stroke="#4472c4" strokeWidth="1" strokeDasharray="3,2"/>
                  <polyline points={cPts(allEconData, 'debt', _dR[0], _dR[1])} fill="none" stroke="#7c3aed" strokeWidth="2"/>
                </svg>
              </div>

            </div>
          </div>
        )}

      </div>{/* /.action-panel */}


      {/* ════════════════════════════════════════════════════
          RIGHT: Context sidebar
      ════════════════════════════════════════════════════ */}
      <div className="context-sidebar">

        <div className="sidebar-card sidebar-card--flush">
          <div className="sidebar-card-header">Chamber</div>
          <svg viewBox="0 0 680 380" xmlns="http://www.w3.org/2000/svg">
            {seats.map((seat, i) => {
              const p     = PARTIES[seat.partyIndex];
              const inGov = govIndices.has(seat.partyIndex);
              const vote  = votes[i];
              return (
                <circle key={i}
                  cx={seat.x} cy={seat.y} r="5"
                  fill={vote === 'nay' ? 'none' : p.color}
                  stroke={vote === 'nay' ? p.color : 'none'}
                  strokeWidth={vote === 'nay' ? '1.5' : undefined}
                  opacity={vote === 'aye' ? 1 : vote === 'nay' ? 0.55 : inGov ? 1 : 0.3}
                >
                  <title>{p.name}{vote ? ` — ${vote.toUpperCase()}` : ''}</title>
                </circle>
              );
            })}
          </svg>
          <div className="sidebar-caption">{total} seats · Majority: {majority}</div>
        </div>

        <div className="sidebar-card">
          <div className="sidebar-card-header">
            Government
            <span className="sidebar-card-stat">{govSeats} / {total} seats · {pct(govSeats)}%</span>
          </div>
          {govParties.map(p => {
            const isPlayer = p === party;
            const loy      = !isPlayer ? (loyalty[p.name] ?? 100) : null;
            const loyCls   = loy !== null ? loyaltyCls(loy) : '';
            return (
              <div key={p.name} className={`sidebar-party-row${isPlayer ? ' sidebar-party-row--player' : ''}`}>
                <div className="sidebar-party-row-top">
                  <span className="swatch" style={{ background: p.color }} />
                  <span className="sidebar-party-name">{p.name}</span>
                  {isPlayer && <span className="you-tag">YOU</span>}
                  <span className="sidebar-party-seats">{p.seats}</span>
                </div>
                {loy !== null && (
                  <>
                    <div className="sidebar-loyalty-track">
                      <div className={`sidebar-loyalty-fill ${loyCls}`} style={{ width: `${loy}%` }} />
                    </div>
                    <div className={`sidebar-loyalty-label ${loyCls}`}>Loyalty: {loy.toFixed(1)}%</div>
                  </>
                )}
                <div className="sidebar-party-ideology">{econLabel(p.economic)} · {socialLabel(p.social)}</div>
              </div>
            );
          })}
        </div>

        <div className="sidebar-card sidebar-card--dim">
          <div className="sidebar-card-header">
            Opposition
            <span className="sidebar-card-stat">{oppSeats} / {total} seats · {pct(oppSeats)}%</span>
          </div>
          {oppParties.map(p => (
            <div key={p.name} className="sidebar-opp-row">
              <span className="swatch" style={{ background: p.color }} />
              <span className="sidebar-party-name">{p.name}</span>
              <span className="sidebar-opp-ideology">{econLabel(p.economic)} · {socialLabel(p.social)}</span>
              <span className="sidebar-party-seats">{p.seats}</span>
            </div>
          ))}
        </div>

        <div className="sidebar-card sidebar-card--flush">
          <div className="sidebar-card-header">Political Ideology</div>
          <svg viewBox="0 0 280 280" xmlns="http://www.w3.org/2000/svg">
            <rect x={CP} y={CP} width={CS} height={CS} fill="#14121e"/>
            <rect x={CP} y={CP} width={CS} height={CS} fill="none" stroke="#1c1a2c" strokeWidth="1"/>
            <line x1={CP} y1={cy0} x2={CP + CS} y2={cy0} stroke="#1c1a2c" strokeWidth="1"/>
            <line x1={cx0} y1={CP} x2={cx0} y2={CP + CS} stroke="#1c1a2c" strokeWidth="1"/>
            <text x={cx0} y={CP - 6}      fill="#64748b" fontSize="9" fontFamily="Inconsolata, monospace" textAnchor="middle" letterSpacing="0.04em">Authoritarian</text>
            <text x={cx0} y={CP + CS + 14} fill="#64748b" fontSize="9" fontFamily="Inconsolata, monospace" textAnchor="middle" letterSpacing="0.04em">Libertarian</text>
            <text x={CP - 4}      y={cy0 + 4} fill="#64748b" fontSize="9" fontFamily="Inconsolata, monospace" textAnchor="end"    letterSpacing="0.04em">Left</text>
            <text x={CP + CS + 4} y={cy0 + 4} fill="#64748b" fontSize="9" fontFamily="Inconsolata, monospace" textAnchor="start"  letterSpacing="0.04em">Right</text>
            {PARTIES.map(p => {
              const px   = mapX(p.economic);
              const py   = mapY(p.social);
              const isP  = p === party;
              const abbr = partyAbbr(p);
              return (
                <g key={p.name}>
                  <circle cx={px} cy={py} r={isP ? 7 : 5} fill={p.color} opacity="1">
                    <title>{p.name}</title>
                  </circle>
                  <text
                    x={px + (px <= cx0 ? 9 : -9)} y={py + 4}
                    fill={p.color} fontSize="8" fontFamily="Inconsolata, monospace"
                    textAnchor={px <= cx0 ? 'start' : 'end'}
                  >{abbr}</text>
                </g>
              );
            })}
          </svg>
        </div>

        {party?.caucuses?.length > 0 && (
          <div className="sidebar-card">
            <div className="sidebar-card-header">{party.name} — Caucuses</div>
            {party.caucuses.map((caucus, i) => (
              <div key={caucus.name} className={`sidebar-caucus-item${i === party.caucuses.length - 1 ? ' sidebar-caucus-item--last' : ''}`}>
                <div className="sidebar-caucus-dot" style={{ background: party.color, opacity: 1 - i * 0.25 }} />
                <div className="sidebar-caucus-body">
                  <div className="sidebar-caucus-name">{caucus.name}</div>
                  <div className="sidebar-caucus-desc">{caucus.desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {phase === 'result' && !abstained && voteResult && (
          <div className="sidebar-card">
            <div className="sidebar-card-header">Vote Tally</div>
            <div className="vote-sidebar-tally">
              Ayes: <strong>{voteResult.ayes}</strong> &nbsp;·&nbsp;
              Nays: <strong>{voteResult.nays}</strong> &nbsp;·&nbsp;
              Majority: {majority}
            </div>
            {voteResult.passed && Object.keys(voteResult.loyaltyChanges).length > 0 && (
              <div className="vote-loyalty-changes">
                {Object.entries(voteResult.loyaltyChanges).map(([name, c]) => {
                  const sign = c.delta >= 0 ? '+' : '';
                  const cls  = c.delta > 0 ? 'loyalty-up' : c.delta < 0 ? 'loyalty-down' : 'loyalty-neutral';
                  return (
                    <div key={name} className={`vote-loyalty-change ${cls}`}>
                      {name}: {c.prev.toFixed(1)}% → {c.next.toFixed(1)}%
                      <span className="vote-loyalty-delta">({sign}{c.delta.toFixed(1)}%)</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>{/* /.context-sidebar */}

    </div>
  );
}
