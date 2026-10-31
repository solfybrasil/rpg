import { createFileRoute } from '@tanstack/react-router';
import { DMItemCatalogView } from '../../features/item-catalog/index.ts';

export const Route = createFileRoute('/mestre/itens')({
  component: DMItemCatalogView,
});
