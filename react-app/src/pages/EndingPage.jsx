import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PARTIES, ENDINGS } from '$lib/data.js';
import useGameStore from '$lib/store.js';

function loyaltyCls(loy) {
  return loy >= 60 ? 'loyalty-up' : loy >= 30 ? 'loyalty-neutral' : 'loyalty-down';
}

export default function EndingPage() {
  const navigate = useNavigate();

  const party           = useGameStore((s) => s.playerParty);
  const coalition       = useGameStore((s) => s.selectedCoalition);
  const goals           = useGameStore((s) => s.committedGoals);
  const mandate         = useGameStore((s) => s.playerMandate);
  const ending          = useGameStore((s) => s.endingData);
  const setHeaderAccent = useGameStore((s) => s.setHeaderAccent);
  const resetGame       = useGameStore((s) => s.resetGame);

  // Derive tier before effects so the header-accent effect can depend on it.
  const mandateMet = (mandate && ending?.stats)
    ? mandate.check(ending.stats.policyState ?? {}, ending.stats)
    : false;

  const tier =
    ending?.collapsed                        ? 'collapse'
    : mandateMet                             ? 'high'
    : (ending?.stats?.billsPassed ?? 0) >= 5 ? 'mid'
    : 'low';

  const verdictColor =
    tier === 'high' ? '#22c55e' :
    tier === 'mid'  ? '#d97706' : '#f87171';

  // Redirect if we landed here without a completed game.
  useEffect(() => {
    if (!party || !coalition || !ending?.stats) {
      navigate('/select', { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the masthead rule colour in sync with the verdict.
  useEffect(() => {
    setHeaderAccent(verdictColor);
  }, [tier]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!party || !coalition || !ending?.stats) return null;

  const verdictLabel =
    tier === 'collapse' ? 'Coalition Collapsed' :
    tier === 'high'     ? 'Mandate Achieved'    :
    tier === 'mid'      ? 'Partial Mandate'     : 'Mandate Failed';

  const endingText = ENDINGS[coalition.id]?.[party.name]?.[tier] ?? '';
  const titleText  = coalition.titles?.[party.name] ?? '';

  const partners = coalition.parties
    .filter(n => n !== party.name)
    .map(n => PARTIES.find(p => p.name === n));

  const goalEntries = Object.entries(goals).map(([partnerName, goal]) => ({
    partnerName,
    goal,
    partner: PARTIES.find(p => p.name === partnerName),
    met: goal.check(ending.stats.policyState ?? {}, ending.stats),
  }));

  function playAgain() {
    resetGame();
    navigate('/select');
  }

  return (
    <>
      <div
        className="ending-verdict-stamp"
        style={{ color: verdictColor, borderColor: `${verdictColor}40` }}
      >
        {verdictLabel}
      </div>
      <h2 className="ending-headline">{titleText}</h2>

      <div className="ending-stats">
        {ending.collapsed && (
          <div className="ending-stat-row ending-stat-collapse">
            Coalition collapsed mid-session
          </div>
        )}

        {mandate && (
          <div className="ending-stat-row ending-mandate-row">
            <span className="swatch" style={{ background: party.color }} />
            <span style={{ color: party.color }}>{party.name}</span>
            {' '}mandate — {mandate.title}:{' '}
            <strong className={mandateMet ? 'loyalty-up' : 'loyalty-down'}>
              {mandateMet ? '✓ Achieved' : '✗ Failed'}
            </strong>
          </div>
        )}

        <div className="ending-stat-row">
          Bills proposed: <strong>{ending.billsProposed}</strong>
        </div>

        {partners.map(p => {
          const loy = ending.finalLoyalty[p.name] ?? 100;
          return (
            <div className="ending-stat-row" key={p.name}>
              <span className="swatch" style={{ background: p.color }} />
              {p.name} final loyalty:{' '}
              <strong className={loyaltyCls(loy)}>{loy.toFixed(1)}%</strong>
            </div>
          );
        })}

        {goalEntries.length > 0 && (
          <>
            <div className="ending-stat-divider" />
            <div className="ending-stat-section-label">Programme for Government</div>
            {goalEntries.map(({ partnerName, goal, partner, met }) => (
              <div className="ending-stat-row" key={partnerName}>
                <span className="swatch" style={{ background: partner?.color ?? '#94a3b8' }} />
                <span style={{ color: partner?.color ?? '#94a3b8' }}>{partnerName}</span>
                {' — '}{goal.title}:{' '}
                <strong className={met ? 'loyalty-up' : 'loyalty-down'}>
                  {met ? '✓ Met' : '✗ Missed'}
                </strong>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="ending-text">{endingText}</div>

      <button className="primary ending-replay-btn" onClick={playAgain}>
        Play Again ↺
      </button>
    </>
  );
}
