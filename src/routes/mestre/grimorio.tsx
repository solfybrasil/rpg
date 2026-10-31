import { createFileRoute } from '@tanstack/react-router';
import { DMGrimoireHubView } from '../../features/dm-grimoire';

export const Route = createFileRoute('/mestre/grimorio')({
  component: DMGrimoireHubView,
});
