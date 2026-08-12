import React, { useState, useMemo } from 'react';
import {
  Building2, Search, Sparkles, Terminal, MapPin, Users, Briefcase,
  ShieldCheck, X
} from 'lucide-react';

// ============================================================================
// VISUAL SYSTEM
// ============================================================================
const COLORS = {
  background: '#0B1110',
  surface: '#111A17',
  border: '#1D2A25',
  primary: '#F2F5F3',
  muted: '#8B9992',
  accent: '#B8FF3D',
};

// ============================================================================
// TYPES & ENUMS
// ============================================================================
export type ObjectType =
  | 'place' | 'identity' | 'experience' | 'opportunity' | 'knowledge'
  | 'community' | 'product' | 'service' | 'document' | 'conversation';

export type ProtocolAction =
  | 'discover' | 'read' | 'save' | 'share' | 'contact' | 'book' | 'buy'
  | 'report' | 'verify' | 'follow';

export type FlowState =
  | 'discovered' | 'engaged' | 'committed' | 'completed' | 'archived';

export type AccessPortal =
  | 'citizen' | 'merchant' | 'civic_admin' | 'moderator';

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
// SEED DATA
// ============================================================================
const INITIAL_OBJECTS: BriefObject[] = [
  {
    id: 'plc_maji_mazuri', type: 'place',
    title: 'Maji Mazuri Farmers & Artisans Market',
    category: 'Marketplace',
    summary: 'Fresh organic produce, handcrafts, and open vendor trade.',
    locationName: 'Haile Selassie Ave, CBD', creatorName: 'City County Markets Board',
    trustScore: 96, lastVerifiedAt: '2026-08-05T10:00:00Z',
    validityWindowDays: 90, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: '06:00–18:30', statusBadge: 'Open Now', capacity: 1500, rating: 4.8, reviewsCount: 142, distanceKm: 0.4 },
    createdAt: '2026-01-15T08:00:00Z'
  },
  {
    id: 'plc_jeevanjee', type: 'place',
    title: 'Jeevanjee Gardens Open Pavilion',
    category: 'Civic Space',
    summary: 'Civic dialogues, public forums, open-air art, and youth meetups.',
    locationName: 'Muindi Mbingu St, CBD', creatorName: 'County Parks Dept',
    trustScore: 94, lastVerifiedAt: '2026-08-04T12:00:00Z',
    validityWindowDays: 60, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1519331379826-f10be5486c6f?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: '06:00–20:00', statusBadge: 'Open Access', capacity: 800, rating: 4.6, reviewsCount: 89, distanceKm: 0.8 },
    createdAt: '2026-02-01T08:00:00Z'
  },
  {
    id: 'plc_kilimani_hub', type: 'place',
    title: 'Kilimani Innovation Hub & Lab',
    category: 'Co-Working',
    summary: 'IoT prototype lab, shared workspace, and civic tech incubator.',
    locationName: 'Argwings Kodhek Rd', creatorName: 'Kilimani Collective',
    trustScore: 98, lastVerifiedAt: '2026-08-06T09:00:00Z',
    validityWindowDays: 30, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: '24/7 Access', statusBadge: '24/7 Live', capacity: 120, rating: 4.9, reviewsCount: 210, distanceKm: 2.1 },
    createdAt: '2026-02-10T08:00:00Z'
  },
  {
    id: 'id_county_licensing', type: 'identity',
    title: 'City Licensing & Permits Dept',
    category: 'Government',
    summary: 'Unified Business Permits, food health clearances, and signage.',
    locationName: 'City Hall Annex, Fl 3', creatorName: 'County Government',
    trustScore: 95, lastVerifiedAt: '2026-08-05T08:00:00Z',
    validityWindowDays: 180, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: '08:00–17:00', statusBadge: 'Verified Authority', contactPhone: '+254 700 000 111', rating: 4.3, reviewsCount: 64, distanceKm: 0.2 },
    createdAt: '2025-10-01T08:00:00Z'
  },
  {
    id: 'id_green_harvest', type: 'identity',
    title: 'Green Harvest Farmers Co-op',
    category: 'Cooperative',
    summary: '85 smallholder urban farmers delivering farm-to-table harvests.',
    locationName: 'Stall 42, Maji Mazuri', creatorName: 'Jane Wambui',
    trustScore: 97, lastVerifiedAt: '2026-08-03T11:00:00Z',
    validityWindowDays: 30, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1595974482597-4b8da8879bc5?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: '07:00–18:00', statusBadge: 'Active Seller', contactPhone: '+254 712 345 678', rating: 4.9, reviewsCount: 178, distanceKm: 0.4 },
    createdAt: '2026-01-20T08:00:00Z'
  },
  {
    id: 'exp_youth_summit', type: 'experience',
    title: 'Youth Tech & Micro-Commerce Forum',
    category: 'Event',
    summary: 'Licensing officers, young entrepreneurs, and micro-finance dialog.',
    locationName: 'Jeevanjee Pavilion', creatorName: 'Youth Enterprise Net',
    trustScore: 98, lastVerifiedAt: '2026-08-06T08:00:00Z',
    validityWindowDays: 14, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: 'Aug 15 • 09:00', statusBadge: 'Upcoming', capacity: 300, rating: 4.8, reviewsCount: 45, distanceKm: 0.8 },
    createdAt: '2026-07-15T08:00:00Z'
  },
  {
    id: 'opp_green_grant', type: 'opportunity',
    title: 'Green Commerce Micro-Grant 2026',
    category: 'Grant',
    summary: 'Non-equity seed grant for solar, zero-waste, or organic enterprise.',
    locationName: 'Nairobi County Wide', creatorName: 'Innovation Fund',
    trustScore: 99, lastVerifiedAt: '2026-08-05T09:00:00Z',
    validityWindowDays: 30, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&w=1000&q=80',
    metadata: { price: 250000, currency: 'KES', deadline: 'Aug 31', statusBadge: '22 Days Left', rating: 5, reviewsCount: 312 },
    createdAt: '2026-07-01T08:00:00Z'
  },
  {
    id: 'knw_permit_guide', type: 'knowledge',
    title: 'Single Business Permit Online Guide',
    category: 'Guide',
    summary: 'Official registration steps and health inspection requirements.',
    locationName: 'City Hall Annex', creatorName: 'Civic Data Group',
    trustScore: 98, lastVerifiedAt: '2026-08-05T14:00:00Z',
    validityWindowDays: 120, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=1000&q=80',
    metadata: { operatingHours: 'Est 3 Days', statusBadge: '4-Step Process', rating: 4.7, reviewsCount: 156 },
    createdAt: '2026-03-10T08:00:00Z'
  },
  {
    id: 'prd_solar_kit', type: 'product',
    title: 'Portable Solar Lighting Pack (50W)',
    category: 'Equipment',
    summary: 'Heavy-duty 50W panel + 12V LiFePO4 battery box for vendor stalls.',
    locationName: 'Kilimani Hardware Lab', creatorName: 'Kikao Hardware',
    trustScore: 97, lastVerifiedAt: '2026-08-04T11:00:00Z',
    validityWindowDays: 90, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1000&q=80',
    metadata: { price: 18500, currency: 'KES', statusBadge: '35 In Stock', rating: 4.9, reviewsCount: 92 },
    createdAt: '2026-05-10T08:00:00Z'
  },
  {
    id: 'srv_health_inspection', type: 'service',
    title: 'Food Safety Premises Inspection',
    category: 'Inspection',
    summary: 'Pre-opening food hygiene site visit by county health inspector.',
    locationName: 'Nairobi CBD', creatorName: 'City Licensing Board',
    trustScore: 96, lastVerifiedAt: '2026-08-05T09:00:00Z',
    validityWindowDays: 30, isVerified: true,
    imageUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=1000&q=80',
    metadata: { price: 3500, currency: 'KES', statusBadge: 'Bookable Slot', rating: 4.8, reviewsCount: 114 },
    createdAt: '2026-04-15T08:00:00Z'
  }
];

