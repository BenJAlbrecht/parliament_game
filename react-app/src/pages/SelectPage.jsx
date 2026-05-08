import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTIES, econLabel, socialLabel, logoSrc } from '$lib/data.js';
import { calculateSeats } from '$lib/layout.js';
import useGameStore from '$lib/store.js';

const arcSeats  = calculateSeats(PARTIES);
const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);

const FLAG_MAP = {
  "People's Alliance":   'flag-pa',
  'Socialist Party':     'flag-sp',
  'Renewal':             'flag-r',
  'Christian Democrats': 'flag-cd',
  'National Front':      'flag-NF',
};

function seatPct(party) {
  return Math.round(party.seats / totalSeats * 100);
}

function compassX(economic) { return (economic + 10) / 20 * 200; }
function compassY(social)   { return (10 - social)  / 20 * 200; }

export default function SelectPage() {
  const navigate = useNavigate();

  const setPlayerParty  = useGameStore((s) => s.setPlayerParty);
  const setHeaderFlag   = useGameStore((s) => s.setHeaderFlag);
  const setHeaderAccent = useGameStore((s) => s.setHeaderAccent);

  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setHeaderFlag('flag-base');
    setHeaderAccent(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the masthead accent in sync with the hovered/selected party.
  useEffect(() => {
    setHeaderAccent(selected?.color ?? null);
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  function confirmParty() {
    setPlayerParty(selected);
    setHeaderFlag(FLAG_MAP[selected.name]);
    navigate('/coalition');
  }

  // ── Grid view ────────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="select-page">
        <aside className="select-lede">
          <svg className="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            {arcSeats.map((seat, i) => {
              const p = PARTIES[seat.partyIndex];
              return (
                <circle key={i} cx={seat.x} cy={seat.y} r="5" fill={p.color} opacity="0.8" />
              );
            })}
          </svg>
          <div className="lede-text">
            <p className="lede-standfirst">
              It is the 80th anniversary of the establishment of the Republic.
            </p>
            <p className="lede-body">
              Modern capitalism and the welfare state promise a new social contract based on
              economic opportunity. The recent fall of the Menshevik regime has given birth to
              a unipolar world, spearheaded by the European Community and its global allies.
              The future of the Republic seems brighter than ever before.
            </p>
          </div>
        </aside>

        <div className="select-right">
          <div className="select-grid-label">Select your party:</div>
          <div id="party-grid">
            {PARTIES.map((party, i) => (
              <div
                key={party.name}
                className="party-card"
                style={{ '--party-color': party.color, borderLeftColor: party.color }}
                onClick={() => setSelected(party)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && setSelected(party)}
              >
                <div className="party-card-header">
                  <span className="party-card-name" style={{ color: party.color }}>{party.name}</span>
                  <img className="party-card-logo" src={logoSrc(party.name)} alt="" />
                </div>
                <div className="party-card-tag">{party.ideology}</div>
                <div className="party-card-summary">{party.bio.summary}</div>
                <div className="party-card-seat-bar">
                  <div
                    className="party-card-seat-fill"
                    style={{ width: `${seatPct(party)}%`, background: party.color }}
                  />
                </div>
                <div className="party-card-footer">
                  <span
                    className="party-card-seats-badge"
                    style={{ borderColor: party.color, color: party.color }}
                  >
                    {party.seats} seats
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Detail view ───────────────────────────────────────────────────────────────
  return (
    <div className="select-page">
      <aside className="select-lede">
        <svg className="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {arcSeats.map((seat, i) => {
            const p = PARTIES[seat.partyIndex];
            return (
              <circle
                key={i}
                cx={seat.x} cy={seat.y} r="5"
                fill={p.color}
                opacity={p === selected ? 1 : 0.1}
              />
            );
          })}
        </svg>

        <div className="detail-lede-panel">
          <div className="detail-lede-top">
            <img className="detail-logo" src={logoSrc(selected.name)} alt="" />
            <div>
              <div className="detail-party-heading" style={{ color: selected.color }}>
                {selected.name}
              </div>
              <div className="detail-ideology-tag">{selected.ideology}</div>
            </div>
          </div>
          <div className="detail-lede-seats">
            <span style={{ color: selected.color }}>{selected.seats} seats</span>
            {' · '}{seatPct(selected)}% of chamber
          </div>
          <button
            className="primary confirm-btn"
            style={{ width: '100%', marginTop: '1rem', borderColor: selected.color, color: selected.color }}
            onClick={confirmParty}
          >
            Lead this party →
          </button>
        </div>
      </aside>

      <div className="select-right">
        <button className="back-btn" style={{ marginBottom: '1rem' }} onClick={() => setSelected(null)}>
          ← Back
        </button>

        <div className="detail-right-grid">
          {/* Compass column */}
          <div className="detail-compass-col">
            <div className="compass-heading">Political Position</div>
            <svg className="compass-svg" viewBox="-52 -22 304 244" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0" y="0" width="200" height="200" fill="none" stroke="#2d2b42" strokeWidth="1" />
              <line x1="0" y1="100" x2="200" y2="100" stroke="#2d2b42" strokeWidth="1" />
              <line x1="100" y1="0" x2="100" y2="200" stroke="#2d2b42" strokeWidth="1" />
              <text textAnchor="middle" x="100" y="-7"  fontSize="9" fill="#475569" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Authoritarian</text>
              <text textAnchor="middle" x="100" y="218" fontSize="9" fill="#475569" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Libertarian</text>
              <text textAnchor="end"    x="-6"  y="104" fontSize="9" fill="#475569" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Left</text>
              <text textAnchor="start"  x="206" y="104" fontSize="9" fill="#475569" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Right</text>
              {PARTIES.map(p => p !== selected && (
                <circle key={p.name} cx={compassX(p.economic)} cy={compassY(p.social)} r="4" fill={p.color} opacity="0.22" />
              ))}
              <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="11" fill="none" stroke={selected.color} strokeWidth="1" opacity="0.3" />
              <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="6"  fill={selected.color} />
            </svg>
            <div className="compass-caption">
              {econLabel(selected.economic)} · {socialLabel(selected.social)}
            </div>
          </div>

          {/* Bio column */}
          <div className="detail-bio-col">
            <p className="detail-summary-text">{selected.bio.summary}</p>
            <p className="detail-history-text">{selected.bio.history}</p>
          </div>
        </div>

        {selected.caucuses?.length > 0 && (
          <div className="caucus-section">
            <div className="caucus-section-label">Internal Caucuses</div>
            <div className="caucus-grid">
              {selected.caucuses.map(caucus => (
                <div key={caucus.name} className="caucus-panel" style={{ borderLeftColor: selected.color }}>
                  <div className="caucus-panel-name">{caucus.name}</div>
                  <p className="caucus-panel-desc">{caucus.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
