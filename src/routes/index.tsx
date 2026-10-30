import { createFileRoute } from '@tanstack/react-router';
import { SanctuaryScreen } from '../features/landing/components/SanctuaryScreen.tsx';

export const Route = createFileRoute('/')({
  component: SanctuaryScreen,
});
