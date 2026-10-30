import { createFileRoute } from '@tanstack/react-router';
import { MestreLayout } from '../shared/layouts/MestreLayout.tsx';

export const Route = createFileRoute('/mestre')({
  component: MestreLayout,
});
