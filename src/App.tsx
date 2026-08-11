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
  
