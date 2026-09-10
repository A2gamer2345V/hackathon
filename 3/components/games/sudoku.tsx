'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eraser, Undo2 } from 'lucide-react';
import { GamePrompt } from '@/components/games/game-ui';
import { HintButton, type PlayHandle } from '@/components/games/game-shell';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { useTranslation } from '@/lib/providers/language-provider';
import { cn, shuffle } from '@/lib/utils';

/**
 * Sudoku, sized for the person playing it rather than for tradition.
 *
 * Grid sizes are 4×4 (2×2 boxes) and 6×6 (2×3 boxes), not 9×9. That is a
 * deliberate accessibility decision: nine columns inside a 390px phone leaves
 * roughly 36px per cell, well under the 44px minimum this app holds itself to,
 * and shrinking the digits to fit would defeat the point. 6×6 with more blanks
 * is the "harder" level instead — the same reasoning, more of the puzzle removed.
 *
 * Everything else follows the brief: one clearly marked selected square, a number
 * pad with large keys, undo, hints, and a plain amber warning when a number
 * clashes. Wrong numbers are allowed onto the board on purpose — being able to
 * see the clash and fix it is the puzzle.
 */

interface Shape {
  size: number;
  boxRows: number;
  boxCols: number;
}

function shapeFor(difficulty: 'easy' | 'medium' | 'hard'): Shape {
  return difficulty === 'easy'
    ? { size: 4, boxRows: 2, boxCols: 2 }
    : { size: 6, boxRows: 2, boxCols: 3 };
}

/** Can `value` go at `index` without repeating in its row, column or box? */
function allows(cells: number[], shape: Shape, index: number, value: number): boolean {
  const { size, boxRows, boxCols } = shape;
  const row = Math.floor(index / size);
  const col = index % size;

  for (let c = 0; c < size; c += 1) {
    if (c !== col && cells[row * size + c] === value) return false;
  }
  for (let r = 0; r < size; r += 1) {
    if (r !== row && cells[r * size + col] === value) return false;
  }

  const baseRow = Math.floor(row / boxRows) * boxRows;
  const baseCol = Math.floor(col / boxCols) * boxCols;
  for (let r = baseRow; r < baseRow + boxRows; r += 1) {
    for (let c = baseCol; c < baseCol + boxCols; c += 1) {
      const i = r * size + c;
      if (i !== index && cells[i] === value) return false;
    }
  }
  return true;
}

/** A complete, valid grid. Backtracking over shuffled candidates. */
function solve(shape: Shape): number[] {
  const total = shape.size * shape.size;
  const cells = new Array<number>(total).fill(0);
  const digits = Array.from({ length: shape.size }, (_, i) => i + 1);

  const fill = (index: number): boolean => {
    if (index === total) return true;
    for (const value of shuffle(digits)) {
      if (!allows(cells, shape, index, value)) continue;
      cells[index] = value;
      if (fill(index + 1)) return true;
      cells[index] = 0;
    }
    return false;
  };

  fill(0);
  return cells;
}

