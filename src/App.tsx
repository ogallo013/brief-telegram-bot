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
  CheckCircle2,
  Bookmark,
  Share2,
  Bell,
  Flag,
  MoreHorizontal,
  Clock,
  Tag,
  Trash2,
  Circle,
  Award,
  TrendingUp,
  User,
  Store,
  Landmark,
  X
} from 'lucide-react';
const getObjectActionLabel = (type: ObjectType): string => {
  switch (type) {
    case 'place':
      return 'Visit';
    case 'experience':
      return 'Join';
    case 'opportunity':
      return 'Apply';
    case 'service':
      return 'Book';
    case 'product':
      return 'Buy';
    case 'knowledge':
      return 'Read';
    case 'identity':
      return 'View';
    case 'community':
      return 'Join';
    case 'conversation':
      return 'Discuss';
    case 'document':
      return 'Open';
    default:
      return 'View';
  }
};
// ============================================================================
// 1. TYPES & ENUMS
// ============================================================================
export type ObjectType =
  | 'place'
  | 'identity'
  | 'experience'
  | 'opportunity'
  | 'knowledge'
  | 'community'
  | 'product'
  | 'service'
  | 'document'
  | 'conversation';

export type ProtocolAction =
  | 'discover'
  | 'read'
  | 'save'
  | 'share'
  | 'contact'
  | 'book'
  | 'buy'
  | 'report'
  | 'verify'
  | 'follow';

export type FlowState = 'discovered' | 'engaged' | 'committed' | 'completed' | 'archived';
export type AccessPortal = 'citizen' | 'merchant' | 'civic_admin' | 'moderator';

