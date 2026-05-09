import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logoSrc } from '$lib/data.js';
import useGameStore from '$lib/store.js';

export default function ProgrammePage() {
  const navigate = useNavigate();

  const party             = useGameStore((s) => s.playerParty);
  const partners          = useGameStore((s) => s.coalitionPartners);
  const setCommittedGoals = useGameStore((s) => s.setCommittedGoals);
  const setPlayerMandate  = useGameStore((s) => s.setPlayerMandate);
  const setHeaderAccent   = useGameStore((s) => s.setHeaderAccent);

  const [selected, setSelected] = useState({});   // { [partnerName]: goalObj }
  const [mandate,  setMandate]  = useState(null);

  useEffect(() => {
    if (!party || !partners.length) {
      navigate('/select', { replace: true });
      return;
    }
    setHeaderAccent(party.color);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!party) return null;

  const allDone =
    mandate !== null &&
    partners.length > 0 &&
    partners.every(p => p.name in selected);

  const committedCount = Object.keys(selected).length;

  function pickGoal(partner, goal) {
    setSelected(prev => ({ ...prev, [partner.name]: goal }));
  }

  function confirmProgramme() {
    setCommittedGoals({ ...selected });
    setPlayerMandate(mandate);
    navigate('/parliament');
  }

  return (
    <>
      <button className="back-btn" onClick={() => navigate('/coalition')}>← Back</button>

      <div className="compact-screen-title">Programme for Government</div>
      <div className="compact-screen-subtitle">
        Set your party's mandate for the session, then commit to one goal per coalition partner.
      </div>

      {/* ── Party Mandate ── */}
      <div
        className="compact-partner-section mandate-section"
        style={{ '--partner-color': party.color, borderColor: party.color }}
      >
        <div className="compact-partner-header">
          <img className="compact-partner-logo" src={logoSrc(party.name)} alt="" />
          <div className="partner-header-text">
            <div className="compact-partner-name" style={{ color: party.color }}>
              {party.name}
            </div>
            <div className="compact-partner-prompt">
              {mandate
                ? <span className="partner-committed" style={{ color: party.color }}>✓ {mandate.title}</span>
                : 'Choose your party mandate — this is your primary objective'
              }
            </div>
          </div>
          <span className="mandate-badge">Mandate</span>
        </div>

        <div className="compact-goal-grid">
          {party.mandates.map(m => (
            <div
              key={m.title}
              className={`compact-goal-card${mandate === m ? ' compact-goal-card--selected' : ''}`}
              onClick={() => setMandate(m)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && setMandate(m)}
            >
              <div className="mandate-type-tag">{m.legislative ? 'Legislative' : 'Non-legislative'}</div>
              <div className="compact-goal-title">{m.title}</div>
              <div className="compact-goal-desc">{m.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Progress pips ── */}
      <div className="programme-progress">
        {partners.map(partner => (
          <div
            key={partner.name}
            className={`progress-pip${partner.name in selected ? ' progress-pip--done' : ''}`}
            style={{ '--partner-color': partner.color }}
          />
        ))}
        <span className="progress-label">
          {committedCount} / {partners.length} coalition goals committed
        </span>
      </div>

      {/* ── Partner goal sections ── */}
      {partners.map(partner => (
        <div
          key={partner.name}
          className="compact-partner-section"
          style={{ '--partner-color': partner.color }}
        >
          <div className="compact-partner-header">
            <img className="compact-partner-logo" src={logoSrc(partner.name)} alt="" />
            <div className="partner-header-text">
              <div className="compact-partner-name" style={{ color: partner.color }}>
                {partner.name}
              </div>
              <div className="compact-partner-prompt">
                {selected[partner.name]
                  ? <span className="partner-committed" style={{ color: partner.color }}>
                      ✓ {selected[partner.name].title}
                    </span>
                  : 'Commit to one session goal'
                }
              </div>
            </div>
          </div>

          <div className="compact-goal-grid">
            {partner.goals.map(goal => (
              <div
                key={goal.id}
                className={`compact-goal-card${selected[partner.name] === goal ? ' compact-goal-card--selected' : ''}`}
                onClick={() => pickGoal(partner, goal)}
                role="button"
                tabIndex={0}
                onKeyDown={e => e.key === 'Enter' && pickGoal(partner, goal)}
              >
                {selected[partner.name] === goal && (
                  <span className="goal-check">✓</span>
                )}
                <div className="compact-goal-title">{goal.title}</div>
                <div className="compact-goal-desc">{goal.desc}</div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        className="primary compact-confirm-btn"
        onClick={allDone ? confirmProgramme : undefined}
        disabled={!allDone}
      >
        Confirm Programme →
      </button>
    </>
  );
}