export function Sudoku({ handle }: { handle: PlayHandle }) {
  const { t } = useTranslation();

  const shape = useMemo(() => shapeFor(handle.config.difficulty), [handle.config.difficulty]);
  const total = shape.size * shape.size;

  // The engine sends the number of squares to remove in `rounds`. Never so many
  // that the board is mostly empty.
  const blanks = Math.max(2, Math.min(handle.config.rounds, total - shape.size));

  // Built once per attempt; the shell remounts on "play again".
  const puzzle = useMemo(() => {
    const solution = solve(shape);
    const holes = shuffle(Array.from({ length: total }, (_, i) => i)).slice(0, blanks);
    const given = new Array<boolean>(total).fill(true);
    holes.forEach((i) => {
      given[i] = false;
    });
    return { solution, given };
  }, [blanks, shape, total]);

  const [cells, setCells] = useState<number[]>(() =>
    puzzle.solution.map((value, i) => (puzzle.given[i] ? value : 0)),
  );
  const [selected, setSelected] = useState<number | null>(null);
  const [history, setHistory] = useState<Array<{ index: number; previous: number }>>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [wrongAttempts, setWrongAttempts] = useState(0);
  const [message, setMessage] = useState('');

  const filled = cells.filter((value, i) => !puzzle.given[i] && value !== 0).length;

  /** Squares holding a number that repeats in their row, column or box. */
  const clashes = useMemo(() => {
    const out = new Set<number>();
    cells.forEach((value, index) => {
      if (value !== 0 && !allows(cells, shape, index, value)) out.add(index);
    });
    return out;
  }, [cells, shape]);

  const done = filled === blanks && clashes.size === 0;

  useEffect(() => {
    handle.setProgress(filled, blanks);
  }, [blanks, filled, handle]);

  useEffect(() => {
    if (!done) return;
    const id = setTimeout(() => {
      // Accuracy that reflects the work: squares placed against attempts made.
      handle.complete(blanks, blanks + wrongAttempts, { key: 'sudoku.solved' });
    }, 900);
    return () => clearTimeout(id);
    // Read once when the board completes; must not re-arm on later changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const place = useCallback(
    (value: number) => {
      if (selected === null) {
        setMessage(t('sudoku.selectCellFirst'));
        return;
      }
      if (puzzle.given[selected]) return;

      const previous = cells[selected];
      const next = [...cells];
      next[selected] = value;
      setCells(next);
      setHistory((h) => [...h, { index: selected, previous }]);

      if (value === 0) {
        setMessage('');
        return;
      }

      const ok = allows(next, shape, selected, value);
      if (ok) {
        setMessage('');
        handle.feedback(true);
      } else {
        setWrongAttempts((n) => n + 1);
        setMessage(t('sudoku.clash'));
        handle.feedback(false);
      }
    },
    [cells, handle, puzzle.given, selected, shape, t],
  );

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setCells((current) => {
      const next = [...current];
      next[last.index] = last.previous;
      return next;
    });
    setHistory((h) => h.slice(0, -1));
    setSelected(last.index);
    setMessage('');
  };

  const giveHint = () => {
    // Fill one empty square with its real answer, preferring the selected one.
    const candidates = cells
      .map((value, index) => ({ value, index }))
      .filter(({ value, index }) => !puzzle.given[index] && value !== puzzle.solution[index]);
    const target =
      candidates.find((c) => c.index === selected) ?? candidates[0];
    if (!target) return;

    setHintsUsed((n) => n + 1);
    setHistory((h) => [...h, { index: target.index, previous: cells[target.index] }]);
    setCells((current) => {
      const next = [...current];
      next[target.index] = puzzle.solution[target.index];
      return next;
    });
    setSelected(target.index);
    setMessage(t('sudoku.hintFilled'));
  };

  const labelFor = (index: number) => {
    const row = Math.floor(index / shape.size) + 1;
    const column = (index % shape.size) + 1;
    const value = cells[index];
    if (puzzle.given[index]) return t('sudoku.cellGiven', { row, column, value });
    if (value === 0) return t('sudoku.cellEmpty', { row, column });
    return t('sudoku.cellValue', { row, column, value });
  };

  return (
    <div>
      <GamePrompt hint={t('sudoku.numbersUpTo', { max: shape.size })}>{t('sudoku.rule')}</GamePrompt>

      <div className="mx-auto mb-5 max-w-md">
        <ProgressBar
          value={filled}
          max={blanks}
          label={t('games.answered')}
          valueText={t('sudoku.filled', { done: filled, total: blanks })}
        />
      </div>

      {/* ----------------------------------------------------------- board */}
      <div
        role="grid"
        aria-label={t('game.sudoku.name')}
        className="mx-auto grid w-full max-w-md gap-1 rounded-[var(--radius-card)] border-[3px] border-ink-soft bg-ink-soft p-1"
        style={{ gridTemplateColumns: `repeat(${shape.size}, minmax(0, 1fr))` }}
      >
        {cells.map((value, index) => {
          const isGiven = puzzle.given[index];
          const isSelected = selected === index;
          const clashing = clashes.has(index);
          const row = Math.floor(index / shape.size);
          const col = index % shape.size;
          // A thicker edge where one box ends and the next begins.
          const boxEdgeRight = (col + 1) % shape.boxCols === 0 && col + 1 < shape.size;
          const boxEdgeBottom = (row + 1) % shape.boxRows === 0 && row + 1 < shape.size;

          return (
            <button
              key={index}
              type="button"
              role="gridcell"
              aria-label={labelFor(index)}
              aria-selected={isSelected}
              aria-invalid={clashing || undefined}
              disabled={isGiven}
              onClick={() => {
                setSelected(index);
                setMessage('');
              }}
              className={cn(
                'grid aspect-square min-h-[3rem] place-items-center rounded-[10px]',
                'font-display text-2xl font-bold transition-colors duration-150 sm:text-3xl',
                'focus-visible:outline-3 focus-visible:outline-offset-2 disabled:cursor-default',
                isGiven
                  ? 'bg-surface-sunken text-ink'
                  : clashing
                    ? 'bg-sun-100 text-ink ring-[3px] ring-sun-500 ring-inset'
                    : isSelected
                      ? 'bg-sage-200 text-sage-800 ring-[3px] ring-sage-600 ring-inset'
                      : 'bg-surface-raised text-sage-800 hover:bg-sage-50',
                boxEdgeRight && 'mr-1',
                boxEdgeBottom && 'mb-1',
              )}
            >
              {value === 0 ? '' : value}
            </button>
          );
        })}
      </div>

      {/* Which square is being worked on, in words as well as in colour. */}
      <p aria-live="polite" className="mt-3 text-center text-base text-ink-soft">
        {selected === null
          ? t('sudoku.selectCellFirst')
          : t('sudoku.selected', {
              row: Math.floor(selected / shape.size) + 1,
              column: (selected % shape.size) + 1,
            })}
      </p>

      {message ? (
        <p
          role="status"
          className="mx-auto mt-3 max-w-md rounded-[var(--radius-control)] border-2 border-sun-500 bg-sun-100 p-3 text-center text-lg font-semibold text-ink"
        >
          {message}
        </p>
      ) : null}

      {/* ------------------------------------------------------ number pad */}
      <h2 className="mt-6 text-center text-lg font-semibold text-ink-soft">
        {t('sudoku.chooseNumber')}
      </h2>
      <div
        className="mx-auto mt-3 grid max-w-md gap-2.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(shape.size, 6)}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: shape.size }, (_, i) => i + 1).map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => place(digit)}
            className={cn(
              'grid min-h-[3.75rem] place-items-center rounded-[var(--radius-control)] border-2',
              'border-sage-300 bg-surface-raised font-display text-2xl font-bold text-ink shadow-soft',
              'transition-colors duration-150 hover:border-sage-500 hover:bg-sage-50 active:scale-[0.97]',
              'focus-visible:outline-3 focus-visible:outline-offset-3',
            )}
          >
            {digit}
          </button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => place(0)}
          disabled={selected === null || puzzle.given[selected] || cells[selected] === 0}
          iconLeft={<Eraser aria-hidden className="size-5" />}
        >
          {t('sudoku.erase')}
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={undo}
          disabled={history.length === 0}
          iconLeft={<Undo2 aria-hidden className="size-5" />}
        >
          {t('games.undo')}
        </Button>
        <HintButton handle={handle} used={hintsUsed} onHint={giveHint} />
      </div>
    </div>
  );
}