export interface BriefObject {
  id: string;
  type: ObjectType;
  title: string;
  category: string;
  summary: string;
  locationName?: string;
  creatorName?: string;
  trustScore?: number;
  lastVerifiedAt?: string;
  validityWindowDays?: number;
  isVerified?: boolean;
  imageUrl?: string;
  metadata?: {
    price?: number;
    currency?: string;
    deadline?: string;
    capacity?: number;
    attendeesCount?: number;
    contactPhone?: string;
    operatingHours?: string;
    rating?: number;
    reviewsCount?: number;
    distanceKm?: number;
    statusBadge?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface ObjectRelationship {
  id: string;
  sourceType: ObjectType;
  sourceId: string;
  verb: string;
  targetType: ObjectType;
  targetId: string;
  state: FlowState;
  updatedAt: string;
}

export interface JourneyStep {
  id: string;
  order: number;
  title: string;
  description: string;
  targetObjectType: ObjectType;
  targetObjectId?: string;
  isCompleted: boolean;
  statusLabel?: string;
}

export interface Journey {
  id: string;
  title: string;
  category: string;
  description: string;
  estimatedDays: number;
  steps: JourneyStep[];
  progressPercent: number;
  isCompleted: boolean;
  imageUrl?: string;
}

export interface TownHealthMetrics {
  opportunitiesActedOn: number;
  businessesHelped: number;
  eventsAttended: number;
  knowledgeResolved: number;
  journeysCompleted: number;
  communityContributions: number;
  infoFreshnessPct: number;
}

// ============================================================================
// 2. SEED DATA
// ============================================================================
const INITIAL_OBJECTS: BriefObject[] = [
  {
    id: 'plc_maji_mazuri',
    type: 'place',
    title: 'Maji Mazuri Farmers & Artisans Market',
    category: 'Marketplace',
    summary: 'Fresh organic produce, handcrafts, and open vendor trade.',
    locationName: 'Haile Selassie Ave, CBD',
    creatorName: 'City County Markets Board',
    trustScore: 96,
    lastVerifiedAt: '2026-08-05T10:00:00Z',
    validityWindowDays: 90,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: '06:00–18:30',
      statusBadge: 'Open Now',
      capacity: 1500,
      rating: 4.8,
      reviewsCount: 142,
      distanceKm: 0.4
    },
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'plc_jeevanjee',
    type: 'place',
    title: 'Jeevanjee Gardens Open Pavilion',
    category: 'Civic Space',
    summary: 'Civic dialogues, public forums, open-air art, and youth meetups.',
    locationName: 'Muindi Mbingu St, CBD',
    creatorName: 'County Parks Dept',
    trustScore: 94,
    lastVerifiedAt: '2026-08-04T12:00:00Z',
    validityWindowDays: 60,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: '06:00–20:00',
      statusBadge: 'Open Access',
      capacity: 800,
      rating: 4.6,
      reviewsCount: 89,
      distanceKm: 0.8
    },
    createdAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'plc_kilimani_hub',
    type: 'place',
    title: 'Kilimani Innovation Hub & Lab',
    category: 'Co-Working',
    summary: 'IoT prototype lab, shared workspace, and civic tech incubator.',
    locationName: 'Argwings Kodhek Rd',
    creatorName: 'Kilimani Collective',
    trustScore: 98,
    lastVerifiedAt: '2026-08-06T09:00:00Z',
    validityWindowDays: 30,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: '24/7 Access',
      statusBadge: '24/7 Live',
      capacity: 120,
      rating: 4.9,
      reviewsCount: 210,
      distanceKm: 2.1
    },
    createdAt: '2026-02-10T08:00:00Z'
  },
  {
    id: 'id_county_licensing',
    type: 'identity',
    title: 'City Licensing & Permits Dept',
    category: 'Government',
    summary: 'Unified Business Permits, food health clearances, and signage.',
    locationName: 'City Hall Annex, Fl 3',
    creatorName: 'County Government',
    trustScore: 95,
    lastVerifiedAt: '2026-08-05T08:00:00Z',
    validityWindowDays: 180,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: '08:00–17:00',
      statusBadge: 'Verified Authority',
      contactPhone: '+254 700 000 111',
      rating: 4.3,
      reviewsCount: 64,
      distanceKm: 0.2
    },
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'id_green_harvest',
    type: 'identity',
    title: 'Green Harvest Farmers Co-op',
    category: 'Cooperative',
    summary: '85 smallholder urban farmers delivering farm-to-table harvests.',
    locationName: 'Stall 42, Maji Mazuri',
    creatorName: 'Jane Wambui',
    trustScore: 97,
    lastVerifiedAt: '2026-08-03T11:00:00Z',
    validityWindowDays: 30,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: '07:00–18:00',
      statusBadge: 'Active Seller',
      contactPhone: '+254 712 345 678',
      rating: 4.9,
      reviewsCount: 178,
      distanceKm: 0.4
    },
    createdAt: '2026-01-20T08:00:00Z'
  },
  {
    id: 'exp_youth_summit',
    type: 'experience',
    title: 'Youth Tech & Micro-Commerce Forum',
    category: 'Event',
    summary: 'Licensing officers, young entrepreneurs, and micro-finance dialog.',
    locationName: 'Jeevanjee Pavilion',
    creatorName: 'Youth Enterprise Net',
    trustScore: 98,
    lastVerifiedAt: '2026-08-06T08:00:00Z',
    validityWindowDays: 14,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: 'Aug 15 • 09:00',
      statusBadge: 'Upcoming',
      capacity: 300,
      rating: 4.8,
      reviewsCount: 45,
      distanceKm: 0.8
    },
    createdAt: '2026-07-15T08:00:00Z'
  },
  {
    id: 'opp_green_grant',
    type: 'opportunity',
    title: 'Green Commerce Micro-Grant 2026',
    category: 'Grant',
    summary: 'Non-equity seed grant for solar, zero-waste, or organic enterprise.',
    locationName: 'Nairobi County Wide',
    creatorName: 'Innovation Fund',
    trustScore: 99,
    lastVerifiedAt: '2026-08-05T09:00:00Z',
    validityWindowDays: 30,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      price: 250000,
      currency: 'KES',
      deadline: 'Aug 31',
      statusBadge: '22 Days Left',
      rating: 5.0,
      reviewsCount: 312
    },
    createdAt: '2026-07-01T08:00:00Z'
  },
  {
    id: 'knw_permit_guide',
    type: 'knowledge',
    title: 'Single Business Permit Online Guide',
    category: 'Guide',
    summary: 'Official registration steps and health inspection requirements.',
    locationName: 'City Hall Annex',
    creatorName: 'Civic Data Group',
    trustScore: 98,
    lastVerifiedAt: '2026-08-05T14:00:00Z',
    validityWindowDays: 120,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      operatingHours: 'Est 3 Days',
      statusBadge: '4-Step Process',
      rating: 4.7,
      reviewsCount: 156
    },
    createdAt: '2026-03-10T08:00:00Z'
  },
  {
    id: 'prd_solar_kit',
    type: 'product',
    title: 'Portable Solar Lighting Pack (50W)',
    category: 'Equipment',
    summary: 'Heavy-duty 50W panel + 12V LiFePO4 battery box for vendor stalls.',
    locationName: 'Kilimani Hardware Lab',
    creatorName: 'Kikao Hardware',
    trustScore: 97,
    lastVerifiedAt: '2026-08-04T11:00:00Z',
    validityWindowDays: 90,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      price: 18500,
      currency: 'KES',
      statusBadge: '35 In Stock',
      rating: 4.9,
      reviewsCount: 92
    },
    createdAt: '2026-05-10T08:00:00Z'
  },
  {
    id: 'srv_health_inspection',
    type: 'service',
    title: 'Food Safety Premises Inspection',
    category: 'Inspection',
    summary: 'Pre-opening food hygiene site visit by county health inspector.',
    locationName: 'Nairobi CBD',
    creatorName: 'City Licensing Board',
    trustScore: 96,
    lastVerifiedAt: '2026-08-05T09:00:00Z',
    validityWindowDays: 30,
    isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80',
    metadata: {
      price: 3500,
      currency: 'KES',
      statusBadge: 'Bookable Slot',
      rating: 4.8,
      reviewsCount: 114
    },
    createdAt: '2026-04-15T08:00:00Z'
  }
];

