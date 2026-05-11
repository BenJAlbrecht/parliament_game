import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useGameStore from '$lib/store.js';
import { PARTIES, BILLS } from '$lib/data.js';
import {
  calculateBillOutcome,
  calculateLoyaltyDrift,
  formatEffects,
  MAJORITY_THRESHOLD,
} from '$lib/bills.js';
import ParliamentWidget from '../components/ParliamentWidget.jsx';

const CATEGORY_ORDER = ['Fiscal Expansion', 'Fiscal Contraction', 'Tax', 'Structural'];

export default function LegislaturePage() {
  const navigate = useNavigate();

  const party             = useGameStore((s) => s.playerParty);
  const partners          = useGameStore((s) => s.coalitionPartners);
  const coalition         = useGameStore((s) => s.selectedCoalition);
  const setHeaderAccent   = useGameStore((s) => s.setHeaderAccent);
  const coalition_loyalty = useGameStore((s) => s.coalition_loyalty);
  const proposeBill       = useGameStore((s) => s.proposeBill);

  const [selectedBill, setSelectedBill] = useState(null);

  useEffect(() => {
    if (!party || !coalition) { navigate('/select', { replace: true }); return; }
    setHeaderAccent(party.color);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coalitionPartyIds = useMemo(
    () => new Set([party?.name, ...partners.map(p => p.name)]),
    [party, partners],
  );

  const outcome = useMemo(() => {
    if (!selectedBill || !party) return null;
    return calculateBillOutcome({
      bill: selectedBill,
      parties: PARTIES,
      coalitionLoyalty: coalition_loyalty,
      coalitionPartyIds,
    });
  }, [selectedBill, coalition_loyalty, coalitionPartyIds, party]);

  const loyaltyDeltas = useMemo(() => {
    if (!selectedBill) return {};
    return Object.fromEntries(
      partners.map(p => [p.name, calculateLoyaltyDrift(selectedBill, p)]),
    );
  }, [selectedBill, partners]);

  const loyaltyForWidget = useMemo(
    () => Object.fromEntries(partners.map(p => [p.name, Math.round((coalition_loyalty[p.name] ?? 1) * 100)])),
    [partners, coalition_loyalty],
  );

  const billsByCategory = useMemo(() => {
    const grouped = {};
    for (const bill of BILLS) {
      if (!grouped[bill.category]) grouped[bill.category] = [];
      grouped[bill.category].push(bill);
    }
    return CATEGORY_ORDER.filter(c => grouped[c]).map(c => ({ category: c, bills: grouped[c] }));
  }, []);

  function handlePropose() {
    if (!selectedBill) return;
    proposeBill(selectedBill.id);
    navigate('/parliament');
  }

  if (!party) return null;

  return (
    <div className="parliament-layout">

      {/* ════════════════════════════════════════════════════
          LEFT: Bill catalog + preview
      ════════════════════════════════════════════════════ */}
      <div className="action-panel">

        <div className="finance-header">
          <button className="back-btn" onClick={() => navigate('/parliament')}>← Parliament</button>
          <div className="finance-page-title">Legislature</div>
        </div>

        {/* Bill catalog */}
        <div className="leg-catalog">
          {billsByCategory.map(({ category, bills }) => (
            <div key={category} className="leg-category">
              <div className="leg-category-header">{category}</div>
              {bills.map(bill => {
                const effects   = formatEffects(bill.effects);
                const isSelected = selectedBill?.id === bill.id;
                const econSign  = bill.position.economic >= 0 ? '+' : '';
                const socSign   = bill.position.social  >= 0 ? '+' : '';
                return (
                  <div
                    key={bill.id}
                    className={`leg-bill-row${isSelected ? ' leg-bill-row--selected' : ''}`}
                    onClick={() => setSelectedBill(isSelected ? null : bill)}
                  >
                    <div className="leg-bill-row-top">
                      <span className="leg-bill-name">{bill.name}</span>
                      <span className="leg-bill-pos">
                        ({econSign}{bill.position.economic}, {socSign}{bill.position.social})
                      </span>
                    </div>
                    <div className="leg-bill-desc">{bill.description}</div>
                    {effects.length > 0 && (
                      <div className="leg-bill-effects">
                        {effects.map((e, i) => <span key={i} className="leg-effect-chip">{e}</span>)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Preview panel */}
        {selectedBill && outcome && (
          <div className="leg-preview">
            <div className="leg-preview-title">{selectedBill.name}</div>

            <table className="leg-vote-table">
              <thead>
                <tr>
                  <th>Party</th>
                  <th>Seats</th>
                  <th>Loyalty / Δ</th>
                  <th>Yes%</th>
                  <th>Ayes</th>
                </tr>
              </thead>
              <tbody>
                {/* Coalition parties first */}
                {outcome.per_party
                  .filter(r => coalitionPartyIds.has(r.party_id))
                  .sort((a, b) => (a.party_id === party.name ? -1 : b.party_id === party.name ? 1 : 0))
                  .map(r => {
                    const p        = PARTIES.find(p => p.name === r.party_id);
                    const isPlayer = r.party_id === party.name;
                    const loyPct   = isPlayer ? 100 : Math.round((coalition_loyalty[r.party_id] ?? 1) * 100);
                    const delta    = loyaltyDeltas[r.party_id];
                    const deltaSign = delta != null && delta >= 0 ? '+' : '';
                    return (
                      <tr key={r.party_id} className="leg-vote-row leg-vote-coalition">
                        <td>
                          <span className="swatch" style={{ background: p.color }} />
                          {' '}{p.name}
                          {isPlayer && <span className="leg-player-tag"> ★</span>}
                        </td>
                        <td>{p.seats}</td>
                        <td>
                          {isPlayer ? '—' : (
                            <>
                              {loyPct}%
                              {delta != null && (
                                <span className={delta >= 0 ? ' leg-delta-up' : ' leg-delta-dn'}>
                                  {' '}{deltaSign}{(delta * 100).toFixed(1)}pp
                                </span>
                              )}
                            </>
                          )}
                        </td>
                        <td>{(r.pct_yes * 100).toFixed(0)}%</td>
                        <td>{r.votes_yes}</td>
                      </tr>
                    );
                  })}

                {/* Opposition parties */}
                {outcome.per_party
                  .filter(r => !coalitionPartyIds.has(r.party_id))
                  .sort((a, b) => {
                    const pa = PARTIES.find(p => p.name === a.party_id);
                    const pb = PARTIES.find(p => p.name === b.party_id);
                    return (pb?.seats ?? 0) - (pa?.seats ?? 0);
                  })
                  .map(r => {
                    const p = PARTIES.find(p => p.name === r.party_id);
                    return (
                      <tr key={r.party_id} className="leg-vote-row leg-vote-opp">
                        <td>
                          <span className="swatch" style={{ background: p.color }} />
                          {' '}{p.name}
                        </td>
                        <td>{p.seats}</td>
                        <td>—</td>
                        <td>{(r.pct_yes * 100).toFixed(0)}%</td>
                        <td>{r.votes_yes}</td>
                      </tr>
                    );
                  })}

                {/* Total row */}
                <tr className="leg-vote-total">
                  <td colSpan={4}>
                    {outcome.total_yes} ayes / {outcome.total_no} nays
                    {' — '}
                    <span className={outcome.passes ? 'result-passed' : 'result-failed'}>
                      {outcome.passes ? 'PASS' : 'FAIL'}
                    </span>
                    <span className="leg-threshold"> (needs &gt;{MAJORITY_THRESHOLD})</span>
                  </td>
                  <td>{outcome.total_yes}</td>
                </tr>
              </tbody>
            </table>

            <div className="leg-preview-actions">
              <button className="primary" onClick={handlePropose}>Propose This Bill</button>
              <button onClick={() => setSelectedBill(null)}>Cancel</button>
            </div>
          </div>
        )}

      </div>{/* /.action-panel */}

      {/* ════════════════════════════════════════════════════
          RIGHT: Parliament widget
      ════════════════════════════════════════════════════ */}
      <div className="context-sidebar">
        <ParliamentWidget party={party} partners={partners} loyalty={loyaltyForWidget} />
      </div>

    </div>
  );
}
