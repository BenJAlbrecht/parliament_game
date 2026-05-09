import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PARTIES, DOMAIN_SCALES, DOMAIN_ORDER, STARTING_DOMAINS,
  ECON_PARAMS, STARTING_ECONOMY,
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

// Compass layout
const CP = 38, CS = 280 - 2 * 38;
const cx0 = CP + (10 / 20) * CS;
const cy0 = CP + (10 / 20) * CS;

// ── Pure helpers ──────────────────────────────────────────────────────────────
function computeEcon(prev, billEffect, t) {
  const { mpc, g, tau, tax_baseline } = ECON_PARAMS;
  const G        = Math.max(0, prev.G + (billEffect?.deltaG    ?? 0));
  const tax_rate = Math.max(0.05, Math.min(0.50, prev.tax_rate + (billEffect?.deltaTax ?? 0)));
  const I        = prev.I_base * Math.pow(1 + g, t - 1) * (1 - tau * (tax_rate - tax_baseline));
  const Y        = (I + G) / (1 - mpc * (1 - tax_rate));
  const T        = tax_rate * Y;
  const C        = mpc * (Y - T);
  const growth   = prev.Y > 0 ? Y / prev.Y - 1 : 0;
  return { I_base: prev.I_base, G, tax_rate, I, Y, T, C, growth };
}

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

  const party           = useGameStore((s) => s.playerParty);
  const partners        = useGameStore((s) => s.coalitionPartners);
  const coalition       = useGameStore((s) => s.selectedCoalition);
  const goals           = useGameStore((s) => s.committedGoals);
  const mandate         = useGameStore((s) => s.playerMandate);
  const setEndingData   = useGameStore((s) => s.setEndingData);
  const setHeaderAccent = useGameStore((s) => s.setHeaderAccent);

  // ── Session state ──────────────────────────────────────────────────────────
  const [seats,          setSeats]          = useState([]);
  const [votes,          setVotes]          = useState([]);
  const [loyalty,        setLoyalty]        = useState({});
  const [domainState,    setDomainState]    = useState({ ...STARTING_DOMAINS });
  const [turnCount,      setTurnCount]      = useState(0);
  const [billsProposed,  setBillsProposed]  = useState(0);
  const [turnsAbstained, setTurnsAbstained] = useState(0);
  const [agenda,         setAgenda]         = useState([]);
  const [phase,          setPhase]          = useState('policy');
  const [selectedBill,   setSelectedBill]   = useState(null);
  const [voteResult,     setVoteResult]     = useState(null);
  const [abstained,      setAbstained]      = useState(false);
  const [collapsed,      setCollapsed]      = useState(false);
  const [openDomain,     setOpenDomain]     = useState(null);
  const [econState,      setEconState]      = useState({ ...STARTING_ECONOMY });

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

  const allBlocked = agendaData.length > 0 && agendaData.every(d => !d.passable);

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
    setEconState(prev => computeEcon(prev, null, turnCount));
    setPhase('result');
  }

  function handlePropose() {
    setBillsProposed(prev => prev + 1);
    setAgenda(prev => prev.filter(b => b.title !== selectedBill.title));
    const result = proposeBill(selectedBill);
    setVotes(result.votes);
    setLoyalty({ ...result.newLoyalty });
    setDomainState(getDomainState());
    setEconState(prev => computeEcon(prev, result.econEffect, turnCount));
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
                    const isFiscal      = dim === 'fiscal';
                    const dimScale      = DOMAIN_SCALES[dim] ?? null;
                    const dimLabel      = dimScale?.label ?? (isFiscal ? 'Fiscal Policy' : dim);
                    const curVal        = domainState[dim] ?? 3;
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
                            {isFiscal ? (
                              <div className="domain-fiscal-vals">
                                <span>G:{econState.G.toFixed(0)}</span>
                                <span className="domain-fiscal-sep">·</span>
                                <span>T:{(econState.tax_rate * 100).toFixed(0)}%</span>
                              </div>
                            ) : (
                              <div className="domain-pips">
                                {[1, 2, 3, 4, 5].map(step => (
                                  <div key={step} className={`domain-pip${step <= curVal ? ' domain-pip--filled' : ''}`} />
                                ))}
                              </div>
                            )}
                            <span className="domain-name">{dimLabel}</span>
                            {!isFiscal && <span className="domain-lv">Lv.{curVal}</span>}
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
                              const newVal     = isFiscal ? null : Math.max(1, Math.min(5, curVal + (bill.domainDelta ?? 0)));
                              const targetPole = (bill.domainDelta ?? 0) > 0 ? dimScale?.poles[1] : dimScale?.poles[0];
                              const newStep    = isFiscal ? null : (dimScale?.steps[newVal - 1] ?? '');
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
                                  {bill.econEffect ? (
                                    <div className="agenda-item-effect">
                                      {bill.econEffect.deltaG !== undefined && (
                                        <>
                                          <span className={`effect-delta${bill.econEffect.deltaG > 0 ? ' effect-delta--up' : ' effect-delta--down'}`}>
                                            {bill.econEffect.deltaG > 0 ? '▲' : '▼'}
                                          </span>
                                          <span className="effect-label">
                                            Gov. Spending {bill.econEffect.deltaG > 0 ? '+' : ''}{bill.econEffect.deltaG}
                                          </span>
                                        </>
                                      )}
                                      {bill.econEffect.deltaTax !== undefined && (
                                        <>
                                          <span className={`effect-delta${bill.econEffect.deltaTax > 0 ? ' effect-delta--up' : ' effect-delta--down'}`}>
                                            {bill.econEffect.deltaTax > 0 ? '▲' : '▼'}
                                          </span>
                                          <span className="effect-label">
                                            Tax Rate {bill.econEffect.deltaTax > 0 ? '+' : ''}{(bill.econEffect.deltaTax * 100).toFixed(0)}%
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  ) : (
                                    dimScale && bill.domainDelta && (
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
                                    )
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

                {bill.domainDelta && (() => {
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

                {bill.econEffect && (() => {
                  const effect    = bill.econEffect;
                  const projected = computeEcon(econState, effect, turnCount);
                  const yDelta    = projected.Y - econState.Y;
                  const ySign     = yDelta >= 0 ? '+' : '';
                  return (
                    <div className="bill-section">
                      <div className="bill-section-header">
                        <span className="bill-section-label">Economic Effect</span>
                        <span className="bill-section-note">if passed</span>
                      </div>
                      {effect.deltaG !== undefined && (
                        <div className="bill-econ-row">
                          <span className="bill-econ-key">Gov. Spending (G)</span>
                          <span className="bill-econ-val">
                            {econState.G.toFixed(0)}
                            <span className="bill-bd-sep"> → </span>
                            <span className={effect.deltaG > 0 ? 'loyalty-up' : 'loyalty-down'}>
                              {(econState.G + effect.deltaG).toFixed(0)}&nbsp;({effect.deltaG > 0 ? '+' : ''}{effect.deltaG})
                            </span>
                          </span>
                        </div>
                      )}
                      {effect.deltaTax !== undefined && (
                        <div className="bill-econ-row">
                          <span className="bill-econ-key">Tax Rate</span>
                          <span className="bill-econ-val">
                            {(econState.tax_rate * 100).toFixed(0)}%
                            <span className="bill-bd-sep"> → </span>
                            <span className={effect.deltaTax > 0 ? 'loyalty-up' : 'loyalty-down'}>
                              {((econState.tax_rate + effect.deltaTax) * 100).toFixed(0)}%&nbsp;({effect.deltaTax > 0 ? '+' : ''}{(effect.deltaTax * 100).toFixed(0)}%)
                            </span>
                          </span>
                        </div>
                      )}
                      <div className="bill-econ-row">
                        <span className="bill-econ-key">Projected GDP (Y)</span>
                        <span className="bill-econ-val">
                          {projected.Y.toFixed(0)}&nbsp;
                          <span className={yDelta >= 0 ? 'loyalty-up' : 'loyalty-down'}>
                            ({ySign}{yDelta.toFixed(0)})
                          </span>
                        </span>
                      </div>
                    </div>
                  );
                })()}

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
              Turn {turnCount} of {TOTAL_TURNS}
            </div>
            <button className="primary" style={{ marginTop: '1.25rem' }} onClick={handleNext}>
              {collapsed
                ? 'Coalition Collapsed →'
                : turnCount >= TOTAL_TURNS
                  ? 'End Session →'
                  : 'Next Turn →'
              }
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

        <div className="sidebar-card">
          <div className="sidebar-card-header">Economy</div>
          <div className="econ-kpi-grid">
            <div className="econ-kpi">
              <div className="econ-kpi-label">GDP (Y)</div>
              <div className="econ-kpi-value">{econState.Y.toFixed(0)}</div>
            </div>
            <div className="econ-kpi">
              <div className="econ-kpi-label">Growth</div>
              <div className={`econ-kpi-value ${econState.growth >= 0 ? 'loyalty-up' : 'loyalty-down'}`}>
                {econState.growth >= 0 ? '+' : ''}{(econState.growth * 100).toFixed(1)}%
              </div>
            </div>
            <div className="econ-kpi">
              <div className="econ-kpi-label">Gov. Spending (G)</div>
              <div className="econ-kpi-value">{econState.G.toFixed(0)}</div>
            </div>
            <div className="econ-kpi">
              <div className="econ-kpi-label">Tax Rate</div>
              <div className="econ-kpi-value">{(econState.tax_rate * 100).toFixed(0)}%</div>
            </div>
          </div>
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