const INITIAL_JOURNEYS: Journey[] = [
  {
    id: 'jrn_register_food_biz',
    title: 'Register & Open Licensed Food Enterprise',
    category: 'Setup Workflow',
    description: 'Trackable process linking health clearance, inspection, and permit issuance.',
    estimatedDays: 5,
    progressPercent: 50,
    isCompleted: false,
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    steps: [
      { id: 'step_1', order: 1, title: 'Review Hygiene Standards', description: 'County sanitation checklist', targetObjectType: 'knowledge', targetObjectId: 'knw_permit_guide', isCompleted: true, statusLabel: 'Verified' },
      { id: 'step_2', order: 2, title: 'Fill Clearance Form F-12', description: 'Digital health application', targetObjectType: 'document', isCompleted: true, statusLabel: 'Submitted' },
      { id: 'step_3', order: 3, title: 'Site Hygiene Inspection', description: 'Officer visit booking', targetObjectType: 'service', targetObjectId: 'srv_health_inspection', isCompleted: false, statusLabel: 'Pending' },
      { id: 'step_4', order: 4, title: 'Green Commerce Grant', description: 'KES 250k seed funding', targetObjectType: 'opportunity', targetObjectId: 'opp_green_grant', isCompleted: false, statusLabel: 'Optional' }
    ]
  }
];

const INITIAL_TOWN_HEALTH: TownHealthMetrics = {
  opportunitiesActedOn: 184,
  businessesHelped: 412,
  eventsAttended: 620,
  knowledgeResolved: 940,
  journeysCompleted: 118,
  communityContributions: 1450,
  infoFreshnessPct: 97.4
};

const getObjectTypeMeta = (type: ObjectType) => {
  switch (type) {
    case 'place': return { label: 'Place', icon: <MapPin className="w-3.5 h-3.5" /> };
    case 'identity': return { label: 'Identity', icon: <Building2 className="w-3.5 h-3.5" /> };
    case 'experience': return { label: 'Experience', icon: <Users className="w-3.5 h-3.5" /> };
    case 'opportunity': return { label: 'Opportunity', icon: <Briefcase className="w-3.5 h-3.5" /> };
    default: return { label: 'Object', icon: <Sparkles className="w-3.5 h-3.5" /> };
  }
};

