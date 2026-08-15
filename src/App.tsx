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
  Sun,
  Sunset,
  CalendarDays,
  Newspaper,
  Heart,
  MessageCircle,
  X
} from 'lucide-react';

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

  // --- Provenance ------------------------------------------------------------
  // Where this record came from: the listing, register entry or page an
  // ingestor scraped or a contributor cited. Distinct from actionUrl -- this
  // answers "how do we know this?", not "where do we send the user?".
  sourceUrl?: string;

  // --- Destination / action layer -------------------------------------------
  // How Brief routes a user to the real thing. When absent, the destination is
  // derived from locationName / metadata.contactPhone where possible; when
  // nothing can be derived, the UI says so instead of faking a transaction.
  //   'external' -- opens a URL in a new tab (checkout, application portal, doc)
  //   'phone'    -- tel: link, uses actionUrl or falls back to contactPhone
  //   'map'      -- Maps search, uses actionUrl or falls back to locationName
  //   'internal' -- stays in Brief and pivots the stream to this object's type
  actionUrl?: string;
  actionType?: 'internal' | 'external' | 'phone' | 'map';
  actionLabel?: string;
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

// ---------------------------------------------------------------------------
// Tea / news layer.
//
// Posts are deliberately NOT BriefObjects. An object is a durable local thing
// (a market exists for years); a post is a moment (true for hours). They carry
// different fields, age differently, and are moderated differently -- but they
// link: a post can point at the object it is about via relatedObjectId.
// ---------------------------------------------------------------------------
export type TeaEdition = 'morning' | 'evening' | 'weekend';

export type PostKind = 'news' | 'chatter' | 'notice' | 'question' | 'promo';

