import { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { PARTIES, econLabel, socialLabel, logoSrc } from '$lib/data.js';
import { calculateSeats } from '$lib/layout.js';
import useGameStore from '$lib/store.js';

const arcSeats   = calculateSeats(PARTIES);
const totalSeats = PARTIES.reduce((s, p) => s + p.seats, 0);

const arcSeatRanks = (() => {
  const order = arcSeats.map((_, i) => i).sort((a, b) => arcSeats[a].x - arcSeats[b].x);
  const ranks = new Array(arcSeats.length);
  order.forEach((origIdx, rank) => { ranks[origIdx] = rank; });
  return ranks;
})();

const FLAG_MAP = {
  "People's Alliance":   'flag-pa',
  'Socialist Party':     'flag-sp',
  'Renewal':             'flag-r',
  'Christian Democrats': 'flag-cd',
  'National Front':      'flag-NF',
};

const spectrumParties = [...PARTIES].sort((a, b) => a.economic - b.economic);

function withTransition(fn) {
  if (typeof document.startViewTransition !== 'function') { fn(); return; }
  document.startViewTransition(() => flushSync(fn));
}

function seatPct(party) {
  return Math.round(party.seats / totalSeats * 100);
}

function compassX(economic) { return (economic + 10) / 20 * 200; }
function compassY(social)   { return (10 - social)  / 20 * 200; }

export default function SelectPage() {
  const navigate = useNavigate();

  const playerParty     = useGameStore((s) => s.playerParty);
  const setPlayerParty  = useGameStore((s) => s.setPlayerParty);
  const setHeaderFlag   = useGameStore((s) => s.setHeaderFlag);
  const setHeaderAccent = useGameStore((s) => s.setHeaderAccent);

  const [selected,    setSelected]    = useState(playerParty ?? null);
  const [highlighted, setHighlighted] = useState(null);
  const [animReady,   setAnimReady]   = useState(false);
  const [popup,       setPopup]       = useState(null); // { party, x, y, dir }

  const clearHoverTimer = useRef(null);

  useEffect(() => {
    setHeaderFlag('flag-base');
    setHeaderAccent(null);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setHeaderAccent(selected?.color ?? null);
    setHeaderFlag(selected ? FLAG_MAP[selected.name] : 'flag-base');
  }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAnimReady(true);
      return;
    }
    const id = setTimeout(() => setAnimReady(true), 20);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function hoverOn(party, x, y, dir) {
    clearTimeout(clearHoverTimer.current);
    setHighlighted(party);
    setPopup({ party, x, y, dir });
  }

  function hoverOff() {
    clearHoverTimer.current = setTimeout(() => {
      setHighlighted(null);
      setPopup(null);
    }, 40);
  }

  function confirmParty() {
    setPlayerParty(selected);
    setHeaderFlag(FLAG_MAP[selected.name]);
    navigate('/coalition');
  }

  // ── HOME VIEW ──────────────────────────────────────────────────────────────
  if (!selected) {
    return (
      <div className="home-page">

        <div className="home-choose-label">Choose your party:</div>

        {/* Spectrum-ordered party label strip */}
        <div className="party-strip">
          {spectrumParties.map(party => (
            <div
              key={party.name}
              className="party-strip-label"
              style={{ '--party-color': party.color }}
              role="button"
              tabIndex={0}
              onClick={() => withTransition(() => setSelected(party))}
              onKeyDown={e => e.key === 'Enter' && withTransition(() => setSelected(party))}
              onMouseEnter={e => {
                const r = e.currentTarget.getBoundingClientRect();
                hoverOn(party, r.left + r.width / 2, r.bottom + 8, 'below');
              }}
              onMouseLeave={hoverOff}
              onFocus={e => {
                const r = e.currentTarget.getBoundingClientRect();
                hoverOn(party, r.left + r.width / 2, r.bottom + 8, 'below');
              }}
              onBlur={hoverOff}
            >
              <img className="party-strip-logo" src={logoSrc(party.name)} alt="" />
              <span className="party-strip-name" style={{ color: party.color }}>
                {party.name}
              </span>
            </div>
          ))}
        </div>

        {/* Hemicycle arc — visual focus */}
        <svg
          className="home-arc"
          viewBox="55 25 570 292"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Parliament hemicycle"
        >
          {arcSeats.map((seat, i) => {
            const p = PARTIES[seat.partyIndex];
            const opacity = highlighted ? (p === highlighted ? 1 : 0.1) : 0.8;
            return (
              <circle
                key={i}
                cx={seat.x} cy={seat.y} r="5"
                fill={p.color}
                opacity={opacity}
                style={animReady
                  ? { animation: `seat-pop 300ms ease-out ${arcSeatRanks[i] * 2}ms both`, cursor: 'pointer' }
                  : { transform: 'scale(0)', transformBox: 'fill-box', transformOrigin: 'center' }}
                onMouseEnter={e => hoverOn(p, e.clientX, e.clientY - 8, 'above')}
                onMouseLeave={hoverOff}
                onClick={() => withTransition(() => setSelected(p))}
              />
            );
          })}
        </svg>

        {/* Standfirst + body below the arc */}
        <div className="home-lede">
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

        {/* Hover popup */}
        {popup && (
          <div
            className={`party-popup party-popup--${popup.dir}`}
            style={{ left: popup.x, top: popup.y }}
          >
            <div className="party-popup-name" style={{ color: popup.party.color }}>
              {popup.party.name}
            </div>
            <div className="party-popup-seats">
              {popup.party.seats} seats · {seatPct(popup.party)}%
            </div>
            <p className="party-popup-summary">{popup.party.bio.summary}</p>
          </div>
        )}

      </div>
    );
  }

  // ── DETAIL VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="select-page">

      <aside className="select-lede">
        <svg className="mini-arc" viewBox="55 25 570 292" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          {arcSeats.map((seat, i) => {
            const p = PARTIES[seat.partyIndex];
            const opacity = p === selected ? 1 : 0.1;
            return (
              <circle
                key={i}
                cx={seat.x} cy={seat.y} r="5"
                fill={p.color}
                opacity={opacity}
                style={animReady
                  ? { animation: `seat-pop 300ms ease-out ${arcSeatRanks[i] * 2}ms both` }
                  : { transform: 'scale(0)', transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            );
          })}
        </svg>
        <div className="detail-party-sidebar">
          <img className="detail-party-sidebar-logo" src={logoSrc(selected.name)} alt="" />
          <div className="detail-party-sidebar-name" style={{ color: selected.color }}>
            {selected.name}
          </div>
          <div className="detail-party-sidebar-tag">{selected.ideology}</div>
          <div className="detail-party-sidebar-seats">
            <span style={{ color: selected.color }}>{selected.seats} seats</span>
            {' · '}{seatPct(selected)}% of chamber
          </div>
        </div>
      </aside>

      <div className="select-right">
        <div className="detail-action-row">
          <button className="back-btn" onClick={() => withTransition(() => { setPlayerParty(null); setSelected(null); })}>
            ← Back
          </button>
          <button
            className="primary confirm-btn"
            style={{ borderColor: selected.color, color: selected.color }}
            onClick={confirmParty}
          >
            Lead this party →
          </button>
        </div>

        <div className="detail-right-grid">
          <div className="detail-compass-col">
            <div className="compass-heading">Political Position</div>
            <svg className="compass-svg" viewBox="-52 -22 304 244" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="0" y="0" width="200" height="200" fill="#14121e" stroke="#334155" strokeWidth="1" />
              <line x1="0" y1="100" x2="200" y2="100" stroke="#334155" strokeWidth="1" />
              <line x1="100" y1="0" x2="100" y2="200" stroke="#334155" strokeWidth="1" />
              <text textAnchor="middle" x="100" y="-7"  fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Authoritarian</text>
              <text textAnchor="middle" x="100" y="219" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Libertarian</text>
              <text textAnchor="end"    x="-6"  y="104" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Left</text>
              <text textAnchor="start"  x="206" y="104" fontSize="10" fill="#64748b" fontFamily="Inconsolata,monospace" letterSpacing="0.04em">Right</text>
              {PARTIES.map(p => p !== selected && (
                <circle key={p.name} cx={compassX(p.economic)} cy={compassY(p.social)} r="5" fill={p.color} opacity="0.45" />
              ))}
              <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="14" fill="none" stroke={selected.color} strokeWidth="1.5" opacity="0.4" />
              <circle cx={compassX(selected.economic)} cy={compassY(selected.social)} r="7"  fill={selected.color} />
            </svg>
            <div className="compass-caption">
              {econLabel(selected.economic)} · {socialLabel(selected.social)}
            </div>
          </div>

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
