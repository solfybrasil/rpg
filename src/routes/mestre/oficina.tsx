import { createFileRoute } from '@tanstack/react-router';
import { DMWorkshopHubView } from '../../features/workshop/components/DMWorkshopHubView.tsx';

export const Route = createFileRoute('/mestre/oficina')({
  component: DMWorkshopHubView,
});
