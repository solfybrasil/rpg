import { createFileRoute } from '@tanstack/react-router';
import { AltarView } from '../../features/dm-dashboard/components/AltarView';

export const Route = createFileRoute('/mestre/jogadores')({
  component: AltarView,
});
