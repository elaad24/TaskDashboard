import { useState } from 'react';
import type { ParseResponse } from '@command-center/shared';
import { AIRecommendationCard } from '@/components/cards/AIRecommendationCard';
import { QuickTaskCard } from '@/components/command/QuickTaskCard';
import { useParseBrainDump } from '@/hooks/useNavigator';
import {
  MAKE_COMPLEX_TASK_CORRECTION,
  MAKE_SIMPLE_TASK_CORRECTION,
} from '@/lib/taskComplexityCorrections';

const isSingleSimpleTask = (result: ParseResponse): boolean =>
  result.isSimpleTask &&
  result.items.length === 1 &&
  result.items[0]?.kind === 'task';

type ParseResultCardProps = {
  result: ParseResponse;
  rawInput: string;
  onClose: () => void;
  onConfirmed?: () => void;
};

/**
 * Single owner of parse-result state. Child cards are controlled components —
 * they never hold their own copy of the result; they call callbacks instead.
 */
export const ParseResultCard = ({
  result,
  rawInput,
  onClose,
  onConfirmed,
}: ParseResultCardProps) => {
  const [currentResult, setCurrentResult] = useState(result);
  const [wasCorrected, setWasCorrected] = useState(false);
  const [forceFullReview, setForceFullReview] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  // Accumulate every correction so the AI always has the full instruction history.
  // Without this, each re-analyze call would only see the latest instruction and
  // lose all prior context (e.g. "treat as simple" followed by "add 5 minutes"
  // would forget the first instruction entirely).
  const [correctionHistory, setCorrectionHistory] = useState<Array<string>>([]);

  const reanalyzeMutation = useParseBrainDump();

  const buildCombinedCorrection = (history: Array<string>, newCorrection: string): string => {
    if (history.length === 0) return newCorrection;
    const numbered = [...history, newCorrection]
      .map((c, i) => `[Instruction ${i + 1}]: ${c}`)
      .join('\n');
    return `Apply all of the following instructions in order:\n${numbered}`;
  };

  const handleReanalyze = async (newCorrection: string) => {
    setReanalyzeError(null);
    const combined = buildCombinedCorrection(correctionHistory, newCorrection);
    try {
      const next = await reanalyzeMutation.mutateAsync({ text: rawInput, correction: combined });
      setCurrentResult(next);
      setWasCorrected(true);
      setCorrectionHistory((prev) => [...prev, newCorrection]);
      // if the AI returned a single simple task, drop out of forced-full-review
      if (isSingleSimpleTask(next)) {
        setForceFullReview(false);
      }
    } catch (err) {
      setReanalyzeError(err instanceof Error ? err.message : 'Re-analysis failed. Please try again.');
    }
  };

  const handleMakeSimple = () => void handleReanalyze(MAKE_SIMPLE_TASK_CORRECTION);
  const handleMakeComplex = () => void handleReanalyze(MAKE_COMPLEX_TASK_CORRECTION);

  const showSimpleCard = isSingleSimpleTask(currentResult) && !forceFullReview;

  return (
    <>
      {reanalyzeError && (
        <div
          className="mb-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400"
          data-test-id="reanalyze-error"
        >
          {reanalyzeError}
        </div>
      )}
      {showSimpleCard ? (
        <QuickTaskCard
          result={currentResult}
          rawInput={rawInput}
          onClose={onClose}
          onConfirmed={onConfirmed}
          wasCorrected={wasCorrected}
          isPending={reanalyzeMutation.isPending}
          onReanalyze={handleReanalyze}
          onMakeSimple={handleMakeSimple}
          onMakeComplex={handleMakeComplex}
          onRequestFullReview={() => setForceFullReview(true)}
        />
      ) : (
        <AIRecommendationCard
          result={currentResult}
          rawInput={rawInput}
          onClose={onClose}
          onConfirmed={onConfirmed}
          wasCorrected={wasCorrected}
          isPending={reanalyzeMutation.isPending}
          onReanalyze={handleReanalyze}
          onMakeSimple={handleMakeSimple}
          onMakeComplex={handleMakeComplex}
        />
      )}
    </>
  );
};
