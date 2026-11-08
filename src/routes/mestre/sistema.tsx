import { createFileRoute } from '@tanstack/react-router';
import { DMSystemHubView } from '../../features/system/components/DMSystemHubView';

export const Route = createFileRoute('/mestre/sistema')({
  component: DMSystemHubView,
});
