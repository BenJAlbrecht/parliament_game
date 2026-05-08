import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTIES, COALITIONS } from '$lib/data.js';
import { calculateSeats } from '$lib/layout.js';
import useGameStore from '$lib/store.js';

const arcSeats   = calculateSeats(PARTIES);
const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);
const majority   = Math.floor(totalSeats / 2) + 1;

function seatPct(p) {
  return Math.round(p.seats / totalSeats * 100);
}

function allCoalitionParties(coalition) {
  return coalition.parties.map(n => PARTIES.find(p => p.name === n));
}

export default function CoalitionPage() {
  const navigate = useNavigate();

  const party              = useGameStore((s) => s.playerParty);
  const setSelectedCoalition = useGameStore((s) => s.setSelectedCoalition);
  const setCoalitionPartners = useGameStore((s) => s.setCoalitionPartners);
  const setHeaderAccent      = useGameStore((s) => s.setHeaderAccent);

  const [activeCoalition,  setActiveCoalition]  = useState(null);
  const [hoveredCoalition, setHoveredCoalition] = useState(null);

  useEffect(() => {
    if (!party) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!party) return null;

  const options = party.coalitions.map(id => COALITIONS.find(c => c.id === id));

  function toggleCoalition(coalition) {
    setHoveredCoalition(null);
    setActiveCoalition(prev => prev === coalition ? null : coalition);
  }

  function formCoalition() {
    const partners = activeCoalition.parties
      .filter(n => n !== party.name)
      .map(n => PARTIES.find(p => p.name === n));
    setSelectedCoalition(activeCoalition);
    setCoalitionPartners(partners);
    navigate('/programme');
  }

  const arcCoalition = activeCoalition ?? hoveredCoalition;
  const sideMembers  = activeCoalition ? allCoalitionParties(activeCoalition) : null;
  const sideSeats    = sideMembers ? sideMembers.reduce((s, p) => s + p.seats, 0) : 0;
  const sidePct      = Math.round(sideSeats / totalSeats * 100);
  const sideMaj      = sideSeats >= majority;

  return (
    <div className="coalition-page">

      {/* ── Left: arc + party info + coalition breakdown when active ── */}
      <aside className="coalition-arc-col">
        <svg className="coalition-arc-svg" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {arcSeats.map((seat, i) => {
            const p = PARTIES[seat.partyIndex];
            const opacity = arcCoalition
              ? (arcCoalition.parties.includes(p.name) ? 1 : 0.07)
              : (p.name === party.name ? 1 : 0.15);
            return <circle key={i} cx={seat.x} cy={seat.y} r="5" fill={p.color} opacity={opacity} />;
          })}
        </svg>

        <div className="coalition-arc-caption">
          <span style={{ color: party.color }}>{party.seats} seats</span>
          {' · '}{seatPct(party)}% of chamber
        </div>
        <div className="coalition-you-label" style={{ color: party.color }}>{party.name}</div>

        {sideMembers && (
          <div className="coalition-sidebar-breakdown">
            <div className="coalition-sidebar-label">Coalition</div>
            {sideMembers.map(p => (
              <div key={p.name} className="detail-coalition-member">
                <span className="swatch" style={{ background: p.color }} />
                <span className="detail-coalition-member-name" style={{ color: p.color }}>{p.name}</span>
                {p.name === party.name && <span className="you-tag">YOU</span>}
                <span className="detail-coalition-member-seats">{p.seats} · {seatPct(p)}%</span>
              </div>
            ))}
            <div className={`detail-coalition-total${sideMaj ? ' detail-coalition-total--maj' : ''}`}>
              <span>Total</span>
              <span>{sideSeats} seats · {sidePct}%{sideMaj ? ' ✓' : ''}</span>
            </div>
          </div>
        )}
      </aside>

      {/* ── Right: coalition choice cards ── */}
      <div className="coalition-cards-col">
        <button className="back-btn" onClick={() => navigate('/select')}>← Back</button>
        <div className="coalition-section-label" style={{ marginTop: '0.5rem' }}>
          Choose your coalition
        </div>

        {options.map(c => {
          const members  = allCoalitionParties(c);
          const cSeats   = members.reduce((s, p) => s + p.seats, 0);
          const cPct     = Math.round(cSeats / totalSeats * 100);
          const cMaj     = cSeats >= majority;
          const isActive = activeCoalition === c;

          return (
            <div
              key={c.id}
              className={`coalition-choice-card${isActive ? ' coalition-choice-card--active' : ''}`}
              role="button"
              tabIndex={0}
              onClick={() => toggleCoalition(c)}
              onKeyDown={e => e.key === 'Enter' && toggleCoalition(c)}
              onMouseEnter={() => setHoveredCoalition(c)}
              onMouseLeave={() => setHoveredCoalition(null)}
            >
              <div className="coalition-choice-name">{c.name}</div>

              {members.map(p => (
                <div key={p.name} className="detail-coalition-member">
                  <span className="swatch" style={{ background: p.color }} />
                  <span className="detail-coalition-member-name" style={{ color: p.color }}>{p.name}</span>
                  {p.name === party.name && <span className="you-tag">YOU</span>}
                  <span className="detail-coalition-member-seats">{p.seats} · {seatPct(p)}%</span>
                </div>
              ))}

              <div className={`detail-coalition-total${cMaj ? ' detail-coalition-total--maj' : ''}`}>
                <span>Total</span>
                <span>{cSeats} seats · {cPct}%{cMaj ? ' ✓' : ''}</span>
              </div>

              {isActive && (
                <div className="coalition-card-narrative">
                  <div className="coalition-card-title" style={{ color: party.color }}>
                    {c.titles[party.name]}
                  </div>
                  <p className="coalition-card-scenario">{c.scenarios[party.name]}</p>
                  <button
                    className="primary confirm-btn"
                    style={{ borderColor: party.color, color: party.color }}
                    onClick={e => { e.stopPropagation(); formCoalition(); }}
                  >
                    Form Coalition →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
