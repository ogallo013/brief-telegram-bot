import React, { useState, useMemo, useCallback } from 'react';
import { Sparkles, Terminal } from 'lucide-react';

import { BriefObject, ObjectRelationship, Journey, TownHealthMetrics, ProtocolAction, ObjectType, FlowState, AccessPortal } from './types/brief';
import { INITIAL_OBJECTS, INITIAL_JOURNEYS, INITIAL_TOWN_HEALTH } from './data/seed';
import { useDebounce } from './hooks/useDebounce';
import { useLocalStorage } from './hooks/useLocalStorage';
import { Header } from './components/Header';
import { ObjectCard } from './components/ObjectCard';
import { FlowEngineDrawer } from './components/FlowEngineDrawer';
import { JourneyView } from './components/JourneyView';
import { TownHealthDashboard } from './components/TownHealthDashboard';
import { ObjectDetailModal } from './components/ObjectDetailModal';
import { CreateObjectModal } from './components/CreateObjectModal';
import { getObjectTypeMeta } from './utils/objectMeta';

export function App() {
  const [objects, setObjects] = useLocalStorage<BriefObject[]>('brief:objects', INITIAL_OBJECTS);
  const [journeys, setJourneys] = useLocalStorage<Journey[]>('brief:journeys', INITIAL_JOURNEYS);
  const [townHealth, setTownHealth] = useLocalStorage<TownHealthMetrics>('brief:townHealth', INITIAL_TOWN_HEALTH);

  const [relationships, setRelationships] = useLocalStorage<ObjectRelationship[]>('brief:relationships', [
    { id: 'rel_1', sourceType: 'identity', sourceId: 'usr_me', verb: 'discovered', targetType: 'place', targetId: 'plc_maji_mazuri', state: 'discovered', updatedAt: new Date().toISOString() },
    { id: 'rel_2', sourceType: 'identity', sourceId: 'usr_me', verb: 'engaged_with', targetType: 'knowledge', targetId: 'knw_permit_guide', state: 'engaged', updatedAt: new Date().toISOString() },
  ]);

  const [activeTab, setActiveTab] = useState<'stream' | 'companion' | 'journeys' | 'health'>('stream');
  const [activePortal, setActivePortal] = useState<AccessPortal>('citizen');
  const [selectedObjectType, setSelectedObjectType] = useState<ObjectType | 'all'>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('Nairobi CBD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const debouncedSearch = useDebounce(searchQuery, 250);

  const [architectMode, setArchitectMode] = useState<boolean>(false);
  const [selectedObjectForDetail, setSelectedObjectForDetail] = useState<BriefObject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const objectsMap = useMemo(() => {
    const map = new Map<string, BriefObject>();
    objects.forEach(o => map.set(o.id, o));
    return map;
  }, [objects]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const handleExecuteProtocolAction = useCallback((action: ProtocolAction, object: BriefObject) => {
    let nextState: FlowState = 'engaged';
    let verb = 'interacted_with';

    if (action === 'book' || action === 'contact' || action === 'buy') {
      nextState = 'committed';
      verb = action === 'book' ? 'booked' : action === 'buy' ? 'bought' : 'contacted';
    } else if (action === 'save') {
      nextState = 'engaged';
      verb = 'saved';
    }

    setRelationships(prev => {
      const existingIdx = prev.findIndex(r => r.targetId === object.id);
      const newEdge: ObjectRelationship = {
        id: `rel_${Date.now()}`,
        sourceType: 'identity',
        sourceId: 'usr_me',
        verb,
        targetType: object.type,
        targetId: object.id,
        state: nextState,
        updatedAt: new Date().toISOString()
      };

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newEdge;
        return updated;
      }
      return [...prev, newEdge];
    });

    setTownHealth(prev => {
      const copy = { ...prev };
      if (action === 'book' || action === 'contact' || action === 'buy') {
        copy.businessesHelped += 1;
        copy.opportunitiesActedOn += 1;
      } else if (action === 'verify') {
        copy.knowledgeResolved += 1;
        copy.communityContributions += 1;
        copy.infoFreshnessPct = Math.min(100, Number((copy.infoFreshnessPct + 0.2).toFixed(1)));
      }
      return copy;
    });

    showToast(`Saved "${object.title}" to Local Layer.`);
  }, [setRelationships, setTownHealth, showToast]);

  const handleAdvanceState = useCallback((relationshipId: string, nextState: FlowState) => {
    setRelationships(prev => prev.map(r => r.id === relationshipId ? { ...r, state: nextState, updatedAt: new Date().toISOString() } : r));
    showToast('Updated status');
  }, [setRelationships, showToast]);

  const handleClearRelationship = useCallback((relationshipId: string) => {
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
    showToast('Removed item');
  }, [setRelationships, showToast]);

  const handleToggleStep = useCallback((journeyId: string, stepId: string) => {
    setJourneys(prev => prev.map(j => {
      if (j.id !== journeyId) return j;
      const updatedSteps = j.steps.map(s => s.id === stepId ? { ...s, isCompleted: !s.isCompleted } : s);
      const completedCount = updatedSteps.filter(s => s.isCompleted).length;
      const progressPercent = Math.round((completedCount / updatedSteps.length) * 100);
      const isCompleted = progressPercent === 100;

      if (isCompleted && !j.isCompleted) {
        setTownHealth(th => ({ ...th, journeysCompleted: th.journeysCompleted + 1 }));
        showToast(`Workflow "${j.title}" completed!`);
      }

      return { ...j, steps: updatedSteps, progressPercent, isCompleted };
    }));
  }, [setJourneys, setTownHealth, showToast]);

  const handleCreateObject = useCallback((newObj: BriefObject) => {
    setObjects(prev => [newObj, ...prev]);
    setTownHealth(th => ({ ...th, communityContributions: th.communityContributions + 1 }));
    showToast(`Published "${newObj.title}" to ${selectedLocation}`);
  }, [setObjects, setTownHealth, selectedLocation, showToast]);

  const filteredObjects = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    return objects.filter(obj => {
      const matchesType = selectedObjectType === 'all' || obj.type === selectedObjectType;
      const matchesSearch = q === '' || 
        obj.title.toLowerCase().includes(q) ||
        obj.summary.toLowerCase().includes(q) ||
        obj.category.toLowerCase().includes(q);
      return matchesType && matchesSearch;
    });
  }, [objects, selectedObjectType, debouncedSearch]);

  const activeCount = relationships.filter(r => r.state === 'engaged' || r.state === 'committed').length;

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#08130B] text-[#E2ECE5] flex flex-col font-sans selection:bg-[#00FF42] selection:text-[#08130B]">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div role="status" className="fixed bottom-6 right-6 z-50 bg-[#00FF42] text-[#08130B] px-4 py-2.5 rounded-xl font-extrabold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activePortal={activePortal}
        setActivePortal={setActivePortal}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedLocation={selectedLocation}
        setSelectedLocation={setSelectedLocation}
        activeCount={activeCount}
        openCreateModal={() => setIsCreateModalOpen(true)}
        architectMode={architectMode}
        setArchitectMode={setArchitectMode}
      />

      {/* Main Responsive Stream Container */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-4 space-y-4">
        
        {/* Stream Hero Indicator */}
        <div className="bg-[#0F2217] border border-[#1A3728] rounded-2xl p-4 shadow-xl flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF42] animate-ping" />
              <span className="text-xs font-mono font-extrabold uppercase text-[#00FF42]">
                What's happening nearby
              </span>
            </div>
            <p className="text-xs text-[#8DCF74] font-medium mt-0.5">
              {filteredObjects.length} items &bull; {townHealth.infoFreshnessPct}% current
            </p>
          </div>

          <div className="text-right font-mono text-xs font-extrabold text-[#00FF42] bg-[#08130B] px-3 py-1.5 rounded-xl border border-[#235F45]">
            {selectedLocation}
          </div>
        </div>

        {/* Architect Debug Banner */}
        {architectMode && (
          <div className="p-3.5 rounded-2xl bg-[#08130B] border border-[#00FF42] text-[#00FF42] text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold uppercase tracking-wider">Four Foundations Architecture</span>
              <button onClick={() => setArchitectMode(false)} className="underline hover:text-white cursor-pointer">Close</button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-[#8DCF74]">
              <div className="p-2 bg-[#0F2217] rounded border border-[#1A3728]">1. People (Identities)</div>
              <div className="p-2 bg-[#0F2217] rounded border border-[#1A3728]">2. Places (Map/Venues)</div>
              <div className="p-2 bg-[#0F2217] rounded border border-[#1A3728]">3. Opportunities (Trade)</div>
              <div className="p-2 bg-[#0F2217] rounded border border-[#00FF42] text-[#00FF42] font-bold">4. Actions (Protocol)</div>
            </div>
          </div>
        )}

        {/* Tab 1: Nearby Stream */}
        {activeTab === 'stream' && (
          <div className="space-y-4">
            
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar" role="tablist" aria-label="Object Categories">
              <button
                onClick={() => setSelectedObjectType('all')}
                className={`px-3 py-1 rounded-full text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  selectedObjectType === 'all'
                    ? 'bg-[#00FF42] text-[#08130B]'
                    : 'bg-[#0F2217] text-[#8DCF74] hover:text-[#E2ECE5] border border-[#1A3728]'
                }`}
              >
                All
              </button>

              {(['place', 'identity', 'experience', 'opportunity', 'knowledge', 'community', 'product', 'service', 'document', 'conversation'] as ObjectType[]).map((t) => {
                const meta = getObjectTypeMeta(t);
                return (
                  <button
                    key={t}
                    onClick={() => setSelectedObjectType(t)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedObjectType === t
                        ? 'bg-[#172D20] text-[#00FF42] border border-[#00FF42]'
                        : 'bg-[#0F2217] text-[#8DCF74] border border-[#1A3728] hover:text-[#E2ECE5]'
                    }`}
                  >
                    <span>{meta.label}s</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile-First Feed Column */}
            <div className="space-y-4 w-full">
              {filteredObjects.map((obj) => {
                const rel = relationships.find(r => r.targetId === obj.id);
                return (
                  <ObjectCard
                    key={obj.id}
                    object={obj}
                    currentState={rel?.state || 'discovered'}
                    onExecuteAction={handleExecuteProtocolAction}
                    onOpenDetail={(o) => setSelectedObjectForDetail(o)}
                    architectMode={architectMode}
                  />
                );
              })}
            </div>

          </div>
        )}

        {activeTab === 'companion' && (
          <FlowEngineDrawer 
            relationships={relationships}
            objectsMap={objectsMap}
            onExecuteAction={handleExecuteProtocolAction}
            onAdvanceState={handleAdvanceState}
            onClearRelationship={handleClearRelationship}
            architectMode={architectMode}
          />
        )}

        {activeTab === 'journeys' && (
          <JourneyView 
            journeys={journeys}
            objectsMap={objectsMap}
            onToggleStep={handleToggleStep}
            onExecuteAction={handleExecuteProtocolAction}
          />
        )}

        {activeTab === 'health' && (
          <TownHealthDashboard metrics={townHealth} />
        )}

      </main>

      <ObjectDetailModal 
        object={selectedObjectForDetail}
        currentState={relationships.find(r => r.targetId === selectedObjectForDetail?.id)?.state || 'discovered'}
        onClose={() => setSelectedObjectForDetail(null)}
        onExecuteAction={handleExecuteProtocolAction}
      />

      <CreateObjectModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateObject}
      />

      <footer className="border-t border-[#1A3728] mt-12 py-6 text-xs text-[#86935C] text-center font-mono w-full">
        Brief &bull; Everything Happening Around You
      </footer>

    </div>
  );
}

export default App;