export interface BriefPost {
  id: string;
  edition: TeaEdition;
  kind: PostKind;
  title: string;
  body: string;
  authorName: string;
  authorHandle?: string;
  authorIsVerified?: boolean;
  publishedAt: string;
  reactionsCount: number;
  commentsCount: number;
  /** Paid distribution. Always surfaced in the UI, never disguised as editorial. */
  isPromoted?: boolean;
  promotedBy?: string;
  /** Links this post to the durable object it is about. */
  relatedObjectId?: string;
  tags?: string[];
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

// ----------------------------------------------------------------------------
// Type-derived helpers (must live BELOW the type declarations above)
// ----------------------------------------------------------------------------

const getObjectActionLabel = (type: ObjectType): string => {
  switch (type) {
    case 'place':
      return 'Find More';
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

// Real, derivable destination for an object -- or null when Brief genuinely
// has nowhere to send the user yet. Never invent a route.
// --- Tea helpers -----------------------------------------------------------

const TEA_EDITIONS: {
  edition: TeaEdition;
  label: string;
  Icon: typeof Sun;
}[] = [
  { edition: 'morning', label: 'Morning', Icon: Sun },
  { edition: 'evening', label: 'Evening', Icon: Sunset },
  { edition: 'weekend', label: 'Weekend', Icon: CalendarDays }
];

// Which edition is "live" right now. Weekend wins on Sat/Sun; otherwise the
// clock decides. Editions are windows over one feed, not separate publications,
// so a reader can always page back to the others.
const getCurrentEdition = (now: Date = new Date()): TeaEdition => {
  const day = now.getDay();
  if (day === 0 || day === 6) return 'weekend';
  return now.getHours() < 14 ? 'morning' : 'evening';
};

const getEditionMeta = (
  edition: TeaEdition
): { label: string; window: string } => {
  switch (edition) {
    case 'morning':
      return { label: 'Morning Tea', window: 'Weekdays before 2pm' };
    case 'evening':
      return { label: 'Evening Tea', window: 'Weekdays after 2pm' };
    case 'weekend':
      return { label: 'Weekend Tea', window: 'Saturday and Sunday' };
  }
};

const getPostKindMeta = (
  kind: PostKind
): { label: string; tone: string } => {
  switch (kind) {
    case 'news':
      return { label: 'News', tone: 'text-[#00FF42] border-[#235F45]' };
    case 'notice':
      return { label: 'Notice', tone: 'text-[#FFD166] border-[#5A4A1E]' };
    case 'chatter':
      return { label: 'Chatter', tone: 'text-[#8DCF74] border-[#235F45]' };
    case 'question':
      return { label: 'Question', tone: 'text-[#7FD1FF] border-[#1E4A5F]' };
    case 'promo':
      return { label: 'Promoted', tone: 'text-[#FF9F6E] border-[#5F3A1E]' };
  }
};

// Compact relative time: 40m, 6h, 3d.
const getRelativeTime = (iso: string, now: Date = new Date()): string => {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
};

const formatCount = (n: number): string =>
  n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);

// Types whose primary action navigates the stream instead of leaving Brief.
const PIVOT_TYPES: ObjectType[] = ['place', 'product', 'service'];

const buildMapsHref = (query: string): string =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const buildTelHref = (phone: string): string =>
  `tel:${phone.replace(/[^\d+]/g, '')}`;

export type ResolvedAction =
  | { kind: 'external'; href: string; label: string }
  | { kind: 'phone'; href: string; label: string }
  | { kind: 'map'; href: string; label: string }
  | { kind: 'internal'; label: string }
  | { kind: 'none'; label: string };

// Single source of truth for "what does the primary button do?".
// Explicit actionType on the object always wins; otherwise we derive what we
// safely can from existing data; otherwise we admit there is no route.
const resolveAction = (object: BriefObject): ResolvedAction => {
  const phone = object.metadata?.contactPhone;
  // `||` not `??` on purpose: an empty-string actionLabel from an ingestor
  // should fall back to the generic label, not render a blank button.
  const label = object.actionLabel || getObjectActionLabel(object.type);

  switch (object.actionType) {
    case 'external':
      // A URL is mandatory here -- fall through to 'none' rather than
      // rendering a link that goes nowhere.
      if (object.actionUrl) {
        return { kind: 'external', href: object.actionUrl, label };
      }
      break;

    case 'phone': {
      const number = object.actionUrl ?? phone;
      if (number) {
        return { kind: 'phone', href: buildTelHref(number), label };
      }
      break;
    }

    case 'map': {
      const query = object.actionUrl ?? object.locationName;
      if (query) {
        const href = query.startsWith('http') ? query : buildMapsHref(query);
        return { kind: 'map', href, label };
      }
      break;
    }

    case 'internal':
      return { kind: 'internal', label };
  }

  // --- No explicit routing: derive what we can ------------------------------
  if (PIVOT_TYPES.includes(object.type)) {
    return { kind: 'internal', label };
  }

  if (phone && (object.type === 'identity' || object.type === 'service')) {
    return { kind: 'phone', href: buildTelHref(phone), label: 'Call' };
  }

  if (
    object.locationName &&
    (object.type === 'place' ||
      object.type === 'experience' ||
      object.type === 'identity')
  ) {
    return { kind: 'map', href: buildMapsHref(object.locationName), label };
  }

  return { kind: 'none', label };
};

// Types that belong to the same real-world errand. Buying a stall kit,
// booking the inspection and applying for the grant are one job to the user,
// even though Brief models them as three different object types.
const TYPE_AFFINITY: Partial<Record<ObjectType, ObjectType[]>> = {
  product: ['service', 'opportunity', 'identity'],
  service: ['product', 'opportunity', 'knowledge', 'identity'],
  opportunity: ['service', 'product', 'knowledge'],
  knowledge: ['service', 'opportunity', 'identity'],
  experience: ['place', 'community', 'identity'],
  identity: ['product', 'service', 'knowledge'],
  place: ['experience', 'identity']
};

const areTypesAffine = (a: ObjectType, b: ObjectType): boolean =>
  (TYPE_AFFINITY[a] ?? []).includes(b);

// Plural noun for a type, used when the stream pivots to it.
const getTypePlural = (type: ObjectType): string => {
  switch (type) {
    case 'place':
      return 'places';
    case 'product':
      return 'items';
    case 'service':
      return 'services';
    case 'experience':
      return 'events';
    case 'opportunity':
      return 'opportunities';
    case 'knowledge':
      return 'guides';
    case 'identity':
      return 'organisations';
    default:
      return 'objects';
  }
};

// Message shown when the primary action retargets the stream.
// `others` is how many OTHER objects share this type -- if none, say so
// rather than announcing a list that turns out to be just this object.
const getPivotMessage = (object: BriefObject, others: number): string => {
  const plural = getTypePlural(object.type);
  if (others === 0) {
    return `No other ${plural} listed nearby yet.`;
  }
  return `Showing ${others} more ${others === 1 ? plural.replace(/s$/, '') : plural} nearby.`;
};

// What the Related rail is called, per type.
const getRelatedHeading = (type: ObjectType): string => {
  switch (type) {
    case 'place':
      return 'Similar places nearby';
    case 'product':
      return 'More equipment nearby';
    case 'service':
      return 'Other services nearby';
    case 'opportunity':
      return 'Other opportunities';
    case 'experience':
      return 'Related events';
    case 'identity':
      return 'Related organisations';
    case 'knowledge':
      return 'Related guides';
    default:
      return 'Similar & nearby';
  }
};

// Honest description of what pressing the primary button will do.
// Describes what the primary button will actually do, derived from the
// resolved action so the caption can never drift from the behaviour.
const getActionNote = (object: BriefObject): string => {
  const action = resolveAction(object);

  switch (action.kind) {
    case 'phone':
      return 'Opens your phone dialler.';
    case 'map':
      return 'Opens this location in Maps.';
    case 'external':
      return 'Opens the official page in a new tab.';
    case 'internal':
      switch (object.type) {
        case 'place':
          return 'Shows other places like this one.';
        case 'product':
          return 'No online checkout yet. Shows other items in the Market.';
        case 'service':
          return 'No online booking yet. Shows other services nearby.';
        default:
          return `Shows other ${getTypePlural(object.type)} nearby.`;
      }
    default:
      return 'Brief has no direct route for this yet. Details are below.';
  }
};

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
      operatingHours: '06:00-18:30',
      statusBadge: 'Open Now',
      capacity: 1500,
      rating: 4.8,
      reviewsCount: 142,
      distanceKm: 0.4
    },
    actionLabel: 'Open Map',
    actionType: 'map',
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
      operatingHours: '06:00-20:00',
      statusBadge: 'Open Access',
      capacity: 800,
      rating: 4.6,
      reviewsCount: 89,
      distanceKm: 0.8
    },
    actionLabel: 'Open Map',
    actionType: 'map',
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
    actionLabel: 'Open Map',
    actionType: 'map',
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
      operatingHours: '08:00-17:00',
      statusBadge: 'Verified Authority',
      contactPhone: '+254 700 000 111',
      rating: 4.3,
      reviewsCount: 64,
      distanceKm: 0.2
    },
    actionLabel: 'Call Office',
    actionType: 'phone',
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
      operatingHours: '07:00-18:00',
      statusBadge: 'Active Seller',
      contactPhone: '+254 712 345 678',
      rating: 4.9,
      reviewsCount: 178,
      distanceKm: 0.4
    },
    actionLabel: 'Call Seller',
    actionType: 'phone',
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
      operatingHours: 'Aug 15, 09:00',
      statusBadge: 'Upcoming',
      capacity: 300,
      rating: 4.8,
      reviewsCount: 45,
      distanceKm: 0.8
    },
    actionLabel: 'Get Directions',
    actionType: 'map',
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
    // actionUrl intentionally absent: no verified application portal yet.
    // The intent is declared, but resolveAction falls through to 'none' and
    // the UI shows "Apply Online unavailable" rather than a guessed URL.
    actionType: 'external',
    actionLabel: 'Apply Online',
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
    // actionUrl intentionally absent: no verified document URL yet.
    actionType: 'external',
    actionLabel: 'Read Guide',
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
    actionLabel: 'Buy',
    actionType: 'internal',
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
    actionLabel: 'Book',
    actionType: 'internal',
    createdAt: '2026-04-15T08:00:00Z'
  }
];

