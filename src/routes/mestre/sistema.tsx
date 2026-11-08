import { createFileRoute } from '@tanstack/react-router';
import { DMSistemaView } from '../../features/dm-dashboard/components/DMSistemaView';

export const Route = createFileRoute('/mestre/sistema')({
  component: DMSistemaView,
});
