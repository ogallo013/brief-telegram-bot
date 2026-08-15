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
  ExternalLink,
  Eye,
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
  //
  // sourceType names the channel it arrived through, so an ingestor can be
  // attributed, rate-limited and trust-weighted per channel: a county register
  // is not a Telegram forward.
  sourceType?: SourceType | 'user';
  sourceUrl?: string;

  // Ingestion plumbing (prompt 22). Not rendered anywhere yet -- these exist so
  // a future pipeline can attribute, de-duplicate and re-fetch a record without
  // another migration. No seed object sets them; none are back-filled.
  sourceId?: string;
  sourceMessageId?: string;
  ingestedAt?: string;

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

  // --- Explicit object graph --------------------------------------------------
  // Only ever set deliberately (by a curator or an ingestor that genuinely
  // knows the link). Discovery ranks these above inferred similarity, so a
  // wrong value here is worse than no value. Never populate by guessing.
  //   parentObjectId   -- this belongs to / is part of that
  //   providerObjectId -- the identity that sells or operates this
  //   locationObjectId -- the place this physically happens at
  //   relatedObjectIds -- hand-curated siblings
  parentObjectId?: string;
  providerObjectId?: string;
  locationObjectId?: string;
  relatedObjectIds?: string[];
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
  // Optional personal note on WHY this was saved (prompt 10). Lives on the
  // relationship, not on a parallel saved-object store. Absent on every
  // pre-existing edge, and everything must keep working when it is.
  label?: SaveLabel;
}

// Deliberately a closed list: freeform tags become a taxonomy nobody maintains.
export type SaveLabel = 'Later' | 'Important' | 'Visit' | 'Buy' | 'Apply' | 'Follow up';

export const SAVE_LABELS: SaveLabel[] = [
  'Later',
  'Important',
  'Visit',
  'Buy',
  'Apply',
  'Follow up'
];

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

// Why an object was surfaced. Drives the section heading and per-tile chips,
// so the rail can explain itself instead of being an unlabelled grid.
export type RelationReason =
  | 'linked'
  | 'provider'
  | 'location'
  | 'nearby'
  | 'complementary'
  | 'similar';

export interface ScoredRelation {
  item: BriefObject;
  score: number;
  reason: RelationReason;
}

// Any explicit relationship must beat any inferred one. The inferred signals in
// getRelatedObjects sum to at most ~24, so this floor is deliberately clear of
// that ceiling rather than tuned to it.
const EXPLICIT_LINK_FLOOR = 100;

const STOP_WORDS = new Set([
  'and','the','for','with','from','this','that','their','are','was','not',
  'open','new','all','any','out','use','via','per','its','has','you','your'
]);

// Words worth matching on, drawn from the fields a human would skim.
const getKeywords = (object: BriefObject): Set<string> => {
  const raw = `${object.title} ${object.category} ${object.summary} ${
    object.metadata?.statusBadge ?? ''
  }`.toLowerCase();

  return new Set(
    raw
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
  );
};

const countKeywordOverlap = (a: Set<string>, b: Set<string>): number => {
  let n = 0;
  a.forEach((word) => {
    if (b.has(word)) n += 1;
  });
  return n;
};

// Heading reflects what the rail actually contains, not just the source type.
const getRelatedHeading = (
  object: BriefObject,
  relations: ScoredRelation[]
): string => {
  if (relations.length === 0) return 'Related';

  const reasons = relations.map((relation) => relation.reason);

  if (reasons.every((reason) => reason === 'nearby')) return 'Nearby';
  if (reasons.some((reason) => reason === 'linked' || reason === 'provider')) {
    switch (object.type) {
      case 'product':
        return 'Sellers and related services';
      case 'service':
        return 'Providers and related places';
      case 'knowledge':
        return 'Related services and guides';
      case 'opportunity':
        return 'Guides and services to apply';
      default:
        return 'Directly related';
    }
  }

  switch (object.type) {
    case 'place':
      return 'Nearby places and vendors';
    case 'product':
      return 'More products and sellers';
    case 'service':
      return 'Other providers nearby';
    case 'opportunity':
      return 'Related opportunities';
    case 'experience':
      return 'Related places and events';
    case 'identity':
      return 'Other vendors and organisations';
    case 'knowledge':
      return 'Related guides';
    default:
      return 'More like this';
  }
};

const getReasonChip = (reason: RelationReason): string | null => {
  switch (reason) {
    case 'provider':
      return 'Provider';
    case 'location':
      return 'Location';
    case 'linked':
      return 'Related';
    case 'complementary':
      return 'Goes with this';
    case 'nearby':
      return 'Nearby';
    default:
      return null;
  }
};

// STEP 5 Proximity: only ever from real distanceKm. Never computed, never guessed.
const getDistanceLabel = (object: BriefObject): string | null => {
  const distance = object.metadata?.distanceKm;
  if (distance === undefined) return null;
  if (distance < 0.1) return 'Right here';
  if (distance < 1) return `${Math.round(distance * 1000)} m away`;
  return `${distance} km away`;
};

// STEP 2 Key facts, generated from whatever metadata exists. Adding a metadata key
// to an object surfaces it here without touching the JSX.
export interface KeyFact {
  key: string;
  label: string;
  value: string;
}

const buildKeyFacts = (object: BriefObject): KeyFact[] => {
  const meta = object.metadata ?? {};
  const facts: KeyFact[] = [];
  const push = (key: string, label: string, value?: string | null) => {
    if (value) facts.push({ key, label, value });
  };

  if (meta.price !== undefined) {
    push(
      'price',
      object.type === 'opportunity' ? 'Value' : 'Price',
      `${meta.currency || 'KES'} ${meta.price.toLocaleString()}`
    );
  }

  push('operatingHours', object.type === 'experience' ? 'When' : 'Hours', meta.operatingHours);
  push('deadline', 'Deadline', meta.deadline);

  if (!meta.deadline) {
    push(
      'statusBadge',
      object.type === 'product' ? 'Availability' : 'Status',
      meta.statusBadge
    );
  }

  if (meta.rating !== undefined) {
    push('rating', 'Rating', `${meta.rating} / 5`);
  }
  if (meta.reviewsCount !== undefined) {
    push('reviewsCount', 'Reviews', `${meta.reviewsCount.toLocaleString()}`);
  }
  if (meta.capacity !== undefined) {
    push('capacity', 'Capacity', meta.capacity.toLocaleString());
  }
  if (meta.attendeesCount !== undefined) {
    push('attendeesCount', 'Attending', meta.attendeesCount.toLocaleString());
  }

  push('distanceKm', 'Distance', getDistanceLabel(object));

  return facts;
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
      return 'Brief has no direct route for thi