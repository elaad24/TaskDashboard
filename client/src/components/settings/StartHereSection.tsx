import { Compass } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';

const START_HERE_ITEMS: Array<string> = [
  'Open Command Center (`/`) each day — Mission Status, urgency metrics, and next actions live there.',
  'Use the top command bar to capture a thought; Navigator turns it into tasks, goals, problems, or logs.',
  'Dump longer notes in Inbox — write messy sentences; Navigator handles batches.',
  'Work → Tasks to execute, Goals to track outcomes, Study for topics, Mission Map for prerequisite chains.',
  'Complete tasks to grow your streak heatmap, Mission XP badge, and tiered celebration effects.',
  'Urgency Engine auto-compares this week vs your rolling 4-week average — no manual targets needed.',
  'Mission Map shows locked tasks until prerequisites are done; completing upstream tasks unlocks downstream nodes.',
  'Areas organize life domains; Logs track time and spend; Search finds anything + Navigator summaries.',
  'Sidebar ticker rotates quotes — customize folders and items under Settings → Sidebar feed.',
  'Settings: pick OpenAI or Ollama, wire Telegram reminders, and manage integrations.',
];

export const StartHereSection = () => (
  <GlassCard className="p-5 lg:col-span-2" data-test-id="settings-start-here">
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-cyan-200">
      <Compass size={12} /> Start here
    </div>
    <p className="mt-2 text-sm text-text-soft">
      Short guide to using Command Center day to day.
    </p>
    <ul className="mt-4 space-y-2 text-sm text-text-main">
      {START_HERE_ITEMS.map((item) => (
        <li key={item} className="flex gap-2 leading-relaxed">
          <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-cyan" aria-hidden />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </GlassCard>
);
