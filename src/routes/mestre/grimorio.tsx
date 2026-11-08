import { createFileRoute } from '@tanstack/react-router';
import { DMGrimoireHubView } from '../../features/dm-grimoire/components/DMGrimoireHubView';

export const Route = createFileRoute('/mestre/grimorio')({
  component: DMGrimoireHubView,
});
