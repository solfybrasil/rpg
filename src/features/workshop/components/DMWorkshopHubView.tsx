import { BookOpen, Hammer, Store } from 'lucide-react';
import React, { useState } from 'react';
import { useGameState } from '../../../shared/hooks/baseHooks';
import { DMPageHeader, DMStatusPill, DMTabs, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';
import { DMMarketView } from '../../market/components/DMMarketView.tsx';
import { DMRecipesTab } from './DMRecipesTab.tsx';
import { DMWorkshopControlTab } from './DMWorkshopControlTab.tsx';

export type WorkshopHubTab = 'oficina' | 'receitas' | 'loja';

export const DMWorkshopHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WorkshopHubTab>('oficina');
  const { gameState } = useGameState();

  const forgeAvailable = Boolean(gameState?.forge_available);
  const alchemyAvailable = gameState?.descanso_evento !== 'alchemy_closed';
  const shopOpen = Boolean(gameState?.shop_open);

  return (
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader
        title="Oficina"
        subtitle="Bancadas, receitas e loja."
        actions={
          <>
            <DMStatusPill on={forgeAvailable} label="Forja" />
            <DMStatusPill on={alchemyAvailable} label="Alquimia" />
            <DMStatusPill on={shopOpen} label="Loja" />
          </>
        }
      />

      <DMTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'oficina', label: 'Bancadas', icon: Hammer, testId: 'tab-oficina' },
          { id: 'receitas', label: 'Receitas', icon: BookOpen, testId: 'tab-receitas' },
          { id: 'loja', label: 'Mercado', icon: Store, testId: 'tab-loja' },
        ]}
      />

      {activeTab === 'oficina' && <DMWorkshopControlTab />}
      {activeTab === 'receitas' && <DMRecipesTab />}
      {activeTab === 'loja' && <DMMarketView />}
    </div>
  );
};