const INITIAL_POSTS: BriefPost[] = [
  {
    id: 'post_water_cbd',
    edition: 'morning',
    kind: 'notice',
    title: 'Water rationing on Haile Selassie Ave this week',
    body: 'County water says supply to the CBD stretch will be cut 09:00-14:00 Tue and Thu. Market traders are advised to fill tanks early. Vendors at Maji Mazuri say they are sharing a bowser.',
    authorName: 'Nairobi Water Desk',
    authorHandle: '@nairobiwater',
    authorIsVerified: true,
    publishedAt: '2026-08-15T05:40:00Z',
    reactionsCount: 214,
    commentsCount: 38,
    relatedObjectId: 'plc_maji_mazuri',
    tags: ['utilities', 'cbd']
  },
  {
    id: 'post_matatu_fare',
    edition: 'morning',
    kind: 'news',
    title: 'Matatu fares on Ngong Road drop back to 70 bob',
    body: 'After two weeks at 100, operators on the Ngong Road route have settled back to 70 during off-peak. Commuters report the change started Thursday evening.',
    authorName: 'Ma3 Route Watch',
    authorHandle: '@ma3watch',
    publishedAt: '2026-08-15T04:15:00Z',
    reactionsCount: 892,
    commentsCount: 156,
    tags: ['transport']
  },
  {
    id: 'post_grant_deadline',
    edition: 'morning',
    kind: 'news',
    title: 'Green Commerce grant closes in 16 days, only 40% of slots claimed',
    body: 'The innovation fund says applications are running well below capacity this cycle. Solar, zero-waste and organic enterprises are all eligible.',
    authorName: 'Brief Desk',
    authorHandle: '@brief',
    authorIsVerified: true,
    publishedAt: '2026-08-15T06:05:00Z',
    reactionsCount: 143,
    commentsCount: 21,
    relatedObjectId: 'opp_green_grant',
    tags: ['funding']
  },
  {
    id: 'post_kikao_promo',
    edition: 'morning',
    kind: 'promo',
    title: 'Solar stall kits at 15% off until Sunday',
    body: 'Kikao Hardware is clearing 50W panel and battery-box sets ahead of new stock. Fits a standard vendor stall and runs lights plus a phone charging bank.',
    authorName: 'Kikao Hardware',
    authorHandle: '@kikaohw',
    publishedAt: '2026-08-15T05:00:00Z',
    reactionsCount: 61,
    commentsCount: 9,
    isPromoted: true,
    promotedBy: 'Kikao Hardware',
    relatedObjectId: 'prd_solar_kit',
    tags: ['market']
  },
  {
    id: 'post_licensing_queue',
    edition: 'evening',
    kind: 'chatter',
    title: 'Licensing office queue was actually short today',
    body: 'Went in at 14:00 expecting the usual. Out in 35 minutes with the permit stamped. Whatever they changed at the annex, it is working.',
    authorName: 'Wanjiru M.',
    authorHandle: '@wanjiru_m',
    publishedAt: '2026-08-14T15:30:00Z',
    reactionsCount: 327,
    commentsCount: 64,
    relatedObjectId: 'id_county_licensing',
    tags: ['permits']
  },
  {
    id: 'post_jeevanjee_music',
    edition: 'evening',
    kind: 'chatter',
    title: 'Someone has been playing sax at Jeevanjee around 18:00',
    body: 'Third evening running. Small crowd, nobody collecting money, just a guy and a saxophone near the fountain. Best thing about my commute right now.',
    authorName: 'Otieno K.',
    authorHandle: '@otieno_k',
    publishedAt: '2026-08-14T16:10:00Z',
    reactionsCount: 1204,
    commentsCount: 187,
    relatedObjectId: 'plc_jeevanjee',
    tags: ['culture']
  },
  {
    id: 'post_inspection_tip',
    edition: 'evening',
    kind: 'question',
    title: 'Does the health inspection need the premises fully fitted?',
    body: 'Booking the food safety visit next week but the counters are not in yet. Anyone done this recently -- do they fail you for that or is a walkthrough enough?',
    authorName: 'Brian N.',
    authorHandle: '@brian_nj',
    publishedAt: '2026-08-14T17:45:00Z',
    reactionsCount: 88,
    commentsCount: 42,
    relatedObjectId: 'srv_health_inspection',
    tags: ['permits', 'food']
  },
  {
    id: 'post_weekend_market',
    edition: 'weekend',
    kind: 'news',
    title: 'Maji Mazuri opens an extra artisan row on Saturdays',
    body: 'Twenty additional stalls along the east wall, mostly leather, beadwork and recycled-metal pieces. Runs 08:00 to 16:00 through the end of the year.',
    authorName: 'City Markets Board',
    authorHandle: '@citymarkets',
    authorIsVerified: true,
    publishedAt: '2026-08-15T03:20:00Z',
    reactionsCount: 456,
    commentsCount: 73,
    relatedObjectId: 'plc_maji_mazuri',
    tags: ['market', 'weekend']
  },
  {
    id: 'post_youth_forum_seats',
    edition: 'weekend',
    kind: 'notice',
    title: 'Youth forum has 60 seats left for today',
    body: 'Registration desk opens 08:30 at the Jeevanjee pavilion. Licensing officers are attending the second session, so bring permit questions.',
    authorName: 'Youth Enterprise Net',
    authorHandle: '@youthnet',
    authorIsVerified: true,
    publishedAt: '2026-08-15T02:50:00Z',
    reactionsCount: 178,
    commentsCount: 26,
    relatedObjectId: 'exp_youth_summit',
    tags: ['events']
  },
  {
    id: 'post_kilimani_hub_weekend',
    edition: 'weekend',
    kind: 'chatter',
    title: 'Kilimani hub is quiet on Saturdays and nobody seems to know',
    body: 'Full lab access, no queue for the 3D printers, and the coffee machine actually works. Weekday crowd has no idea what it is missing.',
    authorName: 'Faith A.',
    authorHandle: '@faith_codes',
    publishedAt: '2026-08-15T01:15:00Z',
    reactionsCount: 634,
    commentsCount: 91,
    relatedObjectId: 'plc_kilimani_hub',
    tags: ['coworking']
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

  const [posts] = useState<BriefPost[]>(INITIAL_POSTS);
  const [likedPostIds, setLikedPostIds] = useState<string[]>([]);
  const [activeEdition, setActiveEdition] = useState<TeaEdition>(() =>
    getCurrentEdition()
  );

  const [activeTab, setActiveTab] = useState<'stream' | 'tea' | 'companion' | 'journeys' | 'health'>('stream');
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

  // Card button. Uses the same resolver as the detail view so a given label
  // means the same thing in both places. Anything without a real destination
  // opens the detail view rather than dead-ending.
  const handlePrimaryAction = (object: BriefObject) => {
    const action = resolveAction(object);

    switch (action.kind) {
      case 'external':
      case 'map':
        window.open(action.href, '_blank', 'noopener,noreferrer');
        handleExecuteProtocolAction('discover', object, { silent: true });
        return;

      case 'phone':
        window.location.href = action.href;
        handleExecuteProtocolAction('contact', object, { silent: true });
        return;

      default:
        setSelectedObjectForDetail(object);
    }
  };

  // Primary action from INSIDE the detail view: retarget the stream at this
  // object's type. A navigation decision, never a simulated transaction.
  const handlePivotToType = (object: BriefObject) => {
    const others = objects.filter(
      (item) => item.type === object.type && item.id !== object.id
    ).length;

    setSelectedObjectType(object.type);
    setSearchQuery('');
    setActiveTab('stream');
    setSelectedObjectForDetail(null);
    handleExecuteProtocolAction('discover', object, { silent: true });
    showToast(getPivotMessage(object, others));
  };

  const handleExecuteProtocolAction = (
    action: ProtocolAction,
    object: BriefObject,
    options?: { silent?: boolean }
  ) => {
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
      book: 'Booking',
      buy: 'Purchase',
      report: 'Reported',
      verify: 'Verification started',
      follow: 'Following',
    };

    // Callers that show their own message suppress this one.
    if (!options?.silent) {
      showToast(`${actionLabels[action]} "${object.title}".`);
    }
  };

  const getRelatedObjects = (object: BriefObject) => {
    const scored = objects
      .filter((item) => item.id !== object.id)
      .map((item) => {
        let score = 0;

        // Same category gets highest relevance
        if (item.category === object.category) {
          score += 3;
        }

        // Same type
        if (item.type === object.type) {
          score += 3;
        }

        // Workflow-adjacent types: buying, booking and funding
        // belong to the same errand even across types. Deliberately weaker
        // than a same-type match so peers always rank first.
        if (item.type !== object.type && areTypesAffine(object.type, item.type)) {
          score += 1;
        }

        // Nearby location
        if (item.locationName && object.locationName) {
          const itemLocation = item.locationName.toLowerCase();
          const objectLocation = object.locationName.toLowerCase();

          if (
            itemLocation.includes(objectLocation.split(',')[0]) ||
            objectLocation.includes(itemLocation.split(',')[0])
          ) {
            score += 2;
          }
        }

        // Shared creator: same vendor or authority.
        if (
          item.creatorName &&
          object.creatorName &&
          item.creatorName === object.creatorName
        ) {
          score += 2;
        }

        return { item, score };
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    // Nothing scored: fall back to the physically closest objects so the
    // rail is never empty. Better a weak neighbour than a dead end.
    if (scored.length === 0) {
      return objects
        .filter((item) => item.id !== object.id)
        .map((item) => ({
          item,
          distance: item.metadata?.distanceKm ?? Number.MAX_SAFE_INTEGER
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4)
        .map(({ item }) => item);
    }

    return scored.slice(0, 4).map(({ item }) => item);
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

  // Computed once per render instead of on every call site in the modal.
  const relatedObjects = selectedObjectForDetail
    ? getRelatedObjects(selectedObjectForDetail)
    : [];

  const liveEdition = getCurrentEdition();

  // Newest first, promoted posts kept inline rather than pinned to the top --
  // paid distribution earns a slot in the feed, not the whole masthead.
  const editionPosts = useMemo(
    () =>
      posts
        .filter((post) => post.edition === activeEdition)
        .sort(
          (a, b) =>
            new Date(b.publishedAt).getTime() -
            new Date(a.publishedAt).getTime()
        ),
    [posts, activeEdition]
  );

  const openPostSubject = (post: BriefPost) => {
    const subject = objects.find((item) => item.id === post.relatedObjectId);
    if (subject) {
      setSelectedObjectForDetail(subject);
    }
  };

  const toggleLike = (post: BriefPost) => {
    setLikedPostIds((prev) =>
      prev.includes(post.id)
        ? prev.filter((id) => id !== post.id)
        : [...prev, post.id]
    );
  };

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
            <button onClick={() => setActiveTab('tea')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'tea' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Tea</button>
            <button onClick={() => setActiveTab('companion')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'companion' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>My Layer ({relationships.length})</button>
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
              <span className="text-xs font-mono font-extrabold uppercase text-[#00FF42]">{selectedLocation} &middot; Live Local Stream</span>
            </div>
            <h1 className="text-xl font-extrabold text-[#E2ECE5]">Brief &mdash; Everything Happening Around You</h1>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs font-extrabold">
            <span className="bg-[#09150E] px-3 py-1.5 rounded-xl border border-[#235F45] text-[#00FF42]">{objects.length} Objects</span>
            <span className="bg-[#09150E] px-3 py-1.5 rounded-xl border border-[#235F45] text-[#00FF42]">{townHealth.infoFreshnessPct}% Fresh</span>
          </div>
        </div>

        {/* Main Content */}
        {activeTab === 'stream' && (
          <>
            {/* TEA */}
            <div className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-baseline gap-2 min-w-0">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#00FF42] shrink-0">
                    Today's Tea
                  </span>
                  <span className="text-[11px] text-[#8DCF74] truncate">
                    What Nairobi is talking about
                  </span>
                </div>

                <button
                  onClick={() => setActiveTab('tea')}
                  className="shrink-0 text-[10px] font-extrabold text-[#8DCF74] hover:text-[#00FF42] px-2 py-1 rounded-full cursor-pointer transition"
                >
                  See all
                </button>
              </div>

              <div className="flex gap-2 overflow-x-auto no-scrollbar">
                {TEA_EDITIONS.map(({ edition, label, Icon }) => (
                  <button
                    key={edition}
                    onClick={() => {
                      setActiveEdition(edition);
                      setActiveTab('tea');
                    }}
                    className="shrink-0 flex items-center gap-1.5 bg-[#102117] border border-[#235F45] hover:border-[#00FF42] rounded-full px-3 py-1.5 transition cursor-pointer"
                  >
                    <Icon className="w-3.5 h-3.5 text-[#00FF42] shrink-0" />
                    <span className="text-[11px] font-extrabold text-[#E2ECE5] whitespace-nowrap">
                      {label}
                    </span>
                    {edition === liveEdition && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF42] shrink-0" />
                    )}
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
                          handlePrimaryAction(obj);
                        }}
                        className="flex-1 bg-[#00FF42] hover:bg-[#8DCF74] text-[#09150E] font-extrabold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <span>{resolveAction(obj).label}</span>
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

        {/* TEA */}
        {activeTab === 'tea' && (
          <section className="space-y-4">
            <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Newspaper className="w-4 h-4 text-[#00FF42]" />
                <span className="text-[10px] font-mono uppercase text-[#00FF42]">
                  Tea
                </span>
              </div>

              <h2 className="text-xl font-extrabold">
                What {selectedLocation} is talking about.
              </h2>

              <p className="text-xs text-[#8DCF74] mt-1">
                News, notices and neighbourhood chatter, alongside the
                directory. Posts link back to the places they are about.
              </p>
            </div>

            {/* Edition switcher */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar">
              {TEA_EDITIONS.map(({ edition, label, Icon }) => {
                const isActive = edition === activeEdition;
                const count = posts.filter((p) => p.edition === edition).length;

                return (
                  <button
                    key={edition}
                    onClick={() => setActiveEdition(edition)}
                    className={`shrink-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 border transition cursor-pointer ${
                      isActive
                        ? 'bg-[#00FF42] text-[#09150E] border-[#00FF42]'
                        : 'bg-[#102117] text-[#8DCF74] border-[#235F45] hover:border-[#00FF42]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] font-extrabold whitespace-nowrap">
                      {label}
                    </span>
                    <span
                      className={`text-[10px] font-mono ${
                        isActive ? 'text-[#09150E]/70' : 'text-[#86935C]'
                      }`}
                    >
                      {count}
                    </span>
                    {edition === liveEdition && !isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#00FF42] shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-[10px] text-[#86935C] px-1">
              <span className="font-mono uppercase">
                {getEditionMeta(activeEdition).label}
              </span>
              <span>
                {activeEdition === liveEdition
                  ? 'Live now'
                  : getEditionMeta(activeEdition).window}
              </span>
            </div>

            {/* Posts */}
            {editionPosts.map((post) => {
              const kindMeta = getPostKindMeta(post.kind);
              const subject = objects.find(
                (item) => item.id === post.relatedObjectId
              );
              const isLiked = likedPostIds.includes(post.id);

              return (
                <article
                  key={post.id}
                  className={`bg-[#102117] border rounded-2xl p-4 ${
                    post.isPromoted ? 'border-[#5F3A1E]' : 'border-[#1E3A2A]'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span
                      className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-[#09150E] ${kindMeta.tone}`}
                    >
                      {kindMeta.label}
                    </span>

                    <span className="text-[11px] font-bold text-[#E2ECE5]">
                      {post.authorName}
                    </span>

                    {post.authorIsVerified && (
                      <ShieldCheck className="w-3 h-3 text-[#00FF42] shrink-0" />
                    )}

                    <span className="text-[10px] text-[#86935C] font-mono">
                      {getRelativeTime(post.publishedAt)}
                    </span>
                  </div>

                  <h3 className="text-sm font-extrabold text-[#E2ECE5] leading-snug">
                    {post.title}
                  </h3>

                  <p className="text-xs text-[#8DCF74] mt-1.5 leading-relaxed">
                    {post.body}
                  </p>

                  {post.isPromoted && (
                    <p className="text-[10px] text-[#FF9F6E] mt-2">
                      Paid distribution by {post.promotedBy}.
                    </p>
                  )}

                  {subject && (
                    <button
                      onClick={() => openPostSubject(post)}
                      className="mt-3 w-full flex items-center gap-2 bg-[#09150E] border border-[#1E3A2A] hover:border-[#00FF42] rounded-xl p-2.5 transition cursor-pointer group text-left"
                    >
                      {subject.imageUrl && (
                        <img
                          src={subject.imageUrl}
                          alt=""
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="text-[9px] font-mono uppercase text-[#86935C]">
                          About this {getObjectTypeMeta(subject.type).label}
                        </div>
                        <div className="text-[11px] font-extrabold truncate group-hover:text-[#00FF42]">
                          {subject.title}
                        </div>
                      </div>

                      <ArrowRight className="w-3.5 h-3.5 text-[#00FF42] shrink-0" />
                    </button>
                  )}

                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-[#1E3A2A]">
                    <button
                      onClick={() => toggleLike(post)}
                      className={`flex items-center gap-1.5 text-[11px] font-bold cursor-pointer transition ${
                        isLiked ? 'text-[#00FF42]' : 'text-[#86935C] hover:text-[#8DCF74]'
                      }`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-current' : ''}`}
                      />
                      {formatCount(post.reactionsCount + (isLiked ? 1 : 0))}
                    </button>

                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#86935C]">
                      <MessageCircle className="w-3.5 h-3.5" />
                      {formatCount(post.commentsCount)}
                    </span>

                    {post.tags && post.tags.length > 0 && (
                      <span className="ml-auto text-[10px] font-mono text-[#86935C] truncate">
                        {post.tags.map((tag) => `#${tag}`).join(' ')}
                      </span>
                    )}
                  </div>
                </article>
              );
            })}

            {editionPosts.length === 0 && (
              <div className="py-16 text-center border border-dashed border-[#235F45] rounded-2xl">
                <Newspaper className="w-8 h-8 mx-auto mb-3 text-[#86935C]" />
                <p className="text-sm font-bold">No tea in this edition yet.</p>
              </div>
            )}
          </section>
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

      {/* DETAIL LAYER */}
      {selectedObjectForDetail && (
        <div
          className="fixed inset-0 z-50 bg-[#09150E]/90 backdrop-blur-md overflow-y-auto"
          onClick={() => setSelectedObjectForDetail(null)}
        >
          <div className="min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div
              className="w-full max-w-2xl bg-[#102117] border border-[#235F45] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >

              {/* Hero */}
              {selectedObjectForDetail.imageUrl && (
                <div className="relative h-56 sm:h-72">
                  <img
                    src={selectedObjectForDetail.imageUrl}
                    alt={selectedObjectForDetail.title}
                    className="w-full h-full object-cover"
                  />

                  <button
                    onClick={() => setSelectedObjectForDetail(null)}
                    className="absolute top-4 right-4 p-2 rounded-full bg-[#09150E]/80 text-[#E2ECE5] border border-[#235F45]"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-4 flex gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#09150E]/85 text-[#00FF42] border border-[#235F45]">
                      {selectedObjectForDetail.category}
                    </span>

                    {selectedObjectForDetail.isVerified && (
                      <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#00FF42] text-[#09150E]">
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Details */}
              <div className="p-5 space-y-5">

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-mono uppercase text-[#86935C]">
                      {getObjectTypeMeta(selectedObjectForDetail.type).label}
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold text-[#E2ECE5]">
                    {selectedObjectForDetail.title}
                  </h2>

                  <p className="text-sm text-[#8DCF74] mt-2 leading-relaxed">
                    {selectedObjectForDetail.summary}
                  </p>
                </div>

                {/* Facts */}
                <div className="grid grid-cols-2 gap-3">

                  {selectedObjectForDetail.locationName && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <MapPin className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Location
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.locationName}
                      </div>
                      {/* Only offer Maps here when the primary button does
                          something else -- otherwise it's a duplicate. */}
                      {resolveAction(selectedObjectForDetail).kind !== 'map' && (
                        <a
                          href={buildMapsHref(
                            selectedObjectForDetail.locationName
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00FF42] mt-2 hover:underline"
                        >
                          Open in Maps
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.operatingHours && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Clock className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        When
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.operatingHours}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.price !== undefined && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Tag className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Price
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.currency || 'KES'}{' '}
                        {selectedObjectForDetail.metadata.price.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.creatorName && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <User className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        {selectedObjectForDetail.type === 'product'
                          ? 'Seller'
                          : selectedObjectForDetail.type === 'service'
                          ? 'Provider'
                          : selectedObjectForDetail.type === 'opportunity'
                          ? 'Offered by'
                          : 'Source'}
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.creatorName}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.deadline && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Clock className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Deadline
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.deadline}
                        {selectedObjectForDetail.metadata.statusBadge
                          ? ` (${selectedObjectForDetail.metadata.statusBadge})`
                          : ''}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.statusBadge &&
                    !selectedObjectForDetail.metadata?.deadline && (
                      <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                        <Sparkles className="w-4 h-4 text-[#00FF42] mb-2" />
                        <div className="text-[10px] uppercase text-[#86935C]">
                          {selectedObjectForDetail.type === 'product'
                            ? 'Availability'
                            : 'Status'}
                        </div>
                        <div className="text-xs font-bold mt-1">
                          {selectedObjectForDetail.metadata.statusBadge}
                        </div>
                      </div>
                    )}

                  {selectedObjectForDetail.metadata?.rating !== undefined && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Award className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Rating
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.rating}
                        {selectedObjectForDetail.metadata.reviewsCount
                          ? ` (${selectedObjectForDetail.metadata.reviewsCount} reviews)`
                          : ''}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.capacity !== undefined && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Users className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Capacity
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.capacity.toLocaleString()}
                      </div>
                    </div>
                  )}

                  {selectedObjectForDetail.metadata?.contactPhone && (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3">
                      <Building2 className="w-4 h-4 text-[#00FF42] mb-2" />
                      <div className="text-[10px] uppercase text-[#86935C]">
                        Contact
                      </div>
                      <div className="text-xs font-bold mt-1">
                        {selectedObjectForDetail.metadata.contactPhone}
                      </div>
                    </div>
                  )}

                </div>

                {/* Trust */}
                {selectedObjectForDetail.trustScore !== undefined && (
                  <div className="flex items-center justify-between bg-[#09150E] border border-[#1E3A2A] rounded-xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-[#00FF42]" />
                      <span className="text-xs font-bold">
                        Information trust
                      </span>
                    </div>

                    <span className="text-sm font-extrabold text-[#00FF42]">
                      {selectedObjectForDetail.trustScore}%
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleExecuteProtocolAction(
                          'save',
                          selectedObjectForDetail
                        )
                      }
                      className="flex-1 py-3 rounded-xl bg-[#172D20] border border-[#235F45] text-[#8DCF74] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Bookmark className="w-4 h-4" />
                      Save
                    </button>

                    {(() => {
                      const action = resolveAction(selectedObjectForDetail);
                      const primaryClass =
                        'flex-[2] py-3 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer';

                      // Stays in Brief: pivot the stream sideways.
                      if (action.kind === 'internal') {
                        return (
                          <button
                            onClick={() =>
                              handlePivotToType(selectedObjectForDetail)
                            }
                            className={primaryClass}
                          >
                            {action.label}
                            <ArrowRight className="w-4 h-4" />
                          </button>
                        );
                      }

                      // Real destination -> real link.
                      if (action.kind !== 'none') {
                        const newTab = action.kind !== 'phone';
                        return (
                          <a
                            href={action.href}
                            target={newTab ? '_blank' : undefined}
                            rel={newTab ? 'noopener noreferrer' : undefined}
                            onClick={() =>
                              handleExecuteProtocolAction(
                                action.kind === 'phone' ? 'contact' : 'discover',
                                selectedObjectForDetail,
                                { silent: true }
                              )
                            }
                            className={primaryClass}
                          >
                            {action.label}
                            <ArrowRight className="w-4 h-4" />
                          </a>
                        );
                      }

                      // No route -> say so plainly. Don't fake a transaction.
                      return (
                        <div className="flex-[2] py-3 rounded-xl bg-[#172D20] border border-dashed border-[#235F45] text-[#86935C] font-extrabold text-xs flex items-center justify-center gap-2">
                          {action.label} unavailable
                        </div>
                      );
                    })()}
                  </div>

                  <p className="text-[10px] text-[#86935C] text-center">
                    {getActionNote(selectedObjectForDetail)}
                  </p>
                </div>

                {/* Related */}
                {relatedObjects.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#1E3A2A]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-[#00FF42]">
                          Continue exploring
                        </p>
                        <h3 className="text-sm font-extrabold mt-1">
                          {getRelatedHeading(selectedObjectForDetail.type)}
                        </h3>
                      </div>

                      <span className="text-[10px] text-[#86935C] shrink-0">
                        {relatedObjects.length} nearby
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relatedObjects.map((related) => (
                        <button
                          key={related.id}
                          onClick={() => setSelectedObjectForDetail(related)}
                          className="text-left bg-[#09150E] border border-[#1E3A2A] hover:border-[#00FF42] rounded-xl p-3 transition group cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            {related.imageUrl && (
                              <img
                                src={related.imageUrl}
                                alt=""
                                className="w-14 h-14 rounded-lg object-cover shrink-0"
                              />
                            )}

                            <div className="min-w-0">
                              <p className="text-[9px] font-mono uppercase text-[#86935C]">
                                {related.category}
                              </p>

                              <p className="text-xs font-extrabold mt-1 line-clamp-2 group-hover:text-[#00FF42]">
                                {related.title}
                              </p>

                              {related.locationName && (
                                <p className="text-[10px] text-[#8DCF74] mt-1 truncate">
                                  {related.locationName}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-[#1E3A2A] mt-12 py-6 text-xs text-[#86935C] text-center font-mono">
        Brief 10.0 &middot; Everything Happening Around You
      </footer>

    </div>
  );
}

export default App;