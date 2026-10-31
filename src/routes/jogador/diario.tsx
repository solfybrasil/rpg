import { createFileRoute } from '@tanstack/react-router';
import { PlayerJournalView } from '../../features/journal';

export const Route = createFileRoute('/jogador/diario')({
  component: PlayerJournalView,
});
