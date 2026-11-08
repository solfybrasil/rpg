import { createFileRoute } from '@tanstack/react-router';
import { DMBattleMapEditor } from '../../features/battle-map/components/DMBattleMapEditor';

export const Route = createFileRoute('/mestre/mesa')({
  component: DMBattleMapEditor,
});
