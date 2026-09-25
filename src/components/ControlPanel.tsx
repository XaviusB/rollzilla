import { DIE_TYPES, MAX_DICE_PER_TYPE, useDiceStore } from '../store/useDiceStore';

const LABELS: Record<string, string> = {
  d4: 'D4',
  d6: 'D6',
  d8: 'D8',
  d10: 'D10',
  d12: 'D12',
  d20: 'D20',
};

export default function ControlPanel() {
  const counts = useDiceStore((s) => s.counts);
  const setCount = useDiceStore((s) => s.setCount);
  const roll = useDiceStore((s) => s.roll);

  const totalDiceCount = Object.values(counts).reduce((a, b) => a + b, 0);

  const adjust = (type: (typeof DIE_TYPES)[number], delta: number) => {
    setCount(type, (counts[type] ?? 0) + delta);
  };

  return (
    <div className="panel">
      <h1>🎲 Rollzilla</h1>
      <p className="subtitle">Pick your dice, then roll them onto the table.</p>

      <table className="dice-table">
        <thead>
          <tr>
            <th>Die</th>
            <th>Sides</th>
            <th>Count</th>
          </tr>
        </thead>
        <tbody>
          {DIE_TYPES.map((type) => (
            <tr key={type}>
              <td className="die-name">
                <span className="swatch" data-type={type} />
                {LABELS[type]}
              </td>
              <td className="sides-cell">{SIDES_LABEL[type]}</td>
              <td>
                <div className="stepper">
                  <button type="button" onClick={() => adjust(type, -1)} disabled={counts[type] <= 0}>
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={MAX_DICE_PER_TYPE}
                    value={counts[type]}
                    onChange={(e) => setCount(type, Number(e.target.value))}
                  />
                  <button
                    type="button"
                    onClick={() => adjust(type, 1)}
                    disabled={counts[type] >= MAX_DICE_PER_TYPE}
                  >
                    +
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button className="roll-btn" disabled={totalDiceCount === 0} onClick={roll}>
        {totalDiceCount > 0 ? `Roll ${totalDiceCount} dice` : 'Select some dice'}
      </button>
    </div>
  );
}

const SIDES_LABEL: Record<string, number> = {
  d4: 4,
  d6: 6,
  d8: 8,
  d10: 10,
  d12: 12,
  d20: 20,
};
