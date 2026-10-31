import { createFileRoute } from '@tanstack/react-router';
import { RecipeBookView } from '../../features/recipes/components/RecipeBookView';

export const Route = createFileRoute('/jogador/receitas')({
  component: RecipeBookView,
});
