import { createFileRoute } from '@tanstack/react-router';
import { DMSystemHubView } from '../../features/system';

export const Route = createFileRoute('/mestre/sistema')({
  component: DMSystemHubView,
});
