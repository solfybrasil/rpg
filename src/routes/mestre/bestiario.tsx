import { createFileRoute } from '@tanstack/react-router';
import { DMBestiaryView } from '../../features/bestiary';

export const Route = createFileRoute('/mestre/bestiario')({
  component: DMBestiaryView,
});
