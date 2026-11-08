import { createFileRoute } from '@tanstack/react-router';
import { DMOficinaView } from '../../features/dm-dashboard/components/DMOficinaView';

export const Route = createFileRoute('/mestre/oficina')({
  component: DMOficinaView,
});