// ============================================================================
// 3. MAIN COMPONENT
// ============================================================================
export function App() {
  const [objects, setObjects] = useState<BriefObject[]>(INITIAL_OBJECTS);
  const [journeys, setJourneys] = useState<Journey[]>(INITIAL_JOURNEYS);
  const [townHealth, setTownHealth] = useState<TownHealthMetrics>(INITIAL_TOWN_HEALTH);

  const [relationships, setRelationships] = useState<ObjectRelationship[]>([
    { id: 'rel_1', sourceType: 'identity', sourceId: 'usr_me', verb: 'discovered', targetType: 'place', targetId: 'plc_maji_mazuri', state: 'discovered', updatedAt: new Date().toISOString() },
    { id: 'rel_2', sourceType: 'identity', sourceId: 'usr_me', verb: 'engaged_with', targetType: 'knowledge', targetId: 'knw_permit_guide', state: 'engaged', updatedAt: new Date().toISOString() },
  ]);

  const [activeTab, setActiveTab] = useState<'stream' | 'companion' | 'journeys' | 'health'>('stream');
  const [selectedObjectType, setSelectedObjectType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('Nairobi CBD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [architectMode, setArchitectMode] = useState<boolean>(false);
  const [selectedObjectForDetail, setSelectedObjectForDetail] = useState<BriefObject | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleExecuteProtocolAction = (action: ProtocolAction, object: BriefObject) => {
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

    const actionLabels: Record<ProtocolAction, string> = {
  discover: 'Opened',
  read: 'Opened',
  save: 'Saved',
  share: 'Shared',
  contact: 'Contact started',
  book: 'Booking started',
  buy: 'Purchase started',
  report: 'Reported',
  verify: 'Verification started',
  follow: 'Following',
};

showToast(`${actionLabels[action]} "${object.title}".`);
  };

  const filteredObjects = useMemo(() => {
    return objects.filter(obj => {
      const matchesType = selectedObjectType === 'all' || obj.type === selectedObjectType;
      const matchesSearch = searchQuery === '' || 
        obj.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        obj.summary.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [objects, selectedObjectType, searchQuery]);

  return (
    <div className="min-h-screen bg-[#09150E] text-[#E2ECE5] flex flex-col font-sans selection:bg-[#00FF42] selection:text-[#09150E]">
      
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#00FF42] text-[#09150E] px-4 py-2.5 rounded-xl font-extrabold shadow-2xl flex items-center gap-2">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="text-xs">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09150E]/95 backdrop-blur-xl border-b border-[#1E3A2A] transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-xl text-[#00FF42] tracking-tight">Brief</span>
              <div className="flex items-center gap-1 bg-[#102117] text-[#E2ECE5] text-xs font-bold px-2.5 py-1.5 rounded-xl border border-[#235F45]">
                <MapPin className="w-3.5 h-3.5 text-[#00FF42]" />
                <span>{selectedLocation}</span>
              </div>
            </div>

            <div className="relative flex-1 max-w-md hidden sm:block">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#86935C]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search nearby places, jobs, services..."
                className="w-full bg-[#102117] text-[#E2ECE5] text-xs rounded-xl pl-9 pr-4 py-2 border border-[#1E3A2A] focus:outline-none focus:border-[#00FF42] placeholder:text-[#86935C]"
              />
            </div>

            <button
              onClick={() => setArchitectMode(!architectMode)}
              className="p-2 rounded-xl text-xs font-bold border bg-[#102117] text-[#00FF42] border-[#235F45] cursor-pointer"
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-6 mt-3 pt-2 border-t border-[#1E3A2A] text-xs font-bold overflow-x-auto no-scrollbar">
            <button onClick={() => setActiveTab('stream')} className={`pb-1 border-b-2 cursor-pointer ${activeTab === 'stream' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Nearby</button>
            <button onClick={() => setActiveTab('companion')} className={`pb-1 border-b-2 cursor-pointer ${activeTab === 'companion' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>My Layer ({relationships.length})</button>
            <button onClick={() => setActiveTab('journeys')} className={`pb-1 border-b-2 cursor-pointer ${activeTab === 'journeys' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Workflows</button>
            <button onClick={() => setActiveTab('health')} className={`pb-1 border-b-2 cursor-pointer ${activeTab === 'health' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Intelligence</button>
          </div>
        </div>
      </header>

      {/* Main Stream */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6">
        
        {/* Visual Hero Bar */}
        <div className="mb-6 rounded-2xl bg-[#102117] border border-[#235F45] p-5 shadow-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF42] animate-ping" />
              <span className="text-xs font-mono font-extrabold uppercase text-[#00FF42]">{selectedLocation} • Live Local Stream</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#E2ECE5]">Brief — Everything Happening Around You</h1>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-extrabold">
            <span className="bg-[#09150E] px-3 py-1.5 rounded-xl border border-[#235F45] text-[#00FF42]">{objects.length} Objects</span>
            <span className="bg-[#09150E] px-3 py-1.5 rounded-xl border border-[#235F45] text-[#00FF42]">{townHealth.infoFreshnessPct}% Fresh</span>
          </div>
        </div>

        {/* Main Content */}
{activeTab === 'stream' && (
  <>    {/* TEA */}
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-[#00FF42]">
            Today's Tea
          </div>
          <div className="text-sm font-bold text-[#E2ECE5]">
            What Nairobi is talking about
          </div>
        </div>

        <button
          onClick={() => showToast('Tea is brewing...')}
          className="text-[11px] font-extrabold text-[#8DCF74] border border-[#235F45] px-3 py-1.5 rounded-full"
        >
          See all
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto no-scrollbar">
        {[
          { label: 'Morning Tea', icon: '☀️' },
          { label: 'Evening Tea', icon: '🌆' },
          { label: 'Weekend Tea', icon: '🗓️' },
        ].map((tea) => (
          <button
            key={tea.label}
            onClick={() => showToast(`${tea.label} selected`)}
            className="shrink-0 bg-[#102117] border border-[#235F45] hover:border-[#00FF42] rounded-2xl px-4 py-3 text-left min-w-[145px] transition"
          >
            <div className="text-lg mb-1">{tea.icon}</div>
            <div className="text-xs font-extrabold text-[#E2ECE5]">
              {tea.label}
            </div>
            <div className="text-[10px] text-[#8DCF74] mt-1">
              The stories people are discussing
            </div>
          </button>
        ))}
      </div>
    </div>
    {/* Stream Filters */}
    <div className="flex items-center gap-2 mb-5 overflow-x-auto no-scrollbar">
      {[
        { id: 'all', label: 'Everything' },
        { id: 'place', label: 'Places' },
        { id: 'experience', label: 'Events' },
        { id: 'opportunity', label: 'Opportunities' },
        { id: 'service', label: 'Services' },
        { id: 'product', label: 'Market' },
      ].map((filter) => (
        <button
          key={filter.id}
          onClick={() => setSelectedObjectType(filter.id)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-extrabold border transition ${
            selectedObjectType === filter.id
              ? 'bg-[#00FF42] text-[#09150E] border-[#00FF42]'
              : 'bg-[#102117] text-[#8DCF74] border-[#235F45] hover:border-[#00FF42]'
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>

    {/* Objects */}
    {filteredObjects.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredObjects.map((obj) => (
          <div
            key={obj.id}
            onClick={() => setSelectedObjectForDetail(obj)}
            className="bg-[#102117] border border-[#1E3A2A] hover:border-[#00FF42] hover:bg-[#13291C] rounded-2xl p-4 cursor-pointer transition"
          >
            <div>
              {obj.imageUrl && (
                <div className="relative h-44 w-full bg-[#09150E] overflow-hidden">
                  <img
                    src={obj.imageUrl}
                    alt={obj.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                  />

                  <div className="absolute top-3 left-3 flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#09150E]/80 text-[#00FF42] border border-[#235F45]">
                      {obj.category}
                    </span>

                    {obj.isVerified && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00FF42] text-[#09150E]">
                        VERIFIED
                      </span>
                    )}
                  </div>

                  {obj.metadata?.price !== undefined && (
                    <span className="absolute bottom-2 right-3 text-[#00FF42] font-mono text-sm font-extrabold bg-[#09150E]/80 px-2 py-0.5 rounded border border-[#235F45]">
                      {obj.metadata.currency || 'KES'} {obj.metadata.price.toLocaleString()}
                    </span>
                  )}
                </div>
              )}

              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-[10px] font-mono uppercase text-[#86935C]">
                    {getObjectTypeMeta(obj.type).label}
                  </span>

                  {obj.trustScore && (
                    <span className="text-[10px] font-mono text-[#00FF42]">
                      {obj.trustScore}% trusted
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-[#E2ECE5] group-hover:text-[#00FF42] line-clamp-2">
                  {obj.title}
                </h3>

                <p className="text-xs text-[#8DCF74] line-clamp-2">
                  {obj.summary}
                </p>

                {obj.locationName && (
                  <div className="flex items-center gap-1.5 text-[10px] text-[#86935C]">
                    <MapPin className="w-3 h-3" />
                    <span>{obj.locationName}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3.5 pt-0 flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteProtocolAction('book', obj);
                }}
                className="flex-1 bg-[#00FF42] hover:bg-[#8DCF74] text-[#09150E] font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
              >
                <span>Act</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleExecuteProtocolAction('save', obj);
                }}
                className="p-2.5 rounded-xl bg-[#172D20] text-[#8DCF74] border border-[#1E3A2A] hover:bg-[#235F45] cursor-pointer"
              >
                <Bookmark className="w-4 h-4 fill-current" />
              </button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="py-16 text-center text-[#86935C]">
        <Sparkles className="w-8 h-8 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-bold">Nothing here yet.</p>
      </div>
    )}
  </>
)}

{/* MY LAYER */}
{activeTab === 'companion' && (
  <section className="space-y-5">
    <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Bookmark className="w-4 h-4 text-[#00FF42]" />
        <span className="text-[10px] font-mono uppercase text-[#00FF42]">
          Your Layer
        </span>
      </div>

      <h2 className="text-xl font-extrabold">
        Things you've kept.
      </h2>

      <p className="text-xs text-[#8DCF74] mt-1">
        Your saved places, opportunities and useful information.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {objects
        .filter((obj) =>
          relationships.some(
            (rel) =>
              rel.targetId === obj.id &&
              rel.verb === 'saved'
          )
        )
        .map((obj) => (
          <div
            key={obj.id}
            onClick={() => setSelectedObjectForDetail(obj)}
            className="bg-[#102117] border border-[#1E3A2A] hover:border-[#00FF42] rounded-2xl p-4 cursor-pointer transition"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono uppercase text-[#86935C]">
                  {obj.category}
                </span>

                <h3 className="font-extrabold mt-1">
                  {obj.title}
                </h3>

                <p className="text-xs text-[#8DCF74] mt-1">
                  {obj.summary}
                </p>
              </div>

              <Bookmark className="w-4 h-4 text-[#00FF42] fill-current shrink-0" />
            </div>
          </div>
        ))}
    </div>

    {relationships.filter((rel) => rel.verb === 'saved').length === 0 && (
      <div className="py-16 text-center border border-dashed border-[#235F45] rounded-2xl">
        <Bookmark className="w-8 h-8 mx-auto mb-3 text-[#86935C]" />
        <p className="text-sm font-bold">Nothing saved yet.</p>
        <p className="text-xs text-[#86935C] mt-1">
          Save something from Nearby and it will appear here.
        </p>
      </div>
    )}
  </section>
)}

{/* WORKFLOWS */}
{activeTab === 'journeys' && (
  <section className="space-y-5">
    <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Briefcase className="w-4 h-4 text-[#00FF42]" />
        <span className="text-[10px] font-mono uppercase text-[#00FF42]">
          Workflows
        </span>
      </div>

      <h2 className="text-xl font-extrabold">
        Things you can actually do.
      </h2>

      <p className="text-xs text-[#8DCF74] mt-1">
        Follow a process instead of figuring it out from scratch.
      </p>
    </div>

    {journeys.map((journey) => (
      <div
        key={journey.id}
        className="bg-[#102117] border border-[#1E3A2A] rounded-2xl overflow-hidden"
      >
        <div className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[10px] font-mono uppercase text-[#00FF42]">
                {journey.category}
              </span>

              <h3 className="text-lg font-extrabold mt-1">
                {journey.title}
              </h3>

              <p className="text-xs text-[#8DCF74] mt-1">
                {journey.description}
              </p>
            </div>

            <span className="text-xs font-mono font-bold text-[#00FF42]">
              {journey.progressPercent}%
            </span>
          </div>

          <div className="h-1.5 bg-[#09150E] rounded-full mt-5 overflow-hidden">
            <div
              className="h-full bg-[#00FF42] rounded-full"
              style={{ width: `${journey.progressPercent}%` }}
            />
          </div>
        </div>

        <div className="border-t border-[#1E3A2A]">
          {journey.steps.map((step) => (
            <div
              key={step.id}
              className="flex items-center gap-3 p-4 border-b border-[#1E3A2A] last:border-b-0"
            >
              {step.isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-[#00FF42] shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-[#86935C] shrink-0" />
              )}

              <div className="flex-1 min-w-0">
                <p className="text-xs font-extrabold">
                  {step.title}
                </p>
                <p className="text-[10px] text-[#86935C]">
                  {step.description}
                </p>
              </div>

              <span className="text-[9px] font-mono text-[#8DCF74]">
                {step.statusLabel}
              </span>
            </div>
          ))}
        </div>
      </div>
    ))}
  </section>
)}

{/* INTELLIGENCE */}
{activeTab === 'health' && (
  <section className="space-y-5">
    <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <TrendingUp className="w-4 h-4 text-[#00FF42]" />
        <span className="text-[10px] font-mono uppercase text-[#00FF42]">
          Intelligence
        </span>
      </div>

      <h2 className="text-xl font-extrabold">
        What's changing around you.
      </h2>

      <p className="text-xs text-[#8DCF74] mt-1">
        Brief quietly turns activity into useful signals.
      </p>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {[
        ['Freshness', `${townHealth.infoFreshnessPct}%`, 'Information freshness'],
        ['Businesses', townHealth.businessesHelped, 'Businesses helped'],
        ['Events', townHealth.eventsAttended, 'Events attended'],
        ['Opportunities', townHealth.opportunitiesActedOn, 'Acted on'],
        ['Knowledge', townHealth.knowledgeResolved, 'Questions resolved'],
        ['Community', townHealth.communityContributions, 'Contributions'],
      ].map(([label, value, caption]) => (
        <div
          key={label}
          className="bg-[#102117] border border-[#1E3A2A] rounded-2xl p-4"
        >
          <p className="text-[10px] uppercase font-mono text-[#86935C]">
            {label}
          </p>

          <p className="text-2xl font-extrabold text-[#00FF42] mt-1">
            {value}
          </p>

          <p className="text-[10px] text-[#8DCF74] mt-1">
            {caption}
          </p>
        </div>
      ))}
    </div>

    <div className="bg-[#102117] border border-[#1E3A2A] rounded-2xl p-5">
      <div className="flex items-center gap-2">
        <Award className="w-4 h-4 text-[#00FF42]" />
        <span className="text-xs font-extrabold">
          Brief signal
        </span>
      </div>

      <p className="text-sm font-bold mt-3">
        {townHealth.infoFreshnessPct}% of the local information layer
        is currently marked fresh.
      </p>

      <p className="text-xs text-[#86935C] mt-1">
        This is the kind of signal Brief should eventually surface
        without making the user think about the machinery behind it.
      </p>
    </div>
  </section>
)}

      </main>

      <footer className="border-t border-[#1E3A2A] mt-12 py-6 text-xs text-[#86935C] text-center font-mono">
        Brief 10.0 • Everything Happening Around You
      </footer>

    </div>
  );
}

export default App;
