import { createFileRoute } from '@tanstack/react-router';
import { DMItemCatalogView } from '../../features/item-catalog/components/DMItemCatalogView';

export const Route = createFileRoute('/mestre/itens')({
  component: DMItemCatalogView,
});
