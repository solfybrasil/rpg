import { AlertTriangle, Award, BookOpen, Sparkles } from 'lucide-react';
import type React from 'react';
import { useMemo, useState } from 'react';
import { DMPageHeader, DMTabs, DM_PAGE_CLASS } from '../../../shared/ui/DMPage';
import { DMHeroSpellsTab } from './DMHeroSpellsTab';
import { DMSpellsCatalogTab } from './DMSpellsCatalogTab';
import { DMArbitrationTab } from './DMArbitrationTab';
import { DMOathTreeTab } from './DMOathTreeTab';
import { useAllSpellsCatalog } from '../api/useDMGrimoire';

type DMSubTab = 'grimorio' | 'catalogo' | 'provacoes' | 'arvores';

export const DMGrimoireHubView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DMSubTab>('grimorio');
  const [selectedHeroId, setSelectedHeroId] = useState<string>('kaelis_moonfire');

  const { data: catalog = [] } = useAllSpellsCatalog();

  // Pending count for arbitration badge
  const pendingArbitrationCount = useMemo(
    () =>
      catalog.filter(
        (s) =>
          Boolean(s.revisar_mestre) ||
          (Array.isArray(s.efeitos) && s.efeitos.some((e: any) => e.bloco === 'narrativo')),
      ).length,
    [catalog],
  );

  return (
    <div className={DM_PAGE_CLASS}>
      <DMPageHeader title="Grimórios" subtitle="Magias dos heróis, catálogo, provações e árvores." />

      <DMTabs
        active={activeTab}
        onChange={setActiveTab}
        tabs={[
          { id: 'grimorio', label: 'Heróis', icon: BookOpen, testId: 'dm-tab-grimorio' },
          { id: 'catalogo', label: 'Catálogo', icon: Sparkles, testId: 'dm-tab-catalogo' },
          {
            id: 'provacoes',
            label: 'Provações',
            icon: AlertTriangle,
            badge: pendingArbitrationCount,
            testId: 'dm-tab-provacoes',
          },
          { id: 'arvores', label: 'Árvores', icon: Award, testId: 'dm-tab-arvores' },
        ]}
      />

      {/* Tab Panels */}
      <div>
        {activeTab === 'grimorio' && (
          <DMHeroSpellsTab
            selectedHeroId={selectedHeroId}
            onSelectHeroId={setSelectedHeroId}
            onOpenCatalogForHero={() => setActiveTab('catalogo')}
          />
        )}

        {activeTab === 'catalogo' && (
          <DMSpellsCatalogTab selectedHeroId={selectedHeroId} />
        )}

        {activeTab === 'provacoes' && <DMArbitrationTab />}

        {activeTab === 'arvores' && (
          <DMOathTreeTab
            selectedHeroId={selectedHeroId}
            onSelectHeroId={setSelectedHeroId}
          />
        )}
      </div>
    </div>
  );
};
