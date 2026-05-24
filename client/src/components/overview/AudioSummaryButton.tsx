import { useMemo } from 'react';
import { Pause, Play, Square, Volume2 } from 'lucide-react';
import type { OverviewBriefingResponse } from '@command-center/shared';
import { cn } from '@/lib/cn';
import { GlowButton } from '@/components/ui/GlowButton';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

type AudioSummaryButtonProps = {
  briefing: OverviewBriefingResponse | null;
  isLoading?: boolean;
};

const buildSpeechText = (briefing: OverviewBriefingResponse): string => {
  const bullets = briefing.bullets.join('. ');
  return `Here is your overview. ${briefing.headline}. ${bullets}. Focus next: ${briefing.recommendedFocus}.`;
};

export const AudioSummaryButton = ({ briefing, isLoading }: AudioSummaryButtonProps) => {
  const { supported, speaking, paused, speak, pause, resume, stop } = useSpeechSynthesis();

  const speechText = useMemo(() => (briefing ? buildSpeechText(briefing) : ''), [briefing]);

  const handlePrimaryClick = () => {
    if (!speechText) return;
    if (speaking && !paused) {
      pause();
      return;
    }
    if (speaking && paused) {
      resume();
      return;
    }
    speak(speechText, { rate: 1.05 });
  };

  const disabled = !supported || isLoading || !briefing;
  const primaryLabel = speaking && !paused ? 'Pause' : speaking && paused ? 'Resume' : 'Listen';
  const isActiveSpeech = speaking && !paused;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <GlowButton
        size="sm"
        variant="ghost"
        className={cn(isActiveSpeech && 'motion-safe:animate-pulse-slow ring-1 ring-cyan/40')}
        leftIcon={
          speaking && !paused ? <Pause size={14} /> : speaking && paused ? <Play size={14} /> : <Volume2 size={14} />
        }
        onClick={handlePrimaryClick}
        disabled={disabled}
        data-test-id="overview-audio-summary"
        title={
          !supported
            ? 'Speech synthesis is not supported in this browser'
            : !briefing
              ? 'Summary not ready yet'
              : 'Play a short audio recap'
        }
      >
        {primaryLabel}
      </GlowButton>
      {speaking && (
        <GlowButton
          size="sm"
          variant="subtle"
          leftIcon={<Square size={12} />}
          onClick={stop}
          data-test-id="overview-audio-stop"
        >
          Stop
        </GlowButton>
      )}
    </div>
  );
};
