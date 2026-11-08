import { createFileRoute } from '@tanstack/react-router';
import { DMCampanhaView } from '../../features/dm-dashboard/components/DMCampanhaView';

export const Route = createFileRoute('/mestre/campanha')({
  component: DMCampanhaView,
});