const INITIAL_JOURNEYS: Journey[] = [
  {
    id: 'jrn_register_food_biz',
    title: 'Register & Open Licensed Food Enterprise',
    category: 'Setup Workflow',
    description: 'Trackable process linking health clearance, inspection, and permit issuance.',
    estimatedDays: 5, progressPercent: 50, isCompleted: false,
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
  opportunitiesActedOn: 184, businessesHelped: 412, eventsAttended: 620,
  knowledgeResolved: 940, journeysCompleted: 118,
  communityContributions: 1450, infoFreshnessPct: 97.4
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export function App() {
  const [objects] = useState<BriefObject[]>(INITIAL_OBJECTS);
  const [journeys] = useState<Journey[]>(INITIAL_JOURNEYS);
  const [townHealth] = useState<TownHealthMetrics>(INITIAL_TOWN_HEALTH);

  const [relationships, setRelationships] = useState<ObjectRelationship[]>([
    { id: 'rel_1', sourceType: 'identity', sourceId: 'usr_me', verb: 'discovered', targetType: 'place', targetId: 'plc_maji_mazuri', state: 'discovered', updatedAt: new Date().toISOString() },
    { id: 'rel_2', sourceType: 'identity', sourceId: 'usr_me', verb: 'engaged_with', targetType: 'knowledge', targetId: 'knw_permit_guide', state: 'engaged', updatedAt: new Date().toISOString() },
  ]);

  const [activeTab, setActiveTab] = useState<'stream' | 'companion' | 'journeys' | 'health'>('stream');
  const [selectedObjectType, setSelectedObjectType] = useState('all');
  const [selectedLocation] = useState('Nairobi CBD');
  const [searchQuery, setSearchQuery] = useState('');
  const [architectMode, setArchitectMode] = useState(false);
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
      verb = 'saved';
    }

    setRelationships(prev => {
      const existingIdx = prev.findIndex(r => r.targetId === object.id);
      const newEdge: ObjectRelationship = {
        id: `rel_${Date.now()}`, sourceType: 'identity', sourceId: 'usr_me',
        verb, targetType: object.type, targetId: object.id,
        state: nextState, updatedAt: new Date().toISOString()
      };
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = newEdge;
        return updated;
      }
      return [...prev, newEdge];
    });

    showToast(`Saved "${object.title}" to My Layer`);
  };

  const filteredObjects = useMemo(() => objects.filter(obj => {
    const matchesType = selectedObjectType === 'all' || obj.type === selectedObjectType;
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q || obj.title.toLowerCase().includes(q) || obj.summary.toLowerCase().includes(q);
    return matchesType && matchesSearch;
  }), [objects, selectedObjectType, searchQuery]);

  const surface = `bg-[${COLORS.surface}] border-[${COLORS.border}]`;

  return (
    <div
      className="min-h-screen flex flex-col font-sans"
      style={{
        backgroundColor: COLORS.background,
        color: COLORS.primary,
        selectionColor: COLORS.accent,
      }}
    >
      {/* Toast */}
      {toastMessage && (
        <div
          className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl flex items-center gap-2 text-xs font-bold shadow-xl"
          style={{ backgroundColor: COLORS.accent, color: COLORS.background }}
        >
          <Sparkles className="w-4 h-4" />
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <header
        className="sticky top-0 z-40 backdrop-blur-xl"
        style={{
          backgroundColor: 'rgba(11,17,16,0.94)',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <span
                className="text-xl font-black tracking-tight"
                style={{ color: COLORS.primary }}
              >
                Brief
              </span>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold"
                style={{ color: COLORS.muted }}
              >
                <MapPin className="w-3.5 h-3.5" style={{ color: COLORS.accent }} />
                {selectedLocation}
              </span>
            </div>

            <div className="relative flex-1 max-w-md mx-auto">
              <Search
                className="w-4 h-4 absolute left-3 top-2.5"
                style={{ color: COLORS.muted }}
              />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search nearby places, services..."
                className="w-full rounded-lg pl-9 pr-4 py-2 text-xs outline-none"
                style={{
                  backgroundColor: COLORS.surface,
                  color: COLORS.primary,
                  border: `1px solid ${COLORS.border}`,
                }}
              />
            </div>

            <button
              onClick={() => setArchitectMode(!architectMode)}
              aria-label="Toggle Architect Mode"
              className="p-2 rounded-lg transition-colors"
              style={{
                color: architectMode ? COLORS.accent : COLORS.muted,
                backgroundColor: architectMode ? COLORS.surface : 'transparent',
                border: `1px solid ${architectMode ? COLORS.border : 'transparent'}`,
              }}
            >
              <Terminal className="w-4 h-4" />
            </button>
          </div>

          <nav
            className="flex items-center gap-7 h-11 overflow-x-auto no-scrollbar"
            style={{ borderTop: `1px solid ${COLORS.border}` }}
          >
            {[
              ['stream', 'Nearby'],
              ['companion', `My Layer ${relationships.length}`],
              ['journeys', 'Workflows'],
              ['health', 'Intelligence'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className="relative h-full text-xs font-semibold whitespace-nowrap"
                style={{
                  color: activeTab === key ? COLORS.primary : COLORS.muted,
                }}
              >
                {label}
                {activeTab === key && (
                  <span
                    className="absolute left-0 right-0 bottom-0 h-0.5"
                    style={{ backgroundColor: COLORS.accent }}
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-7">
        {/* Quiet stream header instead of a large hero */}
        {activeTab === 'stream' && (
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: COLORS.accent }}
                />
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: COLORS.muted }}
                >
                  {selectedLocation} · Live
                </span>
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                What’s happening nearby
              </h1>
            </div>

            <div
              className="hidden sm:flex items-center gap-2 text-[10px] font-semibold"
              style={{ color: COLORS.muted }}
            >
              <span>{objects.length} items</span>
              <span style={{ color: COLORS.border }}>•</span>
              <span>{townHealth.infoFreshnessPct}% current</span>
            </div>
          </div>
        )}

        {/* Stream */}
        {activeTab === 'stream' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredObjects.map(obj => (
              <article
                key={obj.id}
                onClick={() => setSelectedObjectForDetail(obj)}
                className="group rounded-xl overflow-hidden cursor-pointer transition-colors"
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                {obj.imageUrl && (
                  <div className="overflow-hidden">
                    <img
                      src={obj.imageUrl}
                      alt={obj.title}
                      className="w-full h-40 object-cover transition-transform duration-500 group-hover:scale-[1.025]"
                    />
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-2.5">
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] font-bold"
                      style={{ color: COLORS.accent }}
                    >
                      {obj.category}
                    </span>
                    {obj.isVerified && (
                      <ShieldCheck
                        className="w-4 h-4"
                        style={{ color: COLORS.accent }}
                      />
                    )}
                  </div>

                  <h2 className="font-bold text-[15px] leading-snug mb-2">
                    {obj.title}
                  </h2>

                  <p
                    className="text-xs leading-relaxed mb-4"
                    style={{ color: COLORS.muted }}
                  >
                    {obj.summary}
                  </p>

                  <div
                    className="flex items-center justify-between gap-3 text-[10px]"
                    style={{ color: COLORS.muted }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{obj.locationName || 'Nairobi'}</span>
                    </span>
                    {obj.metadata?.rating && <span>★ {obj.metadata.rating}</span>}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* My Layer */}
        {activeTab === 'companion' && (
          <section>
            <div className="mb-5">
              <h2 className="font-bold text-lg">My Layer</h2>
              <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                Things you’ve discovered, saved, contacted, booked or bought.
              </p>
            </div>

            <div
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              }}
            >
              {relationships.map((relationship, index) => {
                const object = objects.find(item => item.id === relationship.targetId);
                return (
                  <div
                    key={relationship.id}
                    className="p-4 flex items-center justify-between gap-4"
                    style={{
                      borderBottom: index < relationships.length - 1
                        ? `1px solid ${COLORS.border}`
                        : 'none',
                    }}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-sm block truncate">
                        {object?.title || relationship.targetId}
                      </span>
                      <span className="text-[10px] mt-1 block" style={{ color: COLORS.muted }}>
                        {relationship.verb}
                      </span>
                    </div>
                    <span
                      className="text-[9px] uppercase tracking-wider font-bold shrink-0"
                      style={{ color: COLORS.accent }}
                    >
                      {relationship.state}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Workflows */}
        {activeTab === 'journeys' && (
          <section className="space-y-4">
            {journeys.map(journey => (
              <div
                key={journey.id}
                className="rounded-xl p-5"
                style={{
                  backgroundColor: COLORS.surface,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] font-bold"
                      style={{ color: COLORS.accent }}
                    >
                      {journey.category}
                    </span>
                    <h2 className="font-bold text-lg mt-1">{journey.title}</h2>
                    <p className="text-xs mt-2 leading-relaxed" style={{ color: COLORS.muted }}>
                      {journey.description}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold shrink-0"
                    style={{ color: COLORS.accent }}
                  >
                    {journey.progressPercent}%
                  </span>
                </div>

                <div
                  className="mt-5 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: COLORS.border }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${journey.progressPercent}%`,
                      backgroundColor: COLORS.accent,
                    }}
                  />
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Intelligence */}
        {activeTab === 'health' && (
          <section>
            <div className="mb-5">
              <h2 className="font-bold text-lg">Local intelligence</h2>
              <p className="text-xs mt-1" style={{ color: COLORS.muted }}>
                A quiet view of activity across the local layer.
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Opportunities', townHealth.opportunitiesActedOn],
                ['Businesses Helped', townHealth.businessesHelped],
                ['Events', townHealth.eventsAttended],
                ['Knowledge', townHealth.knowledgeResolved],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{
                    backgroundColor: COLORS.surface,
                    border: `1px solid ${COLORS.border}`,
                  }}
                >
                  <div className="text-2xl font-bold" style={{ color: COLORS.primary }}>
                    {value}
                  </div>
                  <div className="text-[10px] mt-1.5" style={{ color: COLORS.muted }}>
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Detail modal */}
        {selectedObjectForDetail && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.72)' }}
            onClick={() => setSelectedObjectForDetail(null)}
          >
            <div
              className="w-full max-w-lg rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surface,
                border: `1px solid ${COLORS.border}`,
              }}
              onClick={e => e.stopPropagation()}
            >
              {selectedObjectForDetail.imageUrl && (
                <img
                  src={selectedObjectForDetail.imageUrl}
                  alt={selectedObjectForDetail.title}
                  className="w-full h-48 object-cover"
                />
              )}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className="text-[10px] uppercase tracking-[0.12em] font-bold"
                      style={{ color: COLORS.accent }}
                    >
                      {selectedObjectForDetail.category}
                    </span>
                    <h2 className="text-xl font-bold mt-1 leading-tight">
                      {selectedObjectForDetail.title}
                    </h2>
                  </div>

                  <button
                    onClick={() => setSelectedObjectForDetail(null)}
                    className="p-2 rounded-lg"
                    style={{
                      color: COLORS.muted,
                      border: `1px solid ${COLORS.border}`,
                    }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm mt-4 leading-relaxed" style={{ color: COLORS.muted }}>
                  {selectedObjectForDetail.summary}
                </p>

                {selectedObjectForDetail.locationName && (
                  <div
                    className="flex items-center gap-2 text-xs mt-4"
                    style={{ color: COLORS.muted }}
                  >
                    <MapPin className="w-4 h-4" />
                    {selectedObjectForDetail.locationName}
                  </div>
                )}

                <button
                  onClick={() => {
                    handleExecuteProtocolAction('save', selectedObjectForDetail);
                    setSelectedObjectForDetail(null);
                  }}
                  className="w-full mt-5 rounded-lg py-3 text-sm font-bold transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: COLORS.accent,
                    color: COLORS.background,
                  }}
                >
                  Save to My Layer
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Architect Mode */}
        {architectMode && (
          <div
            className="fixed bottom-5 left-5 right-5 z-40 rounded-xl p-4"
            style={{
              backgroundColor: COLORS.surface,
              border: `1px solid ${COLORS.accent}`,
            }}
          >
            <div
              className="flex items-center gap-2 font-bold text-sm"
              style={{ color: COLORS.accent }}
            >
              <Terminal className="w-4 h-4" />
              Architect Mode
            </div>
            <p className="text-xs mt-2" style={{ color: COLORS.muted }}>
              Local Layer protocol active. Objects, relationships and workflows are connected.
            </p>
          </div>
        )}
      </main>

      <footer
        className="py-5 text-center text-[10px]"
        style={{
          color: COLORS.muted,
          borderTop: `1px solid ${COLORS.border}`,
        }}
      >
        Brief · Local intelligence layer
      </footer>
    </div>
  );
}

export default App;
