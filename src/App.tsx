import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Search, 
  Sparkles, 
  Plus, 
  Terminal, 
  MapPin, 
  Users,
  Briefcase,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

import { BriefObject, ObjectRelationship, Journey, TownHealthMetrics, ProtocolAction, ObjectType, FlowState } from './types/brief';
import { INITIAL_OBJECTS, INITIAL_JOURNEYS, INITIAL_TOWN_HEALTH } from './data/initialData';
import { Header, AccessPortal } from './components/Header';
import { ObjectCard, getObjectTypeMeta } from './components/ObjectCard';
import { FlowEngineDrawer } from './components/FlowEngineDrawer';
import { JourneyView } from './components/JourneyView';
import { TownHealthDashboard } from './components/TownHealthDashboard';
import { ObjectDetailModal } from './components/ObjectDetailModal';
import { CreateObjectModal } from './components/CreateObjectModal';

export function App() {
  const [objects, setObjects] = useState<BriefObject[]>(INITIAL_OBJECTS);
  const [journeys, setJourneys] = useState<Journey[]>(INITIAL_JOURNEYS);
  const [townHealth, setTownHealth] = useState<TownHealthMetrics>(INITIAL_TOWN_HEALTH);

  const [relationships, setRelationships] = useState<ObjectRelationship[]>([
    { id: 'rel_1', sourceType: 'identity', sourceId: 'usr_me', verb: 'discovered', targetType: 'place', targetId: 'plc_maji_mazuri', state: 'discovered', updatedAt: new Date().toISOString() },
    { id: 'rel_2', sourceType: 'identity', sourceId: 'usr_me', verb: 'engaged_with', targetType: 'knowledge', targetId: 'knw_permit_guide', state: 'engaged', updatedAt: new Date().toISOString() },
    { id: 'rel_3', sourceType: 'identity', sourceId: 'usr_me', verb: 'booked_with', targetType: 'service', targetId: 'srv_health_inspection', state: 'committed', updatedAt: new Date().toISOString() },
  ]);

  const [activeTab, setActiveTab] = useState<'stream' | 'companion' | 'journeys' | 'health'>('stream');
  const [activePortal, setActivePortal] = useState<AccessPortal>('citizen');
  const [selectedObjectType, setSelectedObjectType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('Nairobi CBD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const [architectMode, setArchitectMode] = useState<boolean>(false);

  const [selectedObjectForDetail, setSelectedObjectForDetail] = useState<BriefObject | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const objectsMap = useMemo(() => {
    const map = new Map<string, BriefObject>();
    objects.forEach(o => map.set(o.id, o));
    return map;
  }, [objects]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExecuteProtocolAction = (action: ProtocolAction, object: BriefObject) => {
    let nextState: FlowState = 'engaged';
    let verb = 'interacted_with';

    switch (action) {
      case 'discover':
        nextState = 'discovered';
        verb = 'discovered';
        break;
      case 'read':
      case 'save':
      case 'follow':
      case 'share':
        nextState = 'engaged';
        verb = action === 'save' ? 'saved' : action === 'follow' ? 'following' : 'viewed';
        break;
      case 'contact':
      case 'book':
      case 'buy':
        nextState = 'committed';
        verb = action === 'book' ? 'booked' : action === 'buy' ? 'bought' : 'contacted';
        break;
      case 'verify':
        nextState = 'completed';
        verb = 'verified';
        break;
      case 'report':
        nextState = 'archived';
        verb = 'reported';
        break;
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

    showToast(`Done! Added "${object.title}" to Local Layer.`);
  };

  const handleAdvanceState = (relationshipId: string, nextState: FlowState) => {
    setRelationships(prev => prev.map(r => r.id === relationshipId ? { ...r, state: nextState, updatedAt: new Date().toISOString() } : r));
    showToast('Updated status');
  };

  const handleClearRelationship = (relationshipId: string) => {
    setRelationships(prev => prev.filter(r => r.id !== relationshipId));
    showToast('Removed item');
  };

  const handleToggleStep = (journeyId: string, stepId: string) => {
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
  };

  const handleCreateObject = (newObj: BriefObject) => {
    setObjects(prev => [newObj, ...prev]);
    setTownHealth(th => ({ ...th, communityContributions: th.communityContributions + 1 }));
    showToast(`Published "${newObj.title}" to ${selectedLocation}`);
  };

  const filteredObjects = useMemo(() => {
    return objects.filter(obj => {
      const matchesType = selectedObjectType === 'all' || obj.type === selectedObjectType;
      const matchesSearch = searchQuery === '' || 
        obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [objects, selectedObjectType, searchQuery]);

  const activeCount = relationships.filter(r => r.state === 'engaged' || r.state === 'committed').length;

  return (
    <div className="min-h-screen bg-[#09150E] text-[#E2ECE5] flex flex-col font-sans selection:bg-[#00FF42] selection:text-[#09150E]">
      
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00FF42] text-[#09150E] px-4 py-2.5 rounded-xl font-extrabold shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

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

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        
        <div className="mb-6 rounded-2xl bg-gradient-to-r from-[#102117] via-[#172D20] to-[#102117] border border-[#235F45] p-5 shadow-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 z-10">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF42] animate-ping" />
              <span className="text-xs font-mono font-extrabold uppercase text-[#00FF42] tracking-wider">
                {selectedLocation} • Live Local Stream
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-[#E2ECE5] tracking-tight">
              Brief
            </h1>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar z-10">
            <div className="bg-[#09150E] border border-[#235F45] rounded-xl p-2.5 px-3.5 flex items-center gap-2.5">
              <span className="text-base font-extrabold text-[#00FF42] font-mono">{objects.length}</span>
              <span className="text-[10px] font-bold text-[#8DCF74] uppercase">Objects Nearby</span>
            </div>

            <div className="bg-[#09150E] border border-[#235F45] rounded-xl p-2.5 px-3.5 flex items-center gap-2.5">
              <span className="text-base font-extrabold text-[#00FF42] font-mono">{townHealth.infoFreshnessPct}%</span>
              <span className="text-[10px] font-bold text-[#8DCF74] uppercase">Verified Fresh</span>
            </div>
          </div>
        </div>

        {architectMode && (
          <div className="mb-6 p-4 rounded-2xl bg-[#09150E] border border-[#00FF42] text-[#00FF42] text-xs font-mono">
            <div className="flex items-center justify-between mb-2">
              <span className="font-extrabold uppercase tracking-wider">Four Foundations Architecture</span>
              <button onClick={() => setArchitectMode(false)} className="underline hover:text-white">Close</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#8DCF74]">
              <div className="p-2 bg-[#102117] rounded border border-[#235F45]">1. People (Identities)</div>
              <div className="p-2 bg-[#102117] rounded border border-[#235F45]">2. Places (Map/Venues)</div>
              <div className="p-2 bg-[#102117] rounded border border-[#235F45]">3. Opportunities (Trade)</div>
              <div className="p-2 bg-[#102117] rounded border border-[#00FF42] text-[#00FF42] font-bold">4. Actions (Protocol)</div>
            </div>
          </div>
        )}

        {activeTab === 'stream' && (
          <div className="space-y-6">
            
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              <button
                onClick={() => setSelectedObjectType('all')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition shrink-0 cursor-pointer ${
                  selectedObjectType === 'all'
                    ? 'bg-[#00FF42] text-[#09150E]'
                    : 'bg-[#102117] text-[#8DCF74] hover:text-[#E2ECE5] border border-[#1E3A2A]'
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shrink-0 cursor-pointer ${
                      selectedObjectType === t
                        ? 'bg-[#172D20] text-[#00FF42] border border-[#00FF42]'
                        : 'bg-[#102117] text-[#8DCF74] border border-[#1E3A2A] hover:text-[#E2ECE5]'
                    }`}
                  >
                    <span>{meta.label}s</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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

      <footer className="border-t border-[#1E3A2A] mt-12 py-6 text-xs text-[#86935C] text-center font-mono">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="text-[#00FF42] font-bold">Brief</span>
          <span>80% Visual / 20% Text • Functional Local OS</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
