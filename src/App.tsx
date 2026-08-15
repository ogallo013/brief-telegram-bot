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
      return 'Brief has no direct route for this yet. Details are below.';
  }
};

// ----------------------------------------------------------------------------
// Freshness (prompt 13). Derived ONLY from lastVerifiedAt + validityWindowDays.
// If either is missing we return null and the UI shows nothing -- an unverified
// record must never be dressed up as a fresh one.
// ----------------------------------------------------------------------------
export type FreshnessLevel = 'recent' | 'verified' | 'aging' | 'stale';

export interface Freshness {
  level: FreshnessLevel;
  label: string;
  verifiedOn: string;
  daysAgo: number;
}

const DAY_MS = 86400000;

const getFreshness = (
  object: BriefObject,
  now: Date = new Date()
): Freshness | null => {
  if (!object.lastVerifiedAt || object.validityWindowDays === undefined) {
    return null;
  }

  const verified = new Date(object.lastVerifiedAt);
  if (Number.isNaN(verified.getTime())) return null;

  const daysAgo = Math.max(0, Math.floor((now.getTime() - verified.getTime()) / DAY_MS));
  const windowDays = object.validityWindowDays;
  const ratio = windowDays > 0 ? daysAgo / windowDays : 1;

  // "stale" is only ever claimed when the supplied dates actually prove it.
  const level: FreshnessLevel =
    ratio > 1 ? 'stale' : ratio > 0.66 ? 'aging' : daysAgo <= 7 ? 'recent' : 'verified';

  const label =
    level === 'stale'
      ? 'Verification expired'
      : level === 'aging'
      ? 'Verification aging'
      : level === 'recent'
      ? 'Recently verified'
      : 'Verified';

  const verifiedOn = verified.toISOString().slice(0, 10);

  return { level, label, verifiedOn, daysAgo };
};

// ----------------------------------------------------------------------------
// Change detection (prompt 23). Pure: compares two versions of the same object
// and reports meaningful differences. Timestamps and unrelated metadata are
// deliberately ignored. This is what Watch will eventually consume.
// ----------------------------------------------------------------------------
export interface ObjectChange {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
}

const CHANGE_FIELDS: { key: string; label: string; fromMeta?: boolean }[] = [
  { key: 'title', label: 'Title' },
  { key: 'summary', label: 'Summary' },
  { key: 'locationName', label: 'Location' },
  { key: 'price', label: 'Price', fromMeta: true },
  { key: 'statusBadge', label: 'Status', fromMeta: true },
  { key: 'deadline', label: 'Deadline', fromMeta: true },
  { key: 'operatingHours', label: 'Hours', fromMeta: true },
  { key: 'capacity', label: 'Capacity', fromMeta: true },
  { key: 'contactPhone', label: 'Contact', fromMeta: true }
];

const readField = (object: BriefObject, key: string, fromMeta?: boolean): string | null => {
  const raw = fromMeta
    ? object.metadata?.[key]
    : (object as unknown as Record<string, unknown>)[key];
  if (raw === undefined || raw === null || raw === '') return null;
  return String(raw);
};

const diffObjects = (before: BriefObject, after: BriefObject): ObjectChange[] => {
  const changes: ObjectChange[] = [];
  for (const field of CHANGE_FIELDS) {
    const from = readField(before, field.key, field.fromMeta);
    const to = readField(after, field.key, field.fromMeta);
    if (from !== to) {
      changes.push({ field: field.key, label: field.label, from, to });
    }
  }
  return changes;
};

// ----------------------------------------------------------------------------
// Duplicate detection (prompt 15). Returns candidates only -- never deletes,
// never merges. Pure string work, no dependencies.
// ----------------------------------------------------------------------------
export interface DuplicateCandidate {
  item: BriefObject;
  similarity: number;
}

const normaliseTitle = (title: string): string =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

// Dice coefficient over character bigrams: cheap, dependency-free, and much
// steadier on short business names than raw edit distance.
const titleSimilarity = (a: string, b: string): number => {
  const x = normaliseTitle(a);
  const y = normaliseTitle(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.length < 2 || y.length < 2) return 0;

  const bigrams = (v: string): Map<string, number> => {
    const map = new Map<string, number>();
    for (let i = 0; i < v.length - 1; i++) {
      const g = v.slice(i, i + 2);
      map.set(g, (map.get(g) ?? 0) + 1);
    }
    return map;
  };

  const ax = bigrams(x);
  const by = bigrams(y);
  let shared = 0;
  ax.forEach((count, g) => {
    const other = by.get(g);
    if (other) shared += Math.min(count, other);
  });

  const total = x.length - 1 + (y.length - 1);
  return total > 0 ? (2 * shared) / total : 0;
};

const findPotentialDuplicates = (
  object: BriefObject,
  pool: BriefObject[],
  threshold = 0.82
): DuplicateCandidate[] =>
  pool
    .filter((item) => item.id !== object.id && item.type === object.type)
    .map((item) => {
      let similarity = titleSimilarity(object.title, item.title);
      // Same stated location corroborates; it cannot manufacture a match.
      if (
        similarity > 0.5 &&
        object.locationName &&
        item.locationName &&
        normaliseTitle(object.locationName) === normaliseTitle(item.locationName)
      ) {
        similarity = Math.min(1, similarity + 0.08);
      }
      return { item, similarity };
    })
    .filter(({ similarity }) => similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);

// ----------------------------------------------------------------------------
// Contextual actions (prompt 8). Every suggestion is derived from data the
// object actually carries and routed through resolveAction where it maps to a
// real destination. Nothing here invents a URL or a number.
// ----------------------------------------------------------------------------
export interface SuggestedAction {
  key: string;
  label: string;
  kind: 'primary' | 'link' | 'internal';
  href?: string;
}

const getSuggestedActions = (object: BriefObject): SuggestedAction[] => {
  const out: SuggestedAction[] = [];
  const primary = resolveAction(object);
  const phone = object.metadata?.contactPhone;

  if (primary.kind !== 'none') {
    out.push({
      key: 'primary',
      label: primary.label,
      kind: 'primary',
      href: 'href' in primary ? primary.href : undefined
    });
  }

  // Directions: only when this object has a real place to point at, and only
  // when it is not already the primary action.
  if (object.locationName && primary.kind !== 'map') {
    out.push({
      key: 'directions',
      label: 'Get directions',
      kind: 'link',
      href: buildMapsHref(object.locationName)
    });
  }

  if (phone && primary.kind !== 'phone') {
    const label = object.type === 'product' ? 'Contact seller' : 'Call';
    out.push({ key: 'call', label, kind: 'link', href: buildTelHref(phone) });
  }

  if (object.sourceUrl) {
    out.push({ key: 'source', label: 'View source', kind: 'link', href: object.sourceUrl });
  }

  return out;
};

// ----------------------------------------------------------------------------
// The Brief graph (prompt 24). Pure functions over the objects and
// relationships that already exist -- no graph database, no new state, no UI.
// Every question the product asks about an object is answered in one place, so
// the components stay dumb and the rules stay testable.
// ----------------------------------------------------------------------------
export interface BriefGraph {
  get: (id: string) => BriefObject | undefined;
  providerOf: (object: BriefObject) => BriefObject | undefined;
  locationOf: (object: BriefObject) => BriefObject | undefined;
  offeringsBy: (provider: BriefObject) => BriefObject[];
  eventsAt: (place: BriefObject) => BriefObject[];
  nearby: (object: BriefObject, limit?: number) => BriefObject[];
  saved: () => BriefObject[];
  watching: () => BriefObject[];
  savedLabel: (id: string) => SaveLabel | undefined;
  activity: (limit?: number) => { object: BriefObject; verb: string; updatedAt: string }[];
  duplicatesOf: (object: BriefObject) => DuplicateCandidate[];
  changes: (before: BriefObject, after: BriefObject) => ObjectChange[];
}

// Verbs that represent a deliberate user commitment, in the order we would
// narrate them. 'discovered' is passive noise and stays out of Activity.
const ACTIVITY_VERBS: Record<string, string> = {
  saved: 'Saved',
  watched: 'Watching',
  engaged_with: 'Opened',
  interacted_with: 'Opened',
  contacted: 'Contacted',
  booked: 'Booked',
  bought: 'Bought',
  shared: 'Shared'
};

const createBriefGraph = (
  objects: BriefObject[],
  relationships: ObjectRelationship[]
): BriefGraph => {
  const byId = new Map(objects.map((o) => [o.id, o]));
  const get = (id: string) => byId.get(id);

  const edgesWith = (verb: string) =>
    relationships.filter((r) => r.verb === verb);

  const targetsOf = (verb: string): BriefObject[] =>
    edgesWith(verb)
      .map((r) => byId.get(r.targetId))
      .filter((o): o is BriefObject => Boolean(o));

  return {
    get,

    providerOf: (object) =>
      object.providerObjectId ? byId.get(object.providerObjectId) : undefined,

    locationOf: (object) =>
      object.locationObjectId ? byId.get(object.locationObjectId) : undefined,

    // Everything this identity is recorded as providing, either by explicit
    // link or by carrying its name. No inference beyond an exact name match.
    offeringsBy: (provider) =>
      objects.filter(
        (o) =>
          o.id !== provider.id &&
          (o.providerObjectId === provider.id ||
            (Boolean(o.creatorName) && o.creatorName === provider.creatorName))
      ),

    eventsAt: (place) =>
      objects.filter(
        (o) =>
          o.type === 'experience' &&
          (o.locationObjectId === place.id || o.parentObjectId === place.id)
      ),

    // Same stated location first, then genuine distance. Objects with no
    // distance data are simply absent -- never sorted as if they were at 0 km.
    nearby: (object, limit = 4) => {
      const here = object.locationName?.toLowerCase() ?? null;
      return objects
        .filter((o) => o.id !== object.id)
        .map((o) => {
          const sameLocation =
            here && o.locationName && o.locationName.toLowerCase() === here ? 1 : 0;
          const distance = o.metadata?.distanceKm;
          return { o, sameLocation, distance };
        })
        .filter(({ sameLocation, distance }) => sameLocation === 1 || distance !== undefined)
        .sort((a, b) => {
          if (a.sameLocation !== b.sameLocation) return b.sameLocation - a.sameLocation;
          const da = a.distance ?? Number.MAX_SAFE_INTEGER;
          const db = b.distance ?? Number.MAX_SAFE_INTEGER;
          return da - db;
        })
        .slice(0, limit)
        .map(({ o }) => o);
    },

    saved: () => targetsOf('saved'),
    watching: () => targetsOf('watched'),

    savedLabel: (id) =>
      relationships.find((r) => r.targetId === id && r.verb === 'saved')?.label,

    activity: (limit = 6) =>
      relationships
        .filter((r) => ACTIVITY_VERBS[r.verb] && byId.has(r.targetId))
        .slice()
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        .slice(0, limit)
        .map((r) => ({
          object: byId.get(r.targetId) as BriefObject,
          verb: ACTIVITY_VERBS[r.verb],
          updatedAt: r.updatedAt
        })),

    duplicatesOf: (object) => findPotentialDuplicates(object, objects),

    changes: (before, after) => diffObjects(before, after)
  };
};

// ============================================================================
// PURSUITS
// ----------------------------------------------------------------------------
// A Pursuit is something the user has asked Brief to find, monitor or keep
// organising -- "a good plumber near me", "cattle auctions this week", "watch
// the green grant". It is the standing intent; objects are what satisfy it.
//
// Brief only ever matches a Pursuit against information it actually holds. It
// does not search the internet, does not invent results, and an empty Pursuit
// is reported as empty rather than padded with weak guesses.
// ============================================================================

export type PursuitStatus = 'active' | 'paused' | 'completed' | 'archived';

export interface Pursuit {
  id: string;
  query: string;
  status: PursuitStatus;
  createdAt: string;
  lastUpdatedAt: string;
  // Which channels this pursuit is allowed to draw on. Present so an ingestion
  // pipeline can scope a pursuit to, say, one Telegram group later.
  sourceTypes: NonNullable<BriefObject['sourceType']>[];
  matchedObjectIds: string[];
  // When true, the pursuit should re-check as new information arrives. The
  // monitoring loop is not built yet; this records the intent.
  watchChanges: boolean;
  // Which changes matter. Optional so every pursuit created before this
  // existed keeps working; absent means "any new match".
  watchConditions?: WatchCondition[];
}

// ----------------------------------------------------------------------------
// One scoring brain, shared by the search box and by pursuit matching, so a
// phrase means the same thing in both places.
// ----------------------------------------------------------------------------
const scoreObjectForPhrase = (object: BriefObject, phrase: string): number => {
  const query = phrase.trim().toLowerCase();
  if (query === '') return 0;

  const title = object.title.toLowerCase();
  const category = object.category.toLowerCase();
  const summary = object.summary.toLowerCase();
  const location = (object.locationName ?? '').toLowerCase();
  const creator = (object.creatorName ?? '').toLowerCase();
  const status = (object.metadata?.statusBadge ?? '').toLowerCase();

  let score = 0;
  if (title === query) score += 100;
  else if (title.startsWith(query)) score += 60;
  else if (title.includes(query)) score += 40;

  if (category === query) score += 30;
  else if (category.includes(query)) score += 18;

  if (object.type.includes(query)) score += 16;
  if (creator.includes(query)) score += 12;
  if (location.includes(query)) score += 10;
  if (status.includes(query)) score += 6;
  if (summary.includes(query)) score += 4;

  return score;
};

// Words that carry intent rather than subject matter. They tell us HOW to
// pursue, so they must not also be matched as if they were search terms --
// otherwise "find a plumber" scores every object containing "find".
const PURSUIT_INTENT_WORDS = new Set([
  'find',
  'show',
  'get',
  'look',
  'looking',
  'search',
  'watch',
  'monitor',
  'track',
  'want',
  'need',
  'me',
  'my',
  'a',
  'an',
  'the',
  'for',
  'near',
  'nearby',
  'around',
  'this',
  'that',
  'week',
  'today',
  'tomorrow',
  'good',
  'best',
  'cheapest',
  'cheap',
  'any',
  'some',
  'one',
  'ones',
  'thing',
  'things',
  'please',
  'where',
  'what',
  'is',
  'are',
  'in',
  'on',
  'at',
  'to',
  'of',
  'and'
]);

const getPursuitTerms = (query: string): string[] =>
  Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length > 2 && !PURSUIT_INTENT_WORDS.has(w))
    )
  );

// A pursuit query is natural language, so we score the whole phrase AND its
// meaningful terms. Requiring a real term hit is what stops "find me anything"
// from matching the entire graph.
// Deliberately minimal stemming -- enough that "lights" finds "Lighting" and
// "auctions" finds "Auction", without pulling in a linguistics library that
// would start making decisions nobody can audit.
const singularise = (word: string): string => {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('es')) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) {
    return word.slice(0, -1);
  }
  return word;
};

// A stem hit is real but weaker than the word the user actually typed.
const scoreTerm = (object: BriefObject, term: string): number => {
  const direct = scoreObjectForPhrase(object, term);
  if (direct > 0) return direct;

  const stem = singularise(term);
  if (stem !== term && stem.length > 2) {
    return scoreObjectForPhrase(object, stem) * 0.9;
  }
  return 0;
};

export interface PursuitMatch {
  item: BriefObject;
  score: number;
  matchedTerms: string[];
}

const matchPursuit = (
  pursuit: Pursuit,
  pool: BriefObject[],
  limit = 8
): PursuitMatch[] => {
  const terms = getPursuitTerms(pursuit.query);
  if (terms.length === 0) return [];

  const allowed =
    pursuit.sourceTypes.length > 0
      ? pool.filter(
          (o) =>
            o.sourceType === undefined ||
            pursuit.sourceTypes.includes(o.sourceType)
        )
      : pool;

  return allowed
    .map((item) => {
      const matchedTerms = terms.filter((term) => scoreTerm(item, term) > 0);

      // Every term must contribute; a single incidental word is not a match.
      if (matchedTerms.length === 0) return { item, score: 0, matchedTerms };

      let score = matchedTerms.reduce(
        (sum, term) => sum + scoreTerm(item, term),
        0
      );

      // Reward breadth: an object hitting more of the query is a better answer
      // than one hitting a single term very strongly.
      score *= matchedTerms.length / terms.length;

      // Exact phrase presence is the strongest possible signal.
      score += scoreObjectForPhrase(item, pursuit.query.trim());

      const distance = item.metadata?.distanceKm;
      if (distance !== undefined) score += Math.max(0, 2 - distance / 2);

      return { item, score, matchedTerms };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// "watch the green grant" is a standing instruction, not a one-off lookup.
const queryImpliesWatch = (query: string): boolean =>
  /\b(watch|monitor|track|keep an eye|notify|alert)\b/i.test(query);

const createPursuit = (query: string, now: string): Pursuit => ({
  id: `pur_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  query: query.trim(),
  status: 'active',
  createdAt: now,
  lastUpdatedAt: now,
  sourceTypes: [],
  matchedObjectIds: [],
  watchChanges: queryImpliesWatch(query)
});

// ----------------------------------------------------------------------------
// Capture: the same parser, pointed at something the user pasted in. Forwarding
// is the easiest way into Brief, so it must go through exactly the same rules
// as an ingested message -- no privileged path, no extra trust.
// ----------------------------------------------------------------------------
const URL_RE = /https?:\/\/[^\s<>"]+/i;

const buildCaptureMessage = (raw: string, now: string): InboundMessage => {
  const text = raw.trim();
  const url = text.match(URL_RE);

  return {
    id: `cap_${Date.now()}`,
    channel: 'manual',
    sourceId: 'src_manual_capture',
    sourceLabel: 'Captured by you',
    // A bare URL has no text to parse. We keep it verbatim rather than
    // inventing a description of a page Brief has never fetched.
    text,
    receivedAt: now,
    sourceUrl: url ? url[0] : undefined
  };
};

// ----------------------------------------------------------------------------
// Watch conditions: which changes actually matter to this user, for this thing.
// The matching logic is real; the background loop that would call it is not
// built, so nothing here claims to be monitoring anything.
// ----------------------------------------------------------------------------
export type WatchCondition =
  | 'new_match'
  | 'price'
  | 'deadline'
  | 'location'
  | 'availability'
  | 'time';

export const WATCH_CONDITION_LABELS: Record<WatchCondition, string> = {
  new_match: 'New matching information',
  price: 'Price changes',
  deadline: 'Deadline changes',
  location: 'Location changes',
  availability: 'Availability changes',
  time: 'Event time changes'
};

// Maps a detected field change onto the condition a user would have asked for.
const CHANGE_FIELD_TO_CONDITION: Record<string, WatchCondition> = {
  price: 'price',
  deadline: 'deadline',
  locationName: 'location',
  statusBadge: 'availability',
  operatingHours: 'time',
  capacity: 'availability',
  contactPhone: 'availability',
  title: 'new_match',
  summary: 'new_match'
};

// Given two versions of an object and the conditions a user cares about,
// return only the changes they asked to hear about.
const filterChangesByConditions = (
  changes: ObjectChange[],
  conditions: WatchCondition[]
): ObjectChange[] => {
  if (conditions.length === 0) return [];
  return changes.filter((change) => {
    const mapped = CHANGE_FIELD_TO_CONDITION[change.field];
    return mapped !== undefined && conditions.includes(mapped);
  });
};

// ----------------------------------------------------------------------------
// Why this appeared (prompt 7). Reasons are computed from actual state, so a
// reason can never be shown unless it is literally true.
// ----------------------------------------------------------------------------
export interface AppearanceReason {
  key: string;
  label: string;
}

const getAppearanceReasons = (
  object: BriefObject,
  context: {
    pursuits: Pursuit[];
    pursuitResults: Record<string, PursuitMatch[]>;
    savedIds: Set<string>;
    watchedIds: Set<string>;
    relatedToSavedIds: Set<string>;
  }
): AppearanceReason[] => {
  const reasons: AppearanceReason[] = [];

  for (const pursuit of context.pursuits) {
    const hit = (context.pursuitResults[pursuit.id] ?? []).some(
      (m) => m.item.id === object.id
    );
    if (hit) {
      reasons.push({
        key: `pursuit_${pursuit.id}`,
        label: `Matches your pursuit: ${pursuit.query}`
      });
    }
  }

  if (context.savedIds.has(object.id)) {
    reasons.push({ key: 'saved', label: 'You saved this' });
  }

  if (context.watchedIds.has(object.id)) {
    reasons.push({ key: 'watched', label: 'You are watching this' });
  }

  if (context.relatedToSavedIds.has(object.id)) {
    reasons.push({ key: 'related', label: 'Related to something you saved' });
  }

  if (object.sourceType === 'manual') {
    reasons.push({ key: 'captured', label: 'You captured this yourself' });
  } else if (object.sourceType) {
    reasons.push({ key: 'source', label: 'Arrived from a connected source' });
  }

  if (object.metadata?.distanceKm !== undefined) {
    reasons.push({
      key: 'nearby',
      label: `Near you (${getDistanceLabel(object)})`
    });
  }

  return reasons;
};

// ----------------------------------------------------------------------------
// Daily Brief (prompt 6). Strictly derived from what the user already cares
// about. No generic news, no filler, no commentary. Empty sections are dropped
// entirely rather than padded.
// ----------------------------------------------------------------------------
export interface DailyBriefSection {
  key: 'new' | 'changed' | 'today' | 'open';
  title: string;
  objects: BriefObject[];
  pursuits: Pursuit[];
  note?: string;
}

// "Today" means the object itself says it is time-sensitive, using words the
// data actually contains. Nothing is inferred from the clock.
const TIME_SENSITIVE_RE = /\b(today|tonight|now|closing|last day|upcoming|deadline)\b/i;

const isTimeSensitive = (object: BriefObject): boolean => {
  const status = object.metadata?.statusBadge ?? '';
  const deadline = object.metadata?.deadline ?? '';
  return (
    TIME_SENSITIVE_RE.test(status) ||
    deadline !== '' ||
    TIME_SENSITIVE_RE.test(object.metadata?.operatingHours ?? '')
  );
};

const buildDailyBrief = (input: {
  objects: BriefObject[];
  pursuits: Pursuit[];
  pursuitResults: Record<string, PursuitMatch[]>;
  savedIds: Set<string>;
  watchedIds: Set<string>;
  seenIds: Set<string>;
}): DailyBriefSection[] => {
  const activePursuits = input.pursuits.filter((p) => p.status === 'active');

  // NEW: pursuit matches the user has not opened yet.
  const newMatches: BriefObject[] = [];
  const newIds = new Set<string>();
  for (const pursuit of activePursuits) {
    for (const match of input.pursuitResults[pursuit.id] ?? []) {
      if (!input.seenIds.has(match.item.id) && !newIds.has(match.item.id)) {
        newIds.add(match.item.id);
        newMatches.push(match.item);
      }
    }
  }

  // CHANGED: watched or saved objects that have been re-ingested since the
  // user last looked. Requires a genuine ingestedAt stamp -- no guessing.
  const changed = input.objects.filter(
    (o) =>
      (input.watchedIds.has(o.id) || input.savedIds.has(o.id)) &&
      o.ingestedAt !== undefined
  );

  // TODAY: things the user cares about that say they are time-sensitive.
  const today = input.objects.filter(
    (o) =>
      (input.savedIds.has(o.id) || input.watchedIds.has(o.id) || newIds.has(o.id)) &&
      isTimeSensitive(o)
  );

  const stillOpen = activePursuits.filter(
    (p) => (input.pursuitResults[p.id] ?? []).length === 0
  );

  const sections: DailyBriefSection[] = [
    { key: 'new', title: 'New', objects: newMatches, pursuits: [] },
    { key: 'changed', title: 'Changed', objects: changed, pursuits: [] },
    { key: 'today', title: 'Today', objects: today, pursuits: [] },
    { key: 'open', title: 'Still open', objects: [], pursuits: stillOpen }
  ];

  return sections.filter(
    (section) => section.objects.length > 0 || section.pursuits.length > 0
  );
};

// ============================================================================
// GROUP UTILITY LAYER
// ----------------------------------------------------------------------------
// Brief does not arrive in a group asking for its customers. It arrives making
// the group's own conversation more useful: findable, remembered, and honest
// about where every fact came from.
//
// A critical distinction from the ingestion boundary: parseInboundMessage asks
// "should this become an object?" and deliberately rejects questions as
// conversation. That is right for the object graph and WRONG here. In a group,
// an unanswered question is the single most valuable thing on the wall --
// groups are terrible at preserving them. So classification is a separate job
// with its own rules, and it keeps things the object parser throws away.
// ============================================================================

export type MessageClass =
  | 'job'
  | 'event'
  | 'business'
  | 'product'
  | 'service'
  | 'place'
  | 'opportunity'
  | 'question'
  | 'resource'
  | 'chatter';

export const MESSAGE_CLASS_LABELS: Record<MessageClass, string> = {
  job: 'Jobs',
  event: 'Events',
  business: 'Businesses',
  product: 'Products',
  service: 'Services',
  place: 'Places',
  opportunity: 'Opportunities',
  question: 'Questions',
  resource: 'Useful information',
  chatter: 'Conversation'
};

export interface GroupMessage {
  id: string;
  groupId: string;
  // Display name only, and only where the group permits it. Never a phone
  // number, never an internal account id.
  authorLabel?: string;
  text: string;
  sentAt: string;
  // Set when the platform tells us this is a reply. Used to decide whether a
  // question was ever answered -- inferred, never assumed.
  replyToId?: string;
  url?: string;
}

export interface BriefGroup {
  id: string;
  name: string;
  platform: 'telegram' | 'whatsapp';
  // Whether the group has allowed author names to be retained.
  retainAuthors: boolean;
  memberCountLabel?: string;
}

// An entry in the group's knowledge index. It is a POINTER to a message, not a
// replacement for it: the original text is always carried alongside Brief's
// interpretation so a member can check the machine's work.
export interface GroupKnowledgeEntry {
  id: string;
  groupId: string;
  messageId: string;
  originalText: string;
  authorLabel?: string;
  sentAt: string;
  url?: string;
  messageClass: MessageClass;
  // Why the classifier chose this class -- the literal words it matched.
  evidence: string;
  confidence: number;
  entities: ExtractedField[];
  // Populated only when a member publishes the entry into the object graph.
  linkedObjectId?: string;
  // Questions only. The ids AND the resolved replies -- a question without its
  // answer is exactly the archaeology Brief exists to prevent.
  answeredByMessageIds: string[];
  answers: { messageId: string; text: string; authorLabel?: string }[];
}

// --- Classification ---------------------------------------------------------
// Question detection runs FIRST and wins. A message asking for something is a
// question even when it also mentions a product, because the useful record is
// "someone needs this", not "someone is selling this".
const QUESTION_RE =
  /\?\s*$|\?\s|^\s*(?:anyone|does anyone|any one|who|where|how|what|when|which|is there|are there|can (?:i|anyone|someone)|looking for|need|nataka|naomba|kuna)\b/i;

// Asking for a recommendation is still a question even without a question mark.
const REQUEST_RE =
  /\b(?:anyone (?:know|selling|got|have)|looking for|in need of|recommend|suggestions?|help me find|where can i)\b/i;

const CLASS_SIGNALS: { cls: MessageClass; words: RegExp }[] = [
  { cls: 'job', words: /\b(vacancy|vacancies|hiring|job|position|recruit|cv|applicants?|apply now|internship)\b/i },
  { cls: 'opportunity', words: /\b(grant|scholarship|funding|tender|bursary|call for|application(?:s)? open|deadline)\b/i },
  { cls: 'event', words: /\b(event|forum|summit|meetup|workshop|festival|market day|auction|training|webinar|kesho|this saturday|this sunday)\b/i },
  { cls: 'service', words: /\b(service|repair|installation|fundi|plumber|electrician|mechanic|cleaning|delivery|booking)\b/i },
  { cls: 'product', words: /\b(for sale|selling|on sale|in stock|brand new|second hand|pieces|units|kilo|bei)\b/i },
  { cls: 'place', words: /\b(shop|stall|market|centre|center|hub|premises|branch|located at|opposite)\b/i },
  { cls: 'business', words: /\b(supplier|vendor|company|enterprise|ltd|limited|dealer|distributor|wholesaler)\b/i },
  { cls: 'resource', words: /\b(guide|how to|steps|requirements|link|website|document|form|notice|announcement)\b/i }
];

export interface Classification {
  messageClass: MessageClass;
  evidence: string;
  confidence: number;
}

const classifyGroupMessage = (text: string): Classification => {
  const trimmed = text.trim();

  // Questions win. In a group this is the record worth keeping.
  const questionHit = trimmed.match(QUESTION_RE) ?? trimmed.match(REQUEST_RE);
  if (questionHit) {
    return {
      messageClass: 'question',
      evidence: questionHit[0].trim().slice(0, 40),
      // A question mark is unambiguous; a phrasing match is weaker.
      confidence: trimmed.endsWith('?') ? 0.9 : 0.7
    };
  }

  for (const signal of CLASS_SIGNALS) {
    const hit = trimmed.match(signal.words);
    if (hit) {
      return {
        messageClass: signal.cls,
        evidence: hit[0].trim(),
        confidence: 0.75
      };
    }
  }

  return { messageClass: 'chatter', evidence: '', confidence: 0.2 };
};

// --- Building the index ------------------------------------------------------
// Entity extraction reuses the ingestion parser's field extractors so a price
// means the same thing here as it does there. Chatter is classified but never
// indexed: Brief should not turn every message into a database record.
const extractEntities = (text: string): ExtractedField[] => {
  const out: ExtractedField[] = [];

  const money = text.match(MONEY_RE);
  if (money) {
    const value = cleanMoney(money[1] ?? money[2] ?? '');
    if (value !== null) {
      out.push({ field: 'price', value: String(value), evidence: money[0].trim() });
    }
  }

  const phone = text.match(PHONE_RE);
  if (phone) {
    out.push({ field: 'contact', value: phone[0].trim(), evidence: phone[0].trim() });
  }

  const hours = text.match(HOURS_RE);
  if (hours) {
    out.push({
      field: 'hours',
      value: `${hours[1]}:${hours[2]}-${hours[3]}:${hours[4]}`,
      evidence: hours[0].trim()
    });
  }

  const deadline = text.match(DEADLINE_RE);
  if (deadline) {
    out.push({
      field: 'deadline',
      value: deadline[1].trim().replace(/[,.]$/, ''),
      evidence: deadline[0].trim()
    });
  }

  const location = text.match(LOCATION_RE);
  if (location) {
    out.push({ field: 'location', value: location[1].trim(), evidence: location[0].trim() });
  }

  return out;
};

const buildGroupIndex = (
  messages: GroupMessage[],
  group: BriefGroup
): GroupKnowledgeEntry[] => {
  const entries: GroupKnowledgeEntry[] = [];

  for (const message of messages) {
    const classification = classifyGroupMessage(message.text);

    // Conversation stays conversation. Indexing it would recreate the noise
    // Brief exists to cut through.
    if (classification.messageClass === 'chatter') continue;

    entries.push({
      id: `gke_${message.id}`,
      groupId: group.id,
      messageId: message.id,
      originalText: message.text,
      // Author retention is the group's decision, not Brief's.
      authorLabel: group.retainAuthors ? message.authorLabel : undefined,
      sentAt: message.sentAt,
      url: message.url,
      messageClass: classification.messageClass,
      evidence: classification.evidence,
      confidence: classification.confidence,
      entities: extractEntities(message.text),
      answeredByMessageIds: [],
      answers: []
    });
  }

  // A question counts as answered when a later message replies to it. We only
  // ever infer this from an explicit replyToId -- never from timing or
  // keyword similarity, which would produce confident nonsense.
  for (const entry of entries) {
    if (entry.messageClass !== 'question') continue;
    const replies = messages.filter((m) => m.replyToId === entry.messageId);
    entry.answeredByMessageIds = replies.map((m) => m.id);
    entry.answers = replies.map((m) => ({
      messageId: m.id,
      text: m.text,
      authorLabel: group.retainAuthors ? m.authorLabel : undefined
    }));
  }

  return entries;
};

const getUnansweredQuestions = (
  entries: GroupKnowledgeEntry[]
): GroupKnowledgeEntry[] =>
  entries
    .filter(
      (e) => e.messageClass === 'question' && e.answeredByMessageIds.length === 0
    )
    .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));

// --- Weekly group brief ------------------------------------------------------
// Counts of useful things. Deliberately NOT engagement metrics: no message
// totals per member, no "most active" leaderboard, no streaks.
export interface GroupBriefLine {
  label: string;
  count: number;
  messageClass: MessageClass;
}

export interface WeeklyGroupBrief {
  from: string;
  to: string;
  lines: GroupBriefLine[];
  unanswered: GroupKnowledgeEntry[];
  totalIndexed: number;
}

const WEEK_MS = 7 * 86400000;

const buildWeeklyGroupBrief = (
  entries: GroupKnowledgeEntry[],
  now: Date = new Date()
): WeeklyGroupBrief => {
  const cutoff = now.getTime() - WEEK_MS;
  const recent = entries.filter((e) => new Date(e.sentAt).getTime() >= cutoff);

  const order: MessageClass[] = [
    'opportunity',
    'job',
    'event',
    'business',
    'product',
    'service',
    'place',
    'resource'
  ];

  const lines = order
    .map((cls) => ({
      label: MESSAGE_CLASS_LABELS[cls],
      count: recent.filter((e) => e.messageClass === cls).length,
      messageClass: cls
    }))
    // Empty categories are dropped rather than reported as zero.
    .filter((line) => line.count > 0);

  return {
    from: new Date(cutoff).toISOString().slice(0, 10),
    to: now.toISOString().slice(0, 10),
    lines,
    unanswered: getUnansweredQuestions(recent),
    totalIndexed: recent.length
  };
};

// --- Group commands ----------------------------------------------------------
// Deliberately tiny. The interface is the group everyone already uses.
export type GroupCommandName = 'find' | 'jobs' | 'events' | 'brief' | 'ask' | 'saved';

export interface GroupCommandResult {
  command: GroupCommandName;
  argument: string;
  // Results found inside this group's own messages.
  fromGroup: GroupKnowledgeEntry[];
  // Results from the wider Brief knowledge layer, used ONLY when the group
  // itself could not answer. Always presented separately.
  fromElsewhere: BriefObject[];
  brief?: WeeklyGroupBrief;
  // Plain text shown when nothing was found. Brief says so rather than
  // padding the answer.
  emptyNote?: string;
}

const searchGroupEntries = (
  entries: GroupKnowledgeEntry[],
  phrase: string
): GroupKnowledgeEntry[] => {
  const terms = getPursuitTerms(phrase);
  if (terms.length === 0) return [];

  return entries
    .map((entry) => {
      // Include the answers: someone asking "a 50W solar kit?" and someone
      // replying "Kikao Hardware has 50W systems" is one useful record.
      const haystack = `${entry.originalText} ${entry.answers
        .map((a) => a.text)
        .join(' ')} ${entry.entities.map((e) => e.value).join(' ')}`.toLowerCase();
      const hits = terms.filter((t) => haystack.includes(t));
      return { entry, hits: hits.length };
    })
    .filter(({ hits }) => hits > 0)
    .sort((a, b) => {
      if (b.hits !== a.hits) return b.hits - a.hits;
      return a.entry.sentAt < b.entry.sentAt ? 1 : -1;
    })
    .map(({ entry }) => entry);
};

const runGroupCommand = (
  raw: string,
  context: {
    entries: GroupKnowledgeEntry[];
    objects: BriefObject[];
    savedObjects: BriefObject[];
    now?: Date;
  }
): GroupCommandResult | null => {
  const match = raw.trim().match(/^\/(find|jobs|events|brief|ask|saved)\b\s*(.*)$/i);
  if (!match) return null;

  const command = match[1].toLowerCase() as GroupCommandName;
  const argument = match[2].trim();
  const base: GroupCommandResult = {
    command,
    argument,
    fromGroup: [],
    fromElsewhere: []
  };

  if (command === 'brief') {
    return { ...base, brief: buildWeeklyGroupBrief(context.entries, context.now) };
  }

  if (command === 'jobs' || command === 'events') {
    const cls: MessageClass = command === 'jobs' ? 'job' : 'event';
    const found = context.entries
      .filter((e) => e.messageClass === cls)
      .sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1));
    return {
      ...base,
      fromGroup: found,
      emptyNote: found.length === 0 ? `No ${cls}s posted here yet.` : undefined
    };
  }

  if (command === 'saved') {
    return {
      ...base,
      fromElsewhere: context.savedObjects,
      emptyNote:
        context.savedObjects.length === 0 ? 'You have not saved anything yet.' : undefined
    };
  }

  // /find and /ask: search THIS group first. Only if the group cannot answer
  // do we reach into the wider knowledge layer, and the two are never mixed.
  if (argument === '') {
    return { ...base, emptyNote: `Try ${'/' + command} followed by what you need.` };
  }

  const fromGroup = searchGroupEntries(context.entries, argument);
  if (fromGroup.length > 0) {
    return { ...base, fromGroup };
  }

  const fromElsewhere = matchPursuit(
    {
      id: 'tmp',
      query: argument,
      status: 'active',
      createdAt: '',
      lastUpdatedAt: '',
      sourceTypes: [],
      matchedObjectIds: [],
      watchChanges: false
    },
    context.objects,
    4
  ).map((m) => m.item);

  return {
    ...base,
    fromElsewhere,
    emptyNote:
      fromElsewhere.length === 0
        ? 'Nothing in this group, and nothing elsewhere in Brief yet.'
        : undefined
  };
};

// --- Business utility mode ---------------------------------------------------
// A business connected to Brief maintains the answers it is already typing out
// by hand twenty times a week. This is an answering aid, not an advert: there
// is no promotional copy field, and nothing here is pushed at anyone.
export interface BusinessProfile {
  id: string;
  // Ties the profile to an identity object already in the graph when one
  // exists. Absent for a business Brief only knows from a group.
  objectId?: string;
  name: string;
  hours?: string;
  location?: string;
  contact?: string;
  services: string[];
  // Question-and-answer pairs the business has confirmed. Brief answers ONLY
  // with these words -- it never composes a reply on the business's behalf.
  faqs: { question: string; answer: string }[];
  lastConfirmedAt?: string;
}

const INITIAL_BUSINESS_PROFILES: BusinessProfile[] = [
  {
    id: 'biz_kikao',
    objectId: 'id_kikao_hardware',
    name: 'Kikao Hardware',
    location: 'Kilimani Hardware Lab',
    services: ['Solar lighting packs', 'Installation support'],
    faqs: [
      {
        question: 'Do you install?',
        answer: 'Yes. Installation support is offered for solar lighting packs.'
      }
    ],
    lastConfirmedAt: '2026-08-04T11:00:00Z'
  }
];

const INITIAL_GROUP: BriefGroup = {
  id: 'grp_kilimani_traders',
  name: 'Kilimani Traders',
  platform: 'whatsapp',
  retainAuthors: true,
  memberCountLabel: '312 members'
};

// A week of ordinary group traffic: useful posts, questions, and noise.
const GROUP_MESSAGES: GroupMessage[] = [
  {
    id: 'gm_01',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Wanjiru',
    text: 'Where can I renew my business permit?',
    sentAt: '2026-08-11T07:15:00Z'
  },
  {
    id: 'gm_02',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Otieno',
    text: 'Selling 3 goats, 18000 each, Kisumu. Call 0712345678',
    sentAt: '2026-08-11T09:40:00Z'
  },
  {
    id: 'gm_03',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Achieng',
    text: 'Anyone selling a 50W solar kit?',
    sentAt: '2026-08-12T06:05:00Z'
  },
  {
    id: 'gm_04',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Mwangi',
    text: 'Kikao Hardware has 50W systems, they are at Kilimani Hardware Lab',
    sentAt: '2026-08-12T06:22:00Z',
    replyToId: 'gm_03'
  },
  {
    id: 'gm_05',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Njeri',
    text: 'Vacancy: accounts assistant needed at a logistics firm. Deadline: 30 September. Send CV to the office.',
    sentAt: '2026-08-12T11:00:00Z'
  },
  {
    id: 'gm_06',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Kamau',
    text: 'Who knows a plumber around Kilimani?',
    sentAt: '2026-08-13T08:30:00Z'
  },
  {
    id: 'gm_07',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Otieno',
    text: 'Youth tech forum this Saturday at Jeevanjee Gardens, starts 09:00',
    sentAt: '2026-08-13T13:12:00Z'
  },
  {
    id: 'gm_08',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Achieng',
    text: 'Green Commerce Micro-Grant applications are open, deadline: 31 August',
    sentAt: '2026-08-14T07:45:00Z'
  },
  { id: 'gm_09', groupId: 'grp_kilimani_traders', authorLabel: 'Kamau', text: 'Good morning all', sentAt: '2026-08-14T07:50:00Z' },
  { id: 'gm_10', groupId: 'grp_kilimani_traders', authorLabel: 'Njeri', text: 'haha true', sentAt: '2026-08-14T07:52:00Z' },
  {
    id: 'gm_11',
    groupId: 'grp_kilimani_traders',
    authorLabel: 'Mwangi',
    text: 'Guide on the single business permit steps and requirements is on the county website',
    sentAt: '2026-08-14T10:20:00Z'
  }
];

// ============================================================================
// SOURCES
// ----------------------------------------------------------------------------
// A source is where information arrives from -- a Telegram group, a WhatsApp
// community, a site. It is deliberately NOT a BriefObject: the channel is the
// river, and Brief extracts the useful fish. Conflating the two would make
// "the group" a thing users discover, which it is not.
// ============================================================================

export type SourceType = 'telegram' | 'whatsapp' | 'web' | 'rss' | 'api' | 'manual';

export type SourceHealth = 'healthy' | 'quiet' | 'error' | 'inactive';

export interface Source {
  id: string;
  name: string;
  type: SourceType;
  url?: string;
  description?: string;
  active: boolean;
  lastSeenAt?: string;
  lastSuccessfulIngestionAt?: string;
  ingestionCount: number;
  errorCount: number;
  // Operator-facing only. Never rendered to ordinary users.
  lastErrorDetail?: string;
}

const QUIET_AFTER_HOURS = 48;

// Health is derived, never stored, so it cannot drift out of date.
const getSourceHealth = (source: Source, now: Date = new Date()): SourceHealth => {
  if (!source.active) return 'inactive';

  // A source that has errored more recently than it has succeeded is broken,
  // regardless of how healthy its history looks.
  if (source.errorCount > 0) {
    const lastOk = source.lastSuccessfulIngestionAt
      ? new Date(source.lastSuccessfulIngestionAt).getTime()
      : 0;
    const lastSeen = source.lastSeenAt ? new Date(source.lastSeenAt).getTime() : 0;
    if (lastSeen > lastOk) return 'error';
  }

  if (!source.lastSuccessfulIngestionAt) return 'quiet';

  const hours =
    (now.getTime() - new Date(source.lastSuccessfulIngestionAt).getTime()) / 3600000;

  return hours > QUIET_AFTER_HOURS ? 'quiet' : 'healthy';
};

// Plain-language health, safe to show anyone. Technical detail stays in
// lastErrorDetail and is only surfaced in the operator view.
const getSourceHealthLabel = (health: SourceHealth): string => {
  switch (health) {
    case 'healthy':
      return 'Receiving information normally';
    case 'quiet':
      return 'No recent information';
    case 'error':
      return 'Not receiving information';
    case 'inactive':
      return 'Paused';
  }
};

const INITIAL_SOURCES: Source[] = [
  {
    id: 'tg_nairobi_traders',
    name: 'Nairobi Traders',
    type: 'telegram',
    description: 'Trader announcements, stock and service adverts.',
    active: true,
    lastSeenAt: '2026-08-14T11:02:00Z',
    lastSuccessfulIngestionAt: '2026-08-14T11:02:00Z',
    ingestionCount: 3,
    errorCount: 0
  },
  {
    id: 'wa_kilimani_notices',
    name: 'Kilimani Notices',
    type: 'whatsapp',
    description: 'Neighbourhood notices, grants and civic updates.',
    active: true,
    lastSeenAt: '2026-08-14T09:05:00Z',
    lastSuccessfulIngestionAt: '2026-08-14T09:05:00Z',
    ingestionCount: 1,
    errorCount: 0
  },
  {
    id: 'src_manual_capture',
    name: 'Captured by you',
    type: 'manual',
    description: 'Anything you paste or forward into Brief yourself.',
    active: true,
    ingestionCount: 0,
    errorCount: 0
  }
];

// ============================================================================
// INGESTION BOUNDARY
// ----------------------------------------------------------------------------
// The rule this layer exists to enforce: a message does NOT become a post.
//
// A raw inbound message is parsed into a *candidate* object, stamped with where
// it came from and when, checked against what Brief already knows, and then
// held for review. Nothing enters the object graph automatically. Everything
// below is pure -- no network, no timers, no side effects -- so the parsing
// rules can be tested without a pipeline attached.
//
// The parser's job is to extract what is literally present in the text. When a
// field is not stated, it stays undefined. A low-confidence candidate is a
// correct outcome, not a failure to be papered over with guesses.
// ============================================================================

export interface InboundMessage {
  id: string;
  channel: SourceType;
  // Which feed/group/page it arrived from. Becomes sourceId on the object.
  sourceId: string;
  sourceLabel: string;
  text: string;
  receivedAt: string;
  sourceUrl?: string;
  media?: InboundMedia[];
}

// An image is retained as evidence, never as a source of claims. Brief does no
// image recognition, so nothing is ever read out of a flyer or price list --
// the reference is kept so a later processor can attach real extractions.
export interface InboundMedia {
  kind: 'image' | 'document' | 'audio' | 'video';
  reference: string;
  caption?: string;
}

export type ImageAnalysisStatus = 'pending' | 'processed' | 'unavailable';

export interface CandidateMedia extends InboundMedia {
  sourceId: string;
  sourceMessageId: string;
  receivedAt: string;
  imageAnalysisStatus: ImageAnalysisStatus;
}

// Review lifecycle for anything Brief did not author. 'candidate' is the only
// state ingestion may produce; a human moves it from there.
export type ReviewState = 'candidate' | 'confirmed' | 'rejected';

export type CandidateStatus = 'pending' | 'accepted' | 'rejected';

export interface ExtractedField {
  field: string;
  value: string;
  // The exact substring the value came from, so a reviewer can audit the
  // parser instead of trusting it.
  evidence: string;
}

export interface IngestionCandidate {
  id: string;
  message: InboundMessage;
  draft: BriefObject;
  extracted: ExtractedField[];
  // 0..1, derived only from how much was actually extracted.
  confidence: number;
  typeConfident: boolean;
  duplicates: DuplicateCandidate[];
  suggestedLinks: { objectId: string; relation: string; why: string }[];
  status: CandidateStatus;
  reviewState: ReviewState;
  media: CandidateMedia[];
  // Some messages are just conversation. When this is false there is nothing
  // to review and nothing to publish -- Brief must not manufacture a record.
  isObjectWorthy: boolean;
  rejectionReason?: string;
  warnings: string[];
}

// --- Field extractors --------------------------------------------------------
// Each returns null when the field is not clearly present. None of them fall
// back to a default; a missing field must stay missing.

const MONEY_RE = /(?:ksh|kes|sh)\s*\.?\s*([0-9][0-9,\.]*)\s*(?:\/=|\/-)?|([0-9][0-9,]{2,})\s*(?:\/=|\/-)/i;
const PHONE_RE = /(?:\+254|0)7[0-9]{8}\b|\+254\s?7[0-9]{2}\s?[0-9]{3}\s?[0-9]{3}/;
const HOURS_RE = /\b([01]?[0-9]|2[0-3]):([0-5][0-9])\s*(?:-|to|until|till)\s*([01]?[0-9]|2[0-3]):([0-5][0-9])\b/i;
const DEADLINE_RE = /\b(?:deadline|closes|closing|apply by|last day|ends)\b[:\s]*([A-Za-z0-9 ,]{3,24})/i;
const LOCATION_RE = /\b(?:at|located at|location|venue|along|opposite|near)\b[:\s]+([A-Z][A-Za-z0-9'\-]*(?:\s+[A-Z][A-Za-z0-9'\-]*){0,4})/;

// Chatter markers: questions, greetings, replies. Presence alone is not
// disqualifying -- a real advert can contain a question -- so this is only
// decisive when the message also carries no concrete detail at all.
const CONVERSATION_RE = /^(?:\s*(?:hi|hey|hello|habari|sasa|niaje|thanks|asante|ok|okay|yes|no|lol|haha)\b|.*\?\s*$)/i;

const cleanMoney = (raw: string): number | null => {
  const n = Number(raw.replace(/[,\s]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Type inference from explicit vocabulary only. Each rule needs a word that
// genuinely signals the category; ambiguity returns null rather than 'place'.
const TYPE_SIGNALS: { type: ObjectType; words: RegExp; label: string }[] = [
  { type: 'opportunity', words: /\b(grant|scholarship|apply|application|funding|vacancy|hiring|job|tender|bursary)\b/i, label: 'application language' },
  { type: 'experience', words: /\b(event|forum|summit|meetup|workshop|festival|market day|auction|training|webinar)\b/i, label: 'event language' },
  { type: 'service', words: /\b(service|repair|installation|booking|book a|consultation|inspection|delivery|plumber|fundi)\b/i, label: 'service language' },
  { type: 'product', words: /\b(for sale|selling|stock|in stock|price|buy|brand new|second hand|pieces|units)\b/i, label: 'sale language' },
  { type: 'knowledge', words: /\b(guide|how to|steps|requirements|explainer|notice|announcement)\b/i, label: 'informational language' },
  { type: 'place', words: /\b(shop|stall|market|centre|center|hub|office|premises|located at|branch)\b/i, label: 'premises language' }
];

const inferType = (text: string): { type: ObjectType; why: string } | null => {
  for (const signal of TYPE_SIGNALS) {
    const hit = text.match(signal.words);
    if (hit) return { type: signal.type, why: `${signal.label} ("${hit[0]}")` };
  }
  return null;
};

// A title is the first meaningful line, trimmed. We never synthesise one from
// keywords -- if there is no usable line the candidate is flagged instead.
const extractTitle = (text: string): string | null => {
  const line = text
    .split(/\n|(?<=[.!])\s+/)
    .map((l) => l.trim())
    .find((l) => l.length >= 8 && l.length <= 90 && /[a-z]/i.test(l));
  if (!line) return null;
  return line.replace(/^[^A-Za-z0-9]+/, '').slice(0, 80);
};

const parseInboundMessage = (
  message: InboundMessage,
  existing: BriefObject[]
): IngestionCandidate => {
  const text = message.text;
  const extracted: ExtractedField[] = [];
  const warnings: string[] = [];
  const metadata: BriefObject['metadata'] = {};

  const title = extractTitle(text);
  if (title) {
    extracted.push({ field: 'title', value: title, evidence: title });
  } else {
    warnings.push('No usable title line found.');
  }

  const typed = inferType(text);
  if (!typed) {
    warnings.push('Object type could not be determined from the text.');
  }

  const money = text.match(MONEY_RE);
  if (money) {
    const value = cleanMoney(money[1] ?? money[2] ?? '');
    if (value !== null) {
      metadata.price = value;
      metadata.currency = 'KES';
      extracted.push({ field: 'price', value: String(value), evidence: money[0].trim() });
    }
  }

  const phone = text.match(PHONE_RE);
  if (phone) {
    metadata.contactPhone = phone[0].trim();
    extracted.push({ field: 'contactPhone', value: phone[0].trim(), evidence: phone[0].trim() });
  }

  const hours = text.match(HOURS_RE);
  if (hours) {
    const value = `${hours[1]}:${hours[2]}-${hours[3]}:${hours[4]}`;
    metadata.operatingHours = value;
    extracted.push({ field: 'operatingHours', value, evidence: hours[0].trim() });
  }

  const deadline = text.match(DEADLINE_RE);
  if (deadline) {
    const value = deadline[1].trim().replace(/[,.]$/, '');
    metadata.deadline = value;
    extracted.push({ field: 'deadline', value, evidence: deadline[0].trim() });
  }

  const location = text.match(LOCATION_RE);
  const locationName = location ? location[1].trim() : undefined;
  if (locationName) {
    extracted.push({ field: 'locationName', value: locationName, evidence: location![0].trim() });
  }

  // Confidence is a description of the evidence, not a marketing number.
  // Type and title are the load-bearing fields; details add smaller increments.
  let confidence = 0;
  if (title) confidence += 0.35;
  if (typed) confidence += 0.35;
  if (locationName) confidence += 0.1;
  if (metadata.contactPhone) confidence += 0.08;
  if (metadata.price !== undefined) confidence += 0.06;
  if (metadata.operatingHours || metadata.deadline) confidence += 0.06;
  confidence = Math.min(1, Number(confidence.toFixed(2)));

  const draft: BriefObject = {
    id: `ing_${message.id}`,
    type: typed?.type ?? 'knowledge',
    title: title ?? '(untitled inbound message)',
    category: 'Unreviewed',
    summary: text.replace(/\s+/g, ' ').trim().slice(0, 160),
    locationName,
    // No creatorName: the sender of a message is not automatically the
    // business it describes. A reviewer supplies that, or nobody does.
    // No trustScore and isVerified:false -- nothing here has been verified.
    isVerified: false,
    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    sourceType: message.channel,
    sourceId: message.sourceId,
    sourceMessageId: message.id,
    sourceUrl: message.sourceUrl,
    ingestedAt: message.receivedAt,
    // lastVerifiedAt is deliberately absent: ingestion is not verification.
    createdAt: message.receivedAt
  };

  // Connect to what Brief already knows -- by explicit evidence only.
  const suggestedLinks: IngestionCandidate['suggestedLinks'] = [];
  const haystack = text.toLowerCase();

  for (const item of existing) {
    if (item.title && haystack.includes(item.title.toLowerCase())) {
      suggestedLinks.push({
        objectId: item.id,
        relation: item.type === 'place' ? 'locationObjectId' : 'relatedObjectIds',
        why: `Message names "${item.title}"`
      });
      continue;
    }
    if (
      locationName &&
      item.type === 'place' &&
      item.title.toLowerCase().includes(locationName.toLowerCase())
    ) {
      suggestedLinks.push({
        objectId: item.id,
        relation: 'locationObjectId',
        why: `Stated location matches "${item.title}"`
      });
    }
  }

  const duplicates = findPotentialDuplicates(draft, existing, 0.7);
  if (duplicates.length > 0) {
    warnings.push(`Possible duplicate of ${duplicates.length} existing record(s).`);
  }

  // --- Is this even an object? ---------------------------------------------
  // The single most important rule in the pipeline: most messages in a group
  // are conversation, and conversation must not become database records.
  // A message earns an object only by carrying a title, a determinable type,
  // and at least one concrete detail.
  const concreteDetails = extracted.filter((f) => f.field !== 'title').length;
  const conversational = CONVERSATION_RE.test(text.trim());
  const tooShort = text.trim().length < 25;

  let rejectionReason: string | undefined;
  if (!title) {
    rejectionReason = 'No usable title line.';
  } else if (!typed) {
    rejectionReason = 'No recognisable object type in the text.';
  } else if (tooShort) {
    rejectionReason = 'Too short to describe anything.';
  } else if (conversational && concreteDetails === 0) {
    rejectionReason = 'Reads as conversation, not an announcement.';
  }

  const isObjectWorthy = rejectionReason === undefined;

  const media: CandidateMedia[] = (message.media ?? []).map((m) => ({
    ...m,
    sourceId: message.sourceId,
    sourceMessageId: message.id,
    receivedAt: message.receivedAt,
    // Brief does not read images. The reference is preserved so a future
    // processor can attach real extractions; until then nothing is claimed.
    imageAnalysisStatus: 'pending' as ImageAnalysisStatus
  }));

  return {
    id: `cand_${message.id}`,
    message,
    draft,
    extracted,
    confidence,
    typeConfident: Boolean(typed),
    duplicates,
    suggestedLinks,
    status: 'pending',
    reviewState: 'candidate',
    media,
    isObjectWorthy,
    rejectionReason,
    warnings
  };
};

// ============================================================================
// 2. SEED DATA
// ============================================================================
// Demo inbound traffic. These stand in for a real Telegram/WhatsApp bridge so
// the review flow can be exercised end to end. They are messages, not objects:
// nothing here is in the graph until a human accepts it.
const INBOUND_FIXTURES: InboundMessage[] = [
  {
    id: 'msg_001',
    channel: 'telegram',
    sourceId: 'tg_nairobi_traders',
    sourceLabel: 'Nairobi Traders (Telegram)',
    text: 'Solar installation and repair service. We mount panels and wire battery boxes for stalls. Charges from KSh 4,500 per site. Call 0712345678. Open 08:00-17:00 Mon to Sat.',
    receivedAt: '2026-08-14T07:20:00Z'
  },
  {
    id: 'msg_002',
    channel: 'whatsapp',
    sourceId: 'wa_kilimani_notices',
    sourceLabel: 'Kilimani Notices (WhatsApp)',
    text: 'Youth enterprise grant applications now open. Non-equity funding for small traders. Deadline: 30 September. Requirements and steps will be shared here.',
    receivedAt: '2026-08-14T09:05:00Z'
  },
  {
    id: 'msg_003',
    channel: 'telegram',
    sourceId: 'tg_nairobi_traders',
    sourceLabel: 'Nairobi Traders (Telegram)',
    // Deliberately near-duplicate of an existing seed object, to prove the
    // duplicate check fires before anything is published.
    text: 'Maji Mazuri Farmers & Artisans Market is open today. Fresh produce and handcrafts at Haile Selassie Ave. Open 06:00-18:30.',
    receivedAt: '2026-08-14T10:40:00Z'
  },
  {
    id: 'msg_004',
    channel: 'telegram',
    sourceId: 'tg_nairobi_traders',
    sourceLabel: 'Nairobi Traders (Telegram)',
    // Deliberately unparseable chatter: proves low confidence is surfaced
    // rather than smoothed over into a plausible-looking object.
    text: 'Anyone around? asking for a friend',
    receivedAt: '2026-08-14T11:02:00Z'
  }
];

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
    // Pattern 3 (place -> vendors -> events) had no event edge. This is the
    // market's own recurring trading day, hosted by the board that already
    // operates the market and located at the market object itself. No new
    // vendor, no invented organiser: creatorName matches plc_maji_mazuri.
    id: 'exp_maji_market_day',
    type: 'experience',
    title: 'Maji Mazuri Saturday Market Day',
    category: 'Event',
    summary: 'Weekly extended trading day for produce and artisan vendors.',
    locationName: 'Haile Selassie Ave, CBD',
    creatorName: 'City County Markets Board',
    trustScore: 96,
    lastVerifiedAt: '2026-08-05T10:00:00Z',
    validityWindowDays: 90,
    isVerified: true,
    metadata: {
      operatingHours: 'Saturdays, 06:00-18:30',
      statusBadge: 'Upcoming',
      distanceKm: 0.4
    },
    actionLabel: 'Get Directions',
    actionType: 'map',
    locationObjectId: 'plc_maji_mazuri',
    parentObjectId: 'plc_maji_mazuri',
    createdAt: '2026-08-01T08:00:00Z'
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
    locationObjectId: 'plc_maji_mazuri',
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
    locationObjectId: 'plc_jeevanjee',
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
    providerObjectId: 'id_county_licensing',
    relatedObjectIds: ['srv_health_inspection', 'opp_green_grant'],
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
    locationObjectId: 'plc_kilimani_hub',
    providerObjectId: 'id_kikao_hardware',
    relatedObjectIds: ['srv_solar_install'],
    createdAt: '2026-05-10T08:00:00Z'
  },
  {
    // The seller behind prd_solar_kit. Everything here is either copied from
    // the product record that already named this business, or omitted.
    // No phone, price, rating, review count, image or opening hours is
    // invented: those fields are simply absent until a real source supplies
    // them, and every consumer already guards for that.
    id: 'id_kikao_hardware',
    type: 'identity',
    title: 'Kikao Hardware',
    category: 'Hardware Supplier',
    summary: 'Solar and electrical hardware supplier stocking vendor power kits.',
    locationName: 'Kilimani Hardware Lab',
    // Matches prd_solar_kit.creatorName exactly -- reusing the string already
    // in the data rather than inventing a proprietor.
    creatorName: 'Kikao Hardware',
    // Trust mirrored from prd_solar_kit, the record that attests to this
    // seller. Not a second, independently claimed verification event.
    trustScore: 97,
    lastVerifiedAt: '2026-08-04T11:00:00Z',
    validityWindowDays: 90,
    isVerified: true,
    // No imageUrl: no existing image depicts this business, and the product
    // photo would misrepresent a storefront. The UI already guards on it.
    actionLabel: 'Open Map',
    actionType: 'map',
    locationObjectId: 'plc_kilimani_hub',
    createdAt: '2026-05-10T08:00:00Z'
  },
  {
    // Complementary service for the pack. The object model carries this
    // cleanly: 'service' already exists and srv_health_inspection is the
    // precedent. Price, availability and contact are omitted, not guessed.
    id: 'srv_solar_install',
    type: 'service',
    title: 'Solar Pack Installation Support',
    category: 'Installation',
    summary: 'Mounting, wiring and handover support for stall solar lighting packs.',
    locationName: 'Kilimani Hardware Lab',
    creatorName: 'Kikao Hardware',
    trustScore: 97,
    lastVerifiedAt: '2026-08-04T11:00:00Z',
    validityWindowDays: 90,
    isVerified: true,
    actionLabel: 'Book',
    actionType: 'internal',
    providerObjectId: 'id_kikao_hardware',
    locationObjectId: 'plc_kilimani_hub',
    relatedObjectIds: ['prd_solar_kit'],
    createdAt: '2026-05-12T08:00:00Z'
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
    providerObjectId: 'id_county_licensing',
    relatedObjectIds: ['knw_permit_guide'],
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
    case 'product': return { label: 'Product', icon: <Store className="w-3.5 h-3.5" /> };
    case 'service': return { label: 'Service', icon: <ShieldCheck className="w-3.5 h-3.5" /> };
    case 'knowledge': return { label: 'Knowledge', icon: <Newspaper className="w-3.5 h-3.5" /> };
    case 'community': return { label: 'Community', icon: <Users className="w-3.5 h-3.5" /> };
    case 'document': return { label: 'Document', icon: <Tag className="w-3.5 h-3.5" /> };
    case 'conversation': return { label: 'Conversation', icon: <MessageCircle className="w-3.5 h-3.5" /> };
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

  const [activeTab, setActiveTab] = useState<'stream' | 'tea' | 'companion' | 'journeys' | 'health' | 'inbox' | 'pursuits' | 'today' | 'sources' | 'group'>('stream');
  const [selectedObjectType, setSelectedObjectType] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('Nairobi CBD');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [pursuitDraft, setPursuitDraft] = useState<string>('');
  const [architectMode, setArchitectMode] = useState<boolean>(false);
  // Seen tracking for the Daily Brief: "New" means genuinely not yet opened.
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  const [selectedObjectForDetail, setSelectedObjectForDetailRaw] = useState<BriefObject | null>(null);

  // Opening an object marks it seen, which is what keeps the Daily Brief's
  // "New" section honest instead of showing the same items forever.
  const setSelectedObjectForDetail = (object: BriefObject | null) => {
    setSelectedObjectForDetailRaw(object);
    if (object) {
      setSeenIds((prev) => {
        if (prev.has(object.id)) return prev;
        const next = new Set(prev);
        next.add(object.id);
        return next;
      });
    }
  };
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

  const getRelatedObjects = (object: BriefObject): ScoredRelation[] => {
    const explicit = new Set(
      [
        object.parentObjectId,
        object.providerObjectId,
        object.locationObjectId,
        ...(object.relatedObjectIds ?? [])
      ].filter(Boolean) as string[]
    );

    // Objects that point AT this one are just as meaningful as ones it
    // points to -- a place should surface the vendors located there.
    const inbound = new Set(
      objects
        .filter(
          (item) =>
            item.parentObjectId === object.id ||
            item.providerObjectId === object.id ||
            item.locationObjectId === object.id ||
            (item.relatedObjectIds ?? []).includes(object.id)
        )
        .map((item) => item.id)
    );

    const keywords = getKeywords(object);

    const scored: ScoredRelation[] = objects
      .filter((item) => item.id !== object.id)
      .map((item) => {
        let score = 0;
        let reason: RelationReason = 'similar';

        // 1. Explicit, curated links outrank everything inferred -- and must
        //    do so unconditionally. The inferred signals below (2-8) can sum
        //    to roughly 24, so a flat +20 was not actually a guarantee: a
        //    coincidentally similar object could outrank a real, curated
        //    relationship. EXPLICIT_LINK_FLOOR sits above every reachable
        //    inferred total, so a stated relationship can never be buried by
        //    keyword noise. The smaller per-kind bonus only orders explicit
        //    links against each other.
        if (explicit.has(item.id) || inbound.has(item.id)) {
          const isProvider =
            item.id === object.providerObjectId ||
            item.providerObjectId === object.id;
          const isLocation =
            item.id === object.locationObjectId ||
            item.locationObjectId === object.id;

          score += EXPLICIT_LINK_FLOOR;

          if (isProvider) {
            // Who sells or operates this is the most actionable hop.
            score += 12;
            reason = 'provider';
          } else if (isLocation) {
            score += 8;
            reason = 'location';
          } else {
            score += 4;
            reason = 'linked';
          }
        }

        // 2. Same category.
        if (item.category === object.category) score += 6;

        // 3. Same type.
        if (item.type === object.type) score += 3;

        // 4. Complementary type for this object's errand.
        if (item.type !== object.type && areTypesAffine(object.type, item.type)) {
          score += 2;
          if (reason === 'similar') reason = 'complementary';
        }

        // 5. Shared location text.
        if (item.locationName && object.locationName) {
          const a = item.locationName.toLowerCase();
          const b = object.locationName.toLowerCase();
          if (a.includes(b.split(',')[0]) || b.includes(a.split(',')[0])) {
            score += 4;
            if (reason === 'similar') reason = 'nearby';
          }
        }

        // 6. Same operator / vendor.
        if (
          item.creatorName &&
          object.creatorName &&
          item.creatorName === object.creatorName
        ) {
          score += 4;
          if (reason === 'similar') reason = 'provider';
        }

        // 7. Keyword overlap across title, category and summary.
        const overlap = countKeywordOverlap(keywords, getKeywords(item));
        if (overlap > 0) score += Math.min(overlap, 3);

        // 8. Proximity nudge -- never decisive, only breaks ties.
        const distance = item.metadata?.distanceKm;
        if (distance !== undefined) score += Math.max(0, 2 - distance / 2);

        return { item, score, reason };
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
          score: 0,
          reason: 'nearby' as RelationReason,
          distance: item.metadata?.distanceKm ?? Number.MAX_SAFE_INTEGER
        }))
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 4)
        .map(({ item, score, reason }) => ({ item, score, reason }));
    }

    return scored.slice(0, 4);
  };

  const filteredObjects = useMemo(() => {
    const byType = objects.filter(
      (obj) => selectedObjectType === 'all' || obj.type === selectedObjectType
    );

    const query = searchQuery.trim().toLowerCase();
    if (query === '') return byType;

    // Weighted match: exact title beats title prefix beats category/type,
    // which beat a summary-only hit. Ties fall back to proximity.
    // Uses the same scorer as pursuit matching -- one brain, so a phrase
    // ranks identically whether typed here or saved as a Pursuit.
    return byType
      .map((obj) => ({ obj, score: scoreObjectForPhrase(obj, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const da = a.obj.metadata?.distanceKm ?? Number.MAX_SAFE_INTEGER;
        const db = b.obj.metadata?.distanceKm ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      })
      .map(({ obj }) => obj);
  }, [objects, selectedObjectType, searchQuery]);

  // STEP 4 My Layer: saved objects grouped by type, derived from the existing
  // relationships state. No parallel data structure.
  const savedObjects = useMemo(
    () =>
      objects.filter((obj) =>
        relationships.some(
          (rel) => rel.targetId === obj.id && rel.verb === 'saved'
        )
      ),
    [objects, relationships]
  );

  const savedGroups = useMemo(() => {
    const order: { type: ObjectType; label: string }[] = [
      { type: 'place', label: 'Places' },
      { type: 'service', label: 'Services' },
      { type: 'opportunity', label: 'Opportunities' },
      { type: 'product', label: 'Products' },
      { type: 'experience', label: 'Events' },
      { type: 'knowledge', label: 'Information' },
      { type: 'identity', label: 'Organisations' }
    ];

    return order
      .map(({ type, label }) => ({
        label,
        items: savedObjects.filter((obj) => obj.type === type)
      }))
      .filter(({ items }) => items.length > 0);
  }, [savedObjects]);

  // One graph instance over the live state. Components ask it questions
  // instead of re-deriving relationship rules inline.
  const graph = useMemo(
    () => createBriefGraph(objects, relationships),
    [objects, relationships]
  );

  const watchedIds = useMemo(
    () => new Set(relationships.filter((r) => r.verb === 'watched').map((r) => r.targetId)),
    [relationships]
  );

  // Watch (prompt 21): records intent to monitor. No polling, no fake alerts --
  // diffObjects is the engine this will drive once ingestion supplies a second
  // version of a record.
  const handleToggleWatch = (object: BriefObject) => {
    const isWatching = watchedIds.has(object.id);

    setRelationships((prev) => {
      if (isWatching) {
        return prev.filter(
          (r) => !(r.targetId === object.id && r.verb === 'watched')
        );
      }
      return [
        ...prev,
        {
          id: `rel_watch_${object.id}`,
          sourceType: 'identity' as ObjectType,
          sourceId: 'usr_me',
          verb: 'watched',
          targetType: object.type,
          targetId: object.id,
          state: 'engaged' as FlowState,
          updatedAt: new Date().toISOString()
        }
      ];
    });

    showToast(
      isWatching
        ? `Stopped watching ${object.title}`
        : `Watching ${object.title} for changes`
    );
  };

  // Optional personal label on an existing saved edge (prompt 10).
  const handleSetSaveLabel = (object: BriefObject, label: SaveLabel) => {
    setRelationships((prev) =>
      prev.map((r) =>
        r.targetId === object.id && r.verb === 'saved'
          ? { ...r, label: r.label === label ? undefined : label, updatedAt: new Date().toISOString() }
          : r
      )
    );
  };

  // Share (prompt 11): a plain, honest text payload. Web Share when the
  // browser offers it, clipboard otherwise. No invented links, no marketing.
  const handleShare = async (object: BriefObject) => {
    const action = resolveAction(object);
    const lines = [
      object.title,
      object.category,
      object.locationName ? `Location: ${object.locationName}` : null,
      action.kind !== 'none' ? `Action: ${action.label}` : null,
      object.sourceUrl ? `Source: ${object.sourceUrl}` : null
    ].filter(Boolean) as string[];

    const payload = lines.join('\n');
    const nav = navigator as Navigator & {
      share?: (data: { title: string; text: string }) => Promise<void>;
    };

    try {
      if (typeof nav.share === 'function') {
        await nav.share({ title: object.title, text: payload });
        return;
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
        showToast('Copied to clipboard');
        return;
      }
      showToast('Sharing unavailable on this device');
    } catch {
      // A user dismissing the share sheet is not an error worth shouting about.
    }
  };

  // --- Pursuits --------------------------------------------------------------
  // Standing intents. Matching is recomputed from live objects rather than
  // stored, so a pursuit created before an object was ingested picks it up the
  // moment that object exists.
  const [pursuits, setPursuits] = useState<Pursuit[]>([]);

  const pursuitResults = useMemo(() => {
    const map: Record<string, PursuitMatch[]> = {};
    for (const pursuit of pursuits) {
      map[pursuit.id] =
        pursuit.status === 'active' || pursuit.status === 'paused'
          ? matchPursuit(pursuit, objects)
          : [];
    }
    return map;
  }, [pursuits, objects]);

  const handleCreatePursuit = (rawQuery: string) => {
    const query = rawQuery.trim();
    if (query === '') return;

    const existing = pursuits.find(
      (p) => p.query.toLowerCase() === query.toLowerCase()
    );
    if (existing) {
      setActiveTab('pursuits');
      showToast('Already pursuing this');
      return;
    }

    const pursuit = createPursuit(query, new Date().toISOString());
    setPursuits((prev) => [pursuit, ...prev]);
    // Handing a query to Brief means you are done typing it. Leaving it in the
    // search box would strand the stream on an empty result set.
    setSearchQuery('');
    setActiveTab('pursuits');
    showToast(
      pursuit.watchChanges
        ? `Watching: ${pursuit.query}`
        : `Pursuing: ${pursuit.query}`
    );
  };

  const handleSetPursuitStatus = (id: string, status: PursuitStatus) => {
    setPursuits((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, status, lastUpdatedAt: new Date().toISOString() }
          : p
      )
    );
  };

  const handleTogglePursuitWatch = (id: string) => {
    setPursuits((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              watchChanges: !p.watchChanges,
              lastUpdatedAt: new Date().toISOString()
            }
          : p
      )
    );
  };

  const handleTogglePursuitCondition = (id: string, condition: WatchCondition) => {
    setPursuits((prev) =>
      prev.map((p) => {
        if (p.id !== id) return p;
        const current = p.watchConditions ?? [];
        return {
          ...p,
          watchConditions: current.includes(condition)
            ? current.filter((c) => c !== condition)
            : [...current, condition],
          lastUpdatedAt: new Date().toISOString()
        };
      })
    );
  };

  const handleRemovePursuit = (id: string) => {
    setPursuits((prev) => prev.filter((p) => p.id !== id));
    showToast('Pursuit removed');
  };

  // --- Ingestion review state ------------------------------------------------
  // Candidates are parsed on demand and held here. They are NOT objects: until
  // a reviewer accepts one, nothing reaches the graph, search, or My Layer.
  const [candidates, setCandidates] = useState<IngestionCandidate[]>([]);
  const [reviewed, setReviewed] = useState<Record<string, CandidateStatus>>({});

  const handleReceiveInbound = () => {
    const known = new Set(candidates.map((c) => c.message.id));
    const fresh = INBOUND_FIXTURES.filter((m) => !known.has(m.id)).map((m) =>
      parseInboundMessage(m, objects)
    );

    if (fresh.length === 0) {
      showToast('No new messages');
      return;
    }

    setCandidates((prev) => [...prev, ...fresh]);
    showToast(`${fresh.length} message(s) parsed for review`);
  };

  // Accepting is the ONLY path from message to object, and it is manual.
  const handleAcceptCandidate = (candidate: IngestionCandidate) => {
    const accepted: BriefObject = { ...candidate.draft };

    // Apply suggested links only on acceptance -- a reviewer confirming the
    // parse is what makes a proposed edge real.
    for (const link of candidate.suggestedLinks) {
      if (link.relation === 'locationObjectId' && !accepted.locationObjectId) {
        accepted.locationObjectId = link.objectId;
      } else if (link.relation === 'relatedObjectIds') {
        accepted.relatedObjectIds = [
          ...(accepted.relatedObjectIds ?? []),
          link.objectId
        ];
      }
    }

    setObjects((prev) => [accepted, ...prev]);
    setReviewed((prev) => ({ ...prev, [candidate.id]: 'accepted' }));
    showToast(`Published: ${accepted.title.slice(0, 40)}`);
  };

  const handleRejectCandidate = (candidate: IngestionCandidate) => {
    setReviewed((prev) => ({ ...prev, [candidate.id]: 'rejected' }));
    showToast('Discarded');
  };

  // --- Group utility layer ---------------------------------------------------
  const groupIndex = useMemo(
    () => buildGroupIndex(GROUP_MESSAGES, INITIAL_GROUP),
    []
  );

  const unansweredQuestions = useMemo(
    () => getUnansweredQuestions(groupIndex),
    [groupIndex]
  );

  const [commandText, setCommandText] = useState('');
  const [commandResult, setCommandResult] = useState<GroupCommandResult | null>(null);

  const handleRunCommand = (override?: string) => {
    const raw = (override ?? commandText).trim();
    if (raw === '') return;

    const result = runGroupCommand(raw, {
      entries: groupIndex,
      objects,
      savedObjects,
      now: new Date('2026-08-15T00:00:00Z')
    });

    if (!result) {
      showToast('Unknown command');
      setCommandResult(null);
      return;
    }
    setCommandResult(result);
  };

  // --- Sources ---------------------------------------------------------------
  const [sources, setSources] = useState<Source[]>(INITIAL_SOURCES);

  // --- Capture ---------------------------------------------------------------
  // Pasted text runs through the ingestion parser, then waits for confirmation
  // exactly like anything else. Capture is a doorway, not a shortcut.
  const [captureOpen, setCaptureOpen] = useState(false);
  const [captureText, setCaptureText] = useState('');
  const [capturePreview, setCapturePreview] = useState<IngestionCandidate | null>(null);

  const handleCaptureParse = () => {
    const raw = captureText.trim();
    if (raw === '') return;
    const message = buildCaptureMessage(raw, new Date().toISOString());
    setCapturePreview(parseInboundMessage(message, objects));
  };

  const handleCaptureConfirm = () => {
    if (!capturePreview || !capturePreview.isObjectWorthy) return;
    handleAcceptCandidate(capturePreview);
    setCaptureText('');
    setCapturePreview(null);
    setCaptureOpen(false);
  };

  const handleCaptureCancel = () => {
    setCaptureText('');
    setCapturePreview(null);
    setCaptureOpen(false);
  };

  const savedIdSet = useMemo(
    () => new Set(savedObjects.map((o) => o.id)),
    [savedObjects]
  );

  const relatedToSavedIds = useMemo(() => {
    const out = new Set<string>();
    for (const saved of savedObjects) {
      for (const rel of getRelatedObjects(saved)) out.add(rel.item.id);
    }
    return out;
  }, [savedObjects, objects]);

  const dailyBrief = useMemo(
    () =>
      buildDailyBrief({
        objects,
        pursuits,
        pursuitResults,
        savedIds: savedIdSet,
        watchedIds,
        seenIds
      }),
    [objects, pursuits, pursuitResults, savedIdSet, watchedIds, seenIds]
  );

  const pendingCandidates = useMemo(
    () => candidates.filter((c) => !reviewed[c.id]),
    [candidates, reviewed]
  );

  const handleUnsave = (object: BriefObject) => {
    setRelationships((prev) =>
      prev.filter(
        (rel) => !(rel.targetId === object.id && rel.verb === 'saved')
      )
    );
    showToast(`Removed "${object.title}" from My Layer.`);
  };

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
              onClick={() => setCaptureOpen(true)}
              title="Capture something"
              className="p-2 rounded-xl text-xs font-bold border bg-[#00FF42] text-[#09150E] border-[#00FF42] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>

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
            <button onClick={() => setActiveTab('group')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'group' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Group{unansweredQuestions.length > 0 ? ` (${unansweredQuestions.length})` : ''}</button>
            <button onClick={() => setActiveTab('today')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'today' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Today{dailyBrief.length > 0 ? ' *' : ''}</button>
            <button onClick={() => setActiveTab('pursuits')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'pursuits' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Pursuits{pursuits.length > 0 ? ` (${pursuits.length})` : ''}</button>
            <button onClick={() => setActiveTab('inbox')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'inbox' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Inbox{pendingCandidates.length > 0 ? ` (${pendingCandidates.length})` : ''}</button>
            <button onClick={() => setActiveTab('sources')} className={`pb-1 border-b-2 cursor-pointer whitespace-nowrap ${activeTab === 'sources' ? 'text-[#00FF42] border-[#00FF42]' : 'text-[#8DCF74] border-transparent'}`}>Sources</button>
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

                      {/* Imageless objects must not silently lose their
                          category and verification chips -- these used to live
                          only inside the hero image block. Same chips, same
                          styling, just reachable without a photo. */}
                      {!obj.imageUrl && (
                        <div className="flex items-center gap-2 px-4 pt-1">
                          <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-[#09150E]/80 text-[#00FF42] border border-[#235F45]">
                            {obj.category}
                          </span>

                          {obj.isVerified && (
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#00FF42] text-[#09150E]">
                              VERIFIED
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

                        {/* Status (prompt 9): displayed only when explicitly
                            supplied. Never computed from partial data, and
                            deliberately below the title, not competing with it. */}
                        {obj.metadata?.statusBadge && (
                          <span className="inline-block text-[10px] font-bold text-[#8DCF74]">
                            {obj.metadata.statusBadge}
                          </span>
                        )}

                        <p className="text-xs text-[#8DCF74] line-clamp-2">
                          {obj.summary}
                        </p>

                        {obj.locationName && (
                          <div className="flex items-center gap-1.5 text-[10px] text-[#86935C]">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate">{obj.locationName}</span>
                            {getDistanceLabel(obj) && (
                              <span className="ml-auto shrink-0 font-mono text-[#8DCF74]">
                                {getDistanceLabel(obj)}
                              </span>
                            )}
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

                {/* A search that finds nothing is the clearest signal of
                    intent Brief ever gets. Rather than a dead end, offer to
                    keep pursuing it as information arrives. */}
                {searchQuery.trim() !== '' && (
                  <div className="mt-4">
                    <p className="text-[11px] text-[#5C6B52] mb-2">
                      Brief has not seen anything matching this yet.
                    </p>
                    <button
                      onClick={() => handleCreatePursuit(searchQuery)}
                      className="px-4 py-2 rounded-xl bg-[#172D20] border border-[#235F45] text-[#8DCF74] font-extrabold text-[11px] cursor-pointer"
                    >
                      Keep pursuing "{searchQuery.trim()}"
                    </button>
                  </div>
                )}
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
          <section className="space-y-4">
            <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Bookmark className="w-4 h-4 text-[#00FF42]" />
                <span className="text-[10px] font-mono uppercase text-[#00FF42]">
                  Your Layer
                </span>
              </div>

              <h2 className="text-xl font-extrabold">Things you've kept.</h2>

              <p className="text-xs text-[#8DCF74] mt-1">
                {savedObjects.length > 0
                  ? `${savedObjects.length} saved across ${savedGroups.length} ${
                      savedGroups.length === 1 ? 'section' : 'sections'
                    }.`
                  : 'Your saved places, opportunities and useful information.'}
              </p>
            </div>

            {savedGroups.map((group) => (
              <div key={group.label}>
                <div className="flex items-baseline gap-2 mb-2 px-1">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#00FF42]">
                    {group.label}
                  </h3>
                  <span className="text-[10px] font-mono text-[#86935C]">
                    {group.items.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {group.items.map((obj) => {
                    const action = resolveAction(obj);
                    const distance = getDistanceLabel(obj);

                    return (
                      <div
                        key={obj.id}
                        className="bg-[#102117] border border-[#1E3A2A] hover:border-[#00FF42] rounded-2xl p-3 transition"
                      >
                        <button
                          onClick={() => setSelectedObjectForDetail(obj)}
                          className="w-full text-left cursor-pointer group"
                        >
                          <div className="flex items-start gap-3">
                            {obj.imageUrl && (
                              <img
                                src={obj.imageUrl}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover shrink-0"
                              />
                            )}

                            <div className="min-w-0 flex-1">
                              <div className="text-[9px] font-mono uppercase text-[#86935C]">
                                {obj.category}
                              </div>
                              <div className="text-xs font-extrabold mt-0.5 line-clamp-2 group-hover:text-[#00FF42]">
                                {obj.title}
                              </div>
                              {distance && (
                                <div className="text-[10px] font-mono text-[#86935C] mt-1">
                                  {distance}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-2 mt-3">
                          {action.kind === 'internal' || action.kind === 'none' ? (
                            <button
                              onClick={() => setSelectedObjectForDetail(obj)}
                              className="flex-1 py-2 rounded-xl bg-[#172D20] border border-[#235F45] text-[#8DCF74] font-extrabold text-[11px] cursor-pointer"
                            >
                              View details
                            </button>
                          ) : (
                            <a
                              href={action.href}
                              target={action.kind === 'phone' ? undefined : '_blank'}
                              rel={
                                action.kind === 'phone'
                                  ? undefined
                                  : 'noopener noreferrer'
                              }
                              onClick={() =>
                                handleExecuteProtocolAction(
                                  action.kind === 'phone' ? 'contact' : 'discover',
                                  obj,
                                  { silent: true }
                                )
                              }
                              className="flex-1 py-2 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              {action.label}
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          )}

                          <button
                            onClick={() => handleCreatePursuit(obj.title)}
                            title="Pursue similar"
                            className="p-2 rounded-xl bg-[#172D20] text-[#8DCF74] border border-[#1E3A2A] hover:border-[#00FF42] cursor-pointer"
                          >
                            <Search className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleUnsave(obj)}
                            title="Remove from My Layer"
                            className="p-2 rounded-xl bg-[#172D20] text-[#8DCF74] border border-[#1E3A2A] hover:border-[#00FF42] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Why this was saved (prompt 10). Optional: an
                            unlabelled save is a perfectly valid save, so this
                            is a quiet row of toggles, never a required step. */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {SAVE_LABELS.map((label) => {
                            const active = graph.savedLabel(obj.id) === label;
                            return (
                              <button
                                key={label}
                                onClick={() => handleSetSaveLabel(obj, label)}
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition ${
                                  active
                                    ? 'bg-[#00FF42] text-[#09150E] border-[#00FF42]'
                                    : 'bg-transparent text-[#5C6B52] border-[#1E3A2A] hover:border-[#235F45]'
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Activity (prompt 19). Derived from the same relationships,
                not a second history store. Secondary to saved objects. */}
            {(() => {
              const recent = graph.activity(6);
              if (recent.length === 0) return null;

              return (
                <div className="mt-8 pt-5 border-t border-[#1E3A2A]">
                  <p className="text-[10px] font-mono uppercase text-[#5C6B52] mb-3">
                    Recent activity
                  </p>
                  <div className="space-y-1.5">
                    {recent.map((entry) => (
                      <button
                        key={`${entry.object.id}_${entry.verb}`}
                        onClick={() => setSelectedObjectForDetail(entry.object)}
                        className="w-full text-left flex items-center gap-2 py-1.5 cursor-pointer"
                      >
                        <span className="text-[9px] font-mono uppercase text-[#00FF42] w-20 shrink-0">
                          {entry.verb}
                        </span>
                        <span className="text-[11px] text-[#A9BDA0] truncate">
                          {entry.object.title}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}

            {savedObjects.length === 0 && (
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
        {activeTab === 'group' && (
          <div className="space-y-4">

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-extrabold text-[#E2ECE5]">
                  {INITIAL_GROUP.name}
                </h2>
                <span className="text-[9px] font-mono uppercase text-[#5C6B52]">
                  {INITIAL_GROUP.platform}
                </span>
              </div>
              <p className="text-[11px] text-[#86935C] leading-snug mt-1">
                Brief reads what is already posted here and makes it findable.
                It does not post, promote, or message members.
              </p>
            </div>

            {/* Commands: the interface is the group people already use. */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleRunCommand();
              }}
              className="flex gap-2"
            >
              <input
                value={commandText}
                onChange={(e) => setCommandText(e.target.value)}
                placeholder="/find solar"
                className="flex-1 bg-[#0D1F15] border border-[#1E3A2A] rounded-xl px-3 py-2.5 text-xs font-mono text-[#E2ECE5] placeholder-[#5C6B52] outline-none focus:border-[#235F45]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-[11px] cursor-pointer"
              >
                Run
              </button>
            </form>

            <div className="flex flex-wrap gap-1.5">
              {['/brief', '/jobs', '/events', '/find solar', '/ask permit'].map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCommandText(c);
                    handleRunCommand(c);
                  }}
                  className="text-[10px] font-mono px-2 py-1 rounded-full bg-[#172D20] border border-[#1E3A2A] text-[#8DCF74] cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>

            {commandResult && (
              <div className="bg-[#102117] border border-[#235F45] rounded-2xl p-4 space-y-3">
                <p className="text-[9px] font-mono uppercase text-[#00FF42]">
                  /{commandResult.command} {commandResult.argument}
                </p>

                {commandResult.brief && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-extrabold text-[#E2ECE5]">
                      This week in the group
                    </p>
                    {commandResult.brief.lines.map((line) => (
                      <div
                        key={line.messageClass}
                        className="flex items-baseline justify-between gap-3"
                      >
                        <span className="text-[11px] text-[#A9BDA0]">{line.label}</span>
                        <span className="text-[11px] font-mono text-[#8DCF74]">
                          {line.count}
                        </span>
                      </div>
                    ))}

                    {commandResult.brief.unanswered.length > 0 && (
                      <div className="pt-2 border-t border-[#1E3A2A] space-y-1">
                        <p className="text-[10px] font-bold text-[#C9A227]">
                          {commandResult.brief.unanswered.length} question
                          {commandResult.brief.unanswered.length === 1 ? '' : 's'} still waiting
                        </p>
                        {commandResult.brief.unanswered.map((q) => (
                          <p key={q.id} className="text-[10px] text-[#A9BDA0] leading-snug">
                            {q.originalText}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {commandResult.fromGroup.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-mono uppercase text-[#5C6B52]">
                      From this group
                    </p>
                    {commandResult.fromGroup.slice(0, 6).map((entry) => (
                      <div
                        key={entry.id}
                        className="bg-[#0D1F15] border border-[#1E3A2A] rounded-xl p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] font-mono uppercase text-[#00FF42]">
                            {MESSAGE_CLASS_LABELS[entry.messageClass]}
                          </span>
                          <span className="text-[9px] font-mono text-[#5C6B52]">
                            {entry.sentAt.slice(0, 10)}
                          </span>
                        </div>

                        {/* The original message, always. Brief's reading of it
                            never stands in for what was actually said. */}
                        <p className="text-[11px] text-[#E2ECE5] leading-snug mt-1">
                          {entry.originalText}
                        </p>

                        {entry.answers.map((a) => (
                          <p
                            key={a.messageId}
                            className="text-[10px] text-[#8DCF74] leading-snug mt-1 pl-2 border-l-2 border-[#235F45]"
                          >
                            {a.authorLabel ? `${a.authorLabel}: ` : ''}
                            {a.text}
                          </p>
                        ))}

                        <div className="flex items-center gap-2 mt-1">
                          {entry.authorLabel && (
                            <span className="text-[9px] text-[#5C6B52]">
                              {entry.authorLabel}
                            </span>
                          )}
                          {entry.entities.map((ent) => (
                            <span
                              key={ent.field}
                              className="text-[9px] font-mono text-[#86935C]"
                            >
                              {ent.field}: {ent.value}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {commandResult.fromElsewhere.length > 0 && (
                  <div className="space-y-2">
                    {/* Deliberately a separate heading: a member must always be
                        able to tell what their group said from what Brief
                        knows from somewhere else. */}
                    <p className="text-[10px] font-mono uppercase text-[#C9A227]">
                      Not in this group - found elsewhere in Brief
                    </p>
                    {commandResult.fromElsewhere.map((obj) => (
                      <button
                        key={obj.id}
                        onClick={() => setSelectedObjectForDetail(obj)}
                        className="w-full text-left bg-[#0D1F15] border border-[#1E3A2A] hover:border-[#235F45] rounded-xl p-2.5 cursor-pointer"
                      >
                        <span className="text-[9px] font-mono uppercase text-[#5C6B52]">
                          {getObjectTypeMeta(obj.type).label}
                        </span>
                        <p className="text-[11px] font-bold text-[#E2ECE5] mt-0.5">
                          {obj.title}
                        </p>
                      </button>
                    ))}
                  </div>
                )}

                {commandResult.emptyNote && (
                  <p className="text-[11px] text-[#86935C]">{commandResult.emptyNote}</p>
                )}
              </div>
            )}

            {/* Unanswered questions: groups are terrible at preserving these. */}
            {unansweredQuestions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#C9A227]">
                  {unansweredQuestions.length} questions still waiting
                </h3>
                {unansweredQuestions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-[#102117] border border-[#1E3A2A] rounded-xl p-3"
                  >
                    <p className="text-[11px] text-[#E2ECE5] leading-snug">
                      {q.originalText}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {q.authorLabel && (
                        <span className="text-[9px] text-[#5C6B52]">{q.authorLabel}</span>
                      )}
                      <span className="text-[9px] font-mono text-[#5C6B52]">
                        {q.sentAt.slice(0, 10)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Operational metrics only. No impressions, no engagement. */}
            <div className="border-t border-[#1E3A2A] pt-4 space-y-2">
              <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#5C6B52]">
                Group health
              </h3>
              {[
                ['Messages processed', GROUP_MESSAGES.length],
                ['Information extracted', groupIndex.length],
                ['Questions asked', groupIndex.filter((e) => e.messageClass === 'question').length],
                ['Questions answered', groupIndex.filter((e) => e.messageClass === 'question' && e.answeredByMessageIds.length > 0).length],
                ['Still unanswered', unansweredQuestions.length]
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-baseline justify-between gap-3">
                  <span className="text-[10px] text-[#86935C]">{label}</span>
                  <span className="text-[10px] font-mono text-[#A9BDA0]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'today' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#E2ECE5]">Today</h2>
              <p className="text-[11px] text-[#86935C] leading-snug mt-1">
                Only what relates to your pursuits, saved and watched things.
              </p>
            </div>

            {dailyBrief.length === 0 && (
              <div className="border border-dashed border-[#1E3A2A] rounded-2xl p-8 text-center">
                <p className="text-xs text-[#86935C]">Nothing to report.</p>
                <p className="text-[10px] text-[#5C6B52] mt-1">
                  Save something, or start a pursuit, and this fills itself in.
                </p>
              </div>
            )}

            {dailyBrief.map((section) => (
              <div key={section.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-extrabold uppercase tracking-wider text-[#00FF42]">
                    {section.title}
                  </h3>
                  <span className="text-[10px] font-mono text-[#86935C]">
                    {section.objects.length + section.pursuits.length}
                  </span>
                </div>

                {section.objects.map((obj) => (
                  <button
                    key={obj.id}
                    onClick={() => setSelectedObjectForDetail(obj)}
                    className="w-full text-left bg-[#102117] border border-[#1E3A2A] hover:border-[#235F45] rounded-xl p-3 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] font-mono uppercase text-[#5C6B52]">
                        {getObjectTypeMeta(obj.type).label}
                      </span>
                      {getDistanceLabel(obj) && (
                        <span className="text-[9px] font-mono text-[#86935C]">
                          {getDistanceLabel(obj)}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] font-bold text-[#E2ECE5] leading-snug mt-0.5">
                      {obj.title}
                    </p>
                    {obj.metadata?.statusBadge && (
                      <p className="text-[10px] text-[#8DCF74] mt-0.5">
                        {obj.metadata.statusBadge}
                      </p>
                    )}
                  </button>
                ))}

                {section.pursuits.map((pursuit) => (
                  <button
                    key={pursuit.id}
                    onClick={() => setActiveTab('pursuits')}
                    className="w-full text-left bg-[#0D1F15] border border-[#1E3A2A] rounded-xl p-3 cursor-pointer"
                  >
                    <p className="text-[11px] text-[#A9BDA0]">{pursuit.query}</p>
                    <p className="text-[9px] text-[#5C6B52] mt-0.5">
                      Nothing useful yet. Brief is still looking.
                    </p>
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'sources' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-extrabold text-[#E2ECE5]">Sources</h2>
              <p className="text-[11px] text-[#86935C] leading-snug mt-1">
                Where Brief receives information from. A channel is not the
                information -- Brief only keeps what it can structure.
              </p>
            </div>

            {sources.map((source) => {
              const health = getSourceHealth(source);
              const tone =
                health === 'healthy'
                  ? 'text-[#00FF42]'
                  : health === 'error'
                  ? 'text-[#E06C4F]'
                  : 'text-[#C9A227]';

              return (
                <div
                  key={source.id}
                  className="bg-[#102117] border border-[#1E3A2A] rounded-2xl p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#E2ECE5]">
                        {source.name}
                      </p>
                      <p className="text-[9px] font-mono uppercase text-[#5C6B52] mt-0.5">
                        {source.type}
                      </p>
                    </div>
                    <span className={`text-[10px] font-bold shrink-0 ${tone}`}>
                      {getSourceHealthLabel(health)}
                    </span>
                  </div>

                  {source.description && (
                    <p className="text-[10px] text-[#86935C] leading-snug">
                      {source.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 pt-1">
                    <span className="text-[9px] font-mono text-[#5C6B52]">
                      {source.ingestionCount} received
                    </span>
                    {source.lastSuccessfulIngestionAt && (
                      <span className="text-[9px] font-mono text-[#5C6B52]">
                        last {source.lastSuccessfulIngestionAt.slice(0, 10)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'pursuits' && (
          <div className="space-y-4">

            <div>
              <h2 className="text-lg font-extrabold text-[#E2ECE5]">Pursuits</h2>
              <p className="text-[11px] text-[#86935C] leading-snug mt-1">
                Things you have asked Brief to find or keep an eye on. Brief
                searches only what it already holds, so results grow as more
                information arrives.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreatePursuit(pursuitDraft);
                setPursuitDraft('');
              }}
              className="flex gap-2"
            >
              <input
                value={pursuitDraft}
                onChange={(e) => setPursuitDraft(e.target.value)}
                placeholder="find a plumber near me"
                className="flex-1 bg-[#0D1F15] border border-[#1E3A2A] rounded-xl px-3 py-2.5 text-xs text-[#E2ECE5] placeholder-[#5C6B52] outline-none focus:border-[#235F45]"
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-[11px] cursor-pointer"
              >
                Pursue
              </button>
            </form>

            {pursuits.length === 0 && (
              <div className="border border-dashed border-[#1E3A2A] rounded-2xl p-8 text-center">
                <p className="text-xs text-[#86935C]">Nothing being pursued yet.</p>
                <p className="text-[10px] text-[#5C6B52] mt-1">
                  Ask for something above, or start one from any object.
                </p>
              </div>
            )}

            {pursuits.map((pursuit) => {
              const results = pursuitResults[pursuit.id] ?? [];
              const dormant =
                pursuit.status === 'completed' || pursuit.status === 'archived';

              return (
                <div
                  key={pursuit.id}
                  className="bg-[#102117] border border-[#1E3A2A] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-[#E2ECE5] leading-snug">
                        {pursuit.query}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono uppercase text-[#86935C]">
                          {pursuit.status}
                        </span>
                        {pursuit.watchChanges && (
                          <span className="text-[9px] font-mono uppercase text-[#00FF42]">
                            watching
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemovePursuit(pursuit.id)}
                      title="Remove pursuit"
                      className="shrink-0 p-2 rounded-xl bg-[#172D20] text-[#8DCF74] border border-[#1E3A2A] hover:border-[#00FF42] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {!dormant && (
                    <>
                      <p className="text-[10px] font-mono uppercase text-[#5C6B52]">
                        {results.length > 0
                          ? `${results.length} match${results.length === 1 ? '' : 'es'} in Brief`
                          : 'Nothing matching yet'}
                      </p>

                      {/* Saying "I don't know yet" is a feature, not a
                          failure state. Brief never pads this with guesses. */}
                      {results.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-[11px] font-bold text-[#A9BDA0]">
                            Nothing useful yet.
                          </p>
                          <p className="text-[10px] text-[#86935C] leading-snug">
                            Keep this pursuit open and Brief can match new
                            information later.
                          </p>
                          {!pursuit.watchChanges && (
                            <button
                              onClick={() => handleTogglePursuitWatch(pursuit.id)}
                              className="px-3 py-1.5 rounded-full bg-[#172D20] border border-[#235F45] text-[#8DCF74] font-extrabold text-[10px] cursor-pointer"
                            >
                              Keep watching
                            </button>
                          )}
                        </div>
                      )}

                      {results.length > 0 && (
                        <div className="space-y-1.5">
                          {results.slice(0, 4).map((match) => {
                            const distance = getDistanceLabel(match.item);
                            return (
                              <button
                                key={match.item.id}
                                onClick={() => setSelectedObjectForDetail(match.item)}
                                className="w-full text-left bg-[#0D1F15] border border-[#1E3A2A] hover:border-[#235F45] rounded-xl p-2.5 cursor-pointer transition"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[9px] font-mono uppercase text-[#5C6B52]">
                                    {getObjectTypeMeta(match.item.type).label}
                                  </span>
                                  {distance && (
                                    <span className="text-[9px] font-mono text-[#86935C]">
                                      {distance}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] font-bold text-[#E2ECE5] leading-snug mt-0.5">
                                  {match.item.title}
                                </p>
                                {match.item.metadata?.statusBadge && (
                                  <p className="text-[9px] text-[#8DCF74] mt-0.5">
                                    {match.item.metadata.statusBadge}
                                  </p>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {(['active', 'paused', 'completed', 'archived'] as PursuitStatus[]).map(
                      (status) => (
                        <button
                          key={status}
                          onClick={() => handleSetPursuitStatus(pursuit.id, status)}
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition ${
                            pursuit.status === status
                              ? 'bg-[#00FF42] text-[#09150E] border-[#00FF42]'
                              : 'bg-transparent text-[#5C6B52] border-[#1E3A2A] hover:border-[#235F45]'
                          }`}
                        >
                          {status}
                        </button>
                      )
                    )}

                    <button
                      onClick={() => handleTogglePursuitWatch(pursuit.id)}
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition ${
                        pursuit.watchChanges
                          ? 'bg-[#172D20] text-[#00FF42] border-[#235F45]'
                          : 'bg-transparent text-[#5C6B52] border-[#1E3A2A] hover:border-[#235F45]'
                      }`}
                    >
                      watch changes
                    </button>
                  </div>

                  {/* Which changes matter (prompt 5). Model + matching only --
                      nothing is monitoring in the background yet. */}
                  {pursuit.watchChanges && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[9px] font-mono uppercase text-[#5C6B52]">
                        Tell me about
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(WATCH_CONDITION_LABELS) as WatchCondition[]).map(
                          (condition) => {
                            const on = (pursuit.watchConditions ?? []).includes(
                              condition
                            );
                            return (
                              <button
                                key={condition}
                                onClick={() =>
                                  handleTogglePursuitCondition(pursuit.id, condition)
                                }
                                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition ${
                                  on
                                    ? 'bg-[#172D20] text-[#00FF42] border-[#235F45]'
                                    : 'bg-transparent text-[#5C6B52] border-[#1E3A2A] hover:border-[#235F45]'
                                }`}
                              >
                                {WATCH_CONDITION_LABELS[condition]}
                              </button>
                            );
                          }
                        )}
                      </div>
                      <p className="text-[9px] text-[#5C6B52]">
                        Alerts are not live yet. Brief records what matters to you.
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'inbox' && (
          <div className="space-y-4">

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold text-[#E2ECE5]">Inbox</h2>
                <p className="text-[11px] text-[#86935C] leading-snug mt-1">
                  Messages from connected sources, parsed into draft objects.
                  Nothing here is in Brief until you publish it.
                </p>
              </div>

              <button
                onClick={handleReceiveInbound}
                className="shrink-0 px-3 py-2 rounded-xl bg-[#172D20] border border-[#235F45] text-[#8DCF74] font-extrabold text-[11px] cursor-pointer"
              >
                Fetch messages
              </button>
            </div>

            {pendingCandidates.length === 0 && (
              <div className="border border-dashed border-[#1E3A2A] rounded-2xl p-8 text-center">
                <p className="text-xs text-[#86935C]">
                  No messages awaiting review.
                </p>
                <p className="text-[10px] text-[#5C6B52] mt-1">
                  Connected sources appear here as drafts, never as published objects.
                </p>
              </div>
            )}

            {pendingCandidates.map((candidate) => {
              const confidencePct = Math.round(candidate.confidence * 100);
              const lowConfidence = candidate.confidence < 0.5;

              return (
                <div
                  key={candidate.id}
                  className="bg-[#102117] border border-[#1E3A2A] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono uppercase text-[#86935C] truncate">
                      {candidate.message.sourceLabel}
                    </span>
                    <span
                      className={`text-[9px] font-mono shrink-0 ${
                        lowConfidence ? 'text-[#C9A227]' : 'text-[#8DCF74]'
                      }`}
                    >
                      {confidencePct}% parsed
                    </span>
                  </div>

                  {/* The raw message, always visible next to what was made of it. */}
                  <p className="text-[11px] text-[#5C6B52] italic leading-snug border-l-2 border-[#1E3A2A] pl-2">
                    {candidate.message.text}
                  </p>

                  <div>
                    <p className="text-[9px] font-mono uppercase text-[#00FF42]">
                      {candidate.typeConfident
                        ? getObjectTypeMeta(candidate.draft.type).label
                        : 'Type unclear'}
                    </p>
                    <p className="text-sm font-extrabold text-[#E2ECE5] leading-snug mt-0.5">
                      {candidate.draft.title}
                    </p>
                  </div>

                  {candidate.extracted.length > 0 && (
                    <div className="space-y-1">
                      {candidate.extracted
                        .filter((f) => f.field !== 'title')
                        .map((f) => (
                          <div
                            key={f.field}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="text-[10px] text-[#86935C] shrink-0">
                              {f.field}
                            </span>
                            <span className="text-[10px] font-mono text-[#A9BDA0] truncate">
                              {f.value}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}

                  {candidate.suggestedLinks.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[9px] font-mono uppercase text-[#5C6B52]">
                        Connects to
                      </p>
                      {candidate.suggestedLinks.map((link) => (
                        <p
                          key={link.objectId + link.relation}
                          className="text-[10px] text-[#8DCF74]"
                        >
                          {link.why}
                        </p>
                      ))}
                    </div>
                  )}

                  {candidate.warnings.map((w) => (
                    <p key={w} className="text-[10px] text-[#C9A227]">
                      {w}
                    </p>
                  ))}

                  {candidate.duplicates.length > 0 && (
                    <div className="border border-[#3A3416] bg-[#1A1708] rounded-xl p-2 space-y-0.5">
                      <p className="text-[9px] font-mono uppercase text-[#C9A227]">
                        Possible duplicate
                      </p>
                      {candidate.duplicates.slice(0, 2).map((d) => (
                        <p key={d.item.id} className="text-[10px] text-[#A9BDA0]">
                          {d.item.title} ({Math.round(d.similarity * 100)}% similar)
                        </p>
                      ))}
                    </div>
                  )}

                  <p className="text-[9px] font-mono text-[#5C6B52]">
                    Unverified. No trust score until reviewed.
                  </p>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => handleRejectCandidate(candidate)}
                      className="flex-1 py-2 rounded-xl bg-[#0D1F15] border border-[#1E3A2A] text-[#86935C] font-bold text-[11px] cursor-pointer"
                    >
                      Discard
                    </button>
                    <button
                      onClick={() => handleAcceptCandidate(candidate)}
                      className="flex-[2] py-2 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-[11px] cursor-pointer"
                    >
                      Publish to Brief
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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

      {/* CAPTURE: the easiest way into Brief. Deliberately one input and two
          buttons -- no onboarding, no explanation, no AI branding. */}
      {captureOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#09150E]/90 backdrop-blur-md overflow-y-auto"
          onClick={handleCaptureCancel}
        >
          <div className="min-h-screen flex items-end sm:items-center justify-center p-0 sm:p-6">
            <div
              className="w-full max-w-lg bg-[#102117] border border-[#235F45] rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-extrabold text-[#E2ECE5]">
                    Drop something here.
                  </h2>
                  <p className="text-[11px] text-[#86935C] mt-1">
                    A message, link, listing, event, opportunity or anything
                    worth keeping.
                  </p>
                </div>
                <button
                  onClick={handleCaptureCancel}
                  className="p-2 rounded-full bg-[#09150E]/80 text-[#E2ECE5] border border-[#235F45] shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <textarea
                value={captureText}
                onChange={(e) => {
                  setCaptureText(e.target.value);
                  setCapturePreview(null);
                }}
                rows={5}
                placeholder="Paste or type anything"
                className="w-full bg-[#0D1F15] border border-[#1E3A2A] rounded-xl px-3 py-2.5 text-xs text-[#E2ECE5] placeholder-[#5C6B52] outline-none focus:border-[#235F45] resize-none"
              />

              {!capturePreview && (
                <button
                  onClick={handleCaptureParse}
                  disabled={captureText.trim() === ''}
                  className={`w-full py-3 rounded-xl font-extrabold text-xs ${
                    captureText.trim() === ''
                      ? 'bg-[#172D20] text-[#5C6B52] cursor-not-allowed'
                      : 'bg-[#00FF42] text-[#09150E] cursor-pointer'
                  }`}
                >
                  Read it
                </button>
              )}

              {/* Confirmation step. Brief shows exactly what it understood and
                  waits -- nothing is saved until the user agrees. */}
              {capturePreview && (
                <div className="space-y-3">
                  {!capturePreview.isObjectWorthy ? (
                    <div className="border border-[#3A3416] bg-[#1A1708] rounded-xl p-3">
                      <p className="text-[11px] font-bold text-[#C9A227]">
                        Brief could not make an object from this.
                      </p>
                      <p className="text-[10px] text-[#A9BDA0] mt-1">
                        {capturePreview.rejectionReason}
                      </p>
                      <p className="text-[10px] text-[#5C6B52] mt-1">
                        Nothing was saved.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-[#0D1F15] border border-[#1E3A2A] rounded-xl p-3 space-y-2">
                      <p className="text-[9px] font-mono uppercase text-[#00FF42]">
                        {getObjectTypeMeta(capturePreview.draft.type).label}
                      </p>
                      <p className="text-sm font-extrabold text-[#E2ECE5] leading-snug">
                        {capturePreview.draft.title}
                      </p>

                      {capturePreview.extracted
                        .filter((f) => f.field !== 'title')
                        .map((f) => (
                          <div
                            key={f.field}
                            className="flex items-baseline justify-between gap-3"
                          >
                            <span className="text-[10px] text-[#86935C]">
                              {f.field}
                            </span>
                            <span className="text-[10px] font-mono text-[#A9BDA0] truncate">
                              {f.value}
                            </span>
                          </div>
                        ))}

                      {capturePreview.duplicates.length > 0 && (
                        <p className="text-[10px] text-[#C9A227]">
                          Possible duplicate of{' '}
                          {capturePreview.duplicates[0].item.title}
                        </p>
                      )}

                      <p className="text-[9px] font-mono text-[#5C6B52]">
                        Unverified. Saved as your own capture.
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleCaptureCancel}
                      className="flex-1 py-2.5 rounded-xl bg-[#0D1F15] border border-[#1E3A2A] text-[#86935C] font-bold text-[11px] cursor-pointer"
                    >
                      Discard
                    </button>
                    {capturePreview.isObjectWorthy && (
                      <button
                        onClick={handleCaptureConfirm}
                        className="flex-[2] py-2.5 rounded-xl bg-[#00FF42] text-[#09150E] font-extrabold text-[11px] cursor-pointer"
                      >
                        Save to Brief
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

              {/* Without a hero image the close button and chips disappeared
                  entirely, leaving backdrop-click as the only way out. This is
                  the same control set, laid out for an imageless record. */}
              {!selectedObjectForDetail.imageUrl && (
                <div className="flex items-center justify-between gap-2 p-4 border-b border-[#1E3A2A]">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-[#09150E]/85 text-[#00FF42] border border-[#235F45]">
                      {selectedObjectForDetail.category}
                    </span>

                    {selectedObjectForDetail.isVerified && (
                      <span className="text-[10px] font-extrabold px-3 py-1 rounded-full bg-[#00FF42] text-[#09150E]">
                        Verified
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setSelectedObjectForDetail(null)}
                    className="p-2 rounded-full bg-[#09150E]/80 text-[#E2ECE5] border border-[#235F45]"
                  >
                    <X className="w-5 h-5" />
                  </button>
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

                {/* Facts -- generated from metadata, empty fields omitted */}
                {(() => {
                  const facts = buildKeyFacts(selectedObjectForDetail);
                  if (facts.length === 0) return null;
                  return (
                    <div className="grid grid-cols-2 gap-3">
                      {facts.map((fact) => (
                        <div
                          key={fact.key}
                          className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3"
                        >
                          <div className="text-[10px] uppercase text-[#86935C]">
                            {fact.label}
                          </div>
                          <div className="text-xs font-bold mt-1">
                            {fact.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Location & contact */}
                {(selectedObjectForDetail.locationName ||
                  selectedObjectForDetail.creatorName ||
                  selectedObjectForDetail.metadata?.contactPhone) && (
                  <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl p-3 space-y-3">
                    {selectedObjectForDetail.locationName && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#00FF42] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase text-[#86935C]">
                            Location
                          </div>
                          <div className="text-xs font-bold">
                            {selectedObjectForDetail.locationName}
                          </div>
                          {resolveAction(selectedObjectForDetail).kind !== 'map' && (
                            <a
                              href={buildMapsHref(
                                selectedObjectForDetail.locationName
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] font-extrabold text-[#00FF42] mt-1 hover:underline"
                            >
                              Open in Maps
                              <ArrowRight className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedObjectForDetail.creatorName && (
                      <div className="flex items-start gap-2">
                        <User className="w-4 h-4 text-[#00FF42] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase text-[#86935C]">
                            {selectedObjectForDetail.type === 'product'
                              ? 'Seller'
                              : selectedObjectForDetail.type === 'service'
                              ? 'Provider'
                              : selectedObjectForDetail.type === 'opportunity'
                              ? 'Offered by'
                              : 'Listed by'}
                          </div>
                          <div className="text-xs font-bold">
                            {selectedObjectForDetail.creatorName}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedObjectForDetail.metadata?.contactPhone && (
                      <div className="flex items-start gap-2">
                        <Building2 className="w-4 h-4 text-[#00FF42] shrink-0 mt-0.5" />
                        <div className="min-w-0">
                          <div className="text-[10px] uppercase text-[#86935C]">
                            Contact
                          </div>
                          <a
                            href={buildTelHref(
                              selectedObjectForDetail.metadata.contactPhone
                            )}
                            className="text-xs font-bold text-[#00FF42] hover:underline"
                          >
                            {selectedObjectForDetail.metadata.contactPhone}
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Trust, freshness and provenance (prompts 12/13/14).
                    One quiet row answering: who said this, was it checked,
                    how recently, and where did it come from. A score is
                    labelled as a confidence signal, never as a guarantee. */}
                {(() => {
                  const subject = selectedObjectForDetail;
                  const fresh = getFreshness(subject);
                  const hasTrust =
                    subject.trustScore !== undefined ||
                    subject.isVerified ||
                    Boolean(subject.creatorName) ||
                    Boolean(fresh) ||
                    Boolean(subject.sourceUrl);

                  if (!hasTrust) return null;

                  const freshTone =
                    fresh?.level === 'stale' || fresh?.level === 'aging'
                      ? 'text-[#C9A227]'
                      : 'text-[#8DCF74]';

                  return (
                    <div className="bg-[#09150E] border border-[#1E3A2A] rounded-xl px-4 py-3 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldCheck className="w-4 h-4 text-[#00FF42] shrink-0" />
                          <span className="text-xs font-bold truncate">
                            {subject.creatorName || 'Provider not stated'}
                          </span>
                          {subject.isVerified && (
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-[#00FF42] text-[#09150E] shrink-0">
                              VERIFIED
                            </span>
                          )}
                        </div>

                        {subject.trustScore !== undefined && (
                          <span className="text-sm font-extrabold text-[#00FF42] shrink-0">
                            {subject.trustScore}%
                          </span>
                        )}
                      </div>

                      {fresh && (
                        <div className="flex items-center justify-between gap-3">
                          <span className={`text-[10px] font-bold ${freshTone}`}>
                            {fresh.label}
                          </span>
                          <span className="text-[10px] font-mono text-[#5C6B52]">
                            checked {fresh.verifiedOn}
                          </span>
                        </div>
                      )}

                      {subject.trustScore !== undefined && (
                        <p className="text-[10px] text-[#5C6B52] leading-snug">
                          A confidence signal from how this record was sourced and
                          checked. It is not a guarantee of accuracy.
                        </p>
                      )}

                      {subject.sourceUrl && (
                        <a
                          href={subject.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1.5 text-[10px] font-bold text-[#8DCF74] underline underline-offset-2"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Source
                        </a>
                      )}
                    </div>
                  );
                })()}

                {/* "You can..." (prompt 8). Only actions the data supports. */}
                {(() => {
                  const suggestions = getSuggestedActions(selectedObjectForDetail);
                  const extras = suggestions.filter((a) => a.kind !== 'primary');
                  if (extras.length === 0) return null;

                  return (
                    <div className="space-y-2">
                      <p className="text-[10px] font-mono uppercase text-[#5C6B52]">
                        You can
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {extras.map((a) => (
                          <a
                            key={a.key}
                            href={a.href}
                            target={a.key === 'call' ? undefined : '_blank'}
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] font-bold px-3 py-1.5 rounded-full bg-[#172D20] border border-[#235F45] text-[#8DCF74]"
                          >
                            {a.label}
                          </a>
                        ))}
                      </div>
                    </div>
                  );
                })()}

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

                  {/* Secondary doors (prompts 11/18/21). Subordinate to the
                      primary action, and only rendered where data supports
                      them. Watch records intent; it does not poll anything. */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleShare(selectedObjectForDetail)}
                      className="flex-1 py-2.5 rounded-xl bg-[#0D1F15] border border-[#1E3A2A] text-[#86935C] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      Share
                    </button>

                    <button
                      onClick={() =>
                        handleCreatePursuit(selectedObjectForDetail.title)
                      }
                      className="flex-1 py-2.5 rounded-xl bg-[#0D1F15] border border-[#1E3A2A] text-[#86935C] font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Pursue
                    </button>

                    <button
                      onClick={() => handleToggleWatch(selectedObjectForDetail)}
                      className={`flex-1 py-2.5 rounded-xl border font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer ${
                        watchedIds.has(selectedObjectForDetail.id)
                          ? 'bg-[#172D20] border-[#235F45] text-[#00FF42]'
                          : 'bg-[#0D1F15] border-[#1E3A2A] text-[#86935C]'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {watchedIds.has(selectedObjectForDetail.id) ? 'Watching' : 'Watch'}
                    </button>
                  </div>

                  {watchedIds.has(selectedObjectForDetail.id) && (
                    <p className="text-[10px] text-[#5C6B52] text-center">
                      Brief will track changes to this record. Alerts are not live yet.
                    </p>
                  )}
                </div>

                {/* Why this appeared (prompt 7). Every reason is computed
                    from real state, so none of them can be untrue. */}
                {(() => {
                  const reasons = getAppearanceReasons(selectedObjectForDetail, {
                    pursuits,
                    pursuitResults,
                    savedIds: savedIdSet,
                    watchedIds,
                    relatedToSavedIds
                  });
                  if (reasons.length === 0) return null;

                  return (
                    <details className="group">
                      <summary className="text-[10px] text-[#5C6B52] cursor-pointer list-none">
                        Why this appeared
                      </summary>
                      <div className="mt-2 space-y-1">
                        {reasons.map((r) => (
                          <p key={r.key} className="text-[10px] text-[#86935C]">
                            {r.label}
                          </p>
                        ))}
                      </div>
                    </details>
                  );
                })()}

                {/* Nearby (prompt 16). Distinct from Related: this answers
                    "what else is around here", not "what goes with this".
                    Anything already shown in Related is filtered out so the
                    two rails never duplicate each other. */}
                {(() => {
                  const shown = new Set(relatedObjects.map((r) => r.item.id));
                  const near = graph
                    .nearby(selectedObjectForDetail, 8)
                    .filter((o) => !shown.has(o.id))
                    .slice(0, 4);

                  if (near.length === 0) return null;

                  return (
                    <div className="mt-6 pt-5 border-t border-[#1E3A2A]">
                      <p className="text-[10px] font-mono uppercase text-[#00FF42]">
                        More from this area
                      </p>
                      <h3 className="text-sm font-extrabold mt-1 mb-3">Nearby</h3>

                      <div className="grid grid-cols-2 gap-2">
                        {near.map((obj) => {
                          const dist = getDistanceLabel(obj);
                          return (
                            <button
                              key={obj.id}
                              onClick={() => setSelectedObjectForDetail(obj)}
                              className="text-left bg-[#0D1F15] border border-[#1E3A2A] hover:border-[#235F45] rounded-xl p-3 cursor-pointer transition"
                            >
                              <p className="text-[9px] font-mono uppercase text-[#5C6B52]">
                                {getObjectTypeMeta(obj.type).label}
                              </p>
                              <p className="text-[11px] font-bold text-[#E2ECE5] leading-snug mt-0.5 line-clamp-2">
                                {obj.title}
                              </p>
                              {dist && (
                                <p className="text-[9px] font-mono text-[#86935C] mt-1">
                                  {dist}
                                </p>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Related */}
                {relatedObjects.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-[#1E3A2A]">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-[10px] font-mono uppercase text-[#00FF42]">
                          Continue exploring
                        </p>
                        <h3 className="text-sm font-extrabold mt-1">
                          {getRelatedHeading(
                            selectedObjectForDetail,
                            relatedObjects
                          )}
                        </h3>
                      </div>

                      <span className="text-[10px] text-[#86935C] shrink-0">
                        {relatedObjects.length} nearby
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {relatedObjects.map(({ item: related, reason }) => {
                        const chip = getReasonChip(reason);
                        const distance = getDistanceLabel(related);

                        return (
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
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="text-[9px] font-mono uppercase text-[#86935C]">
                                    {related.category}
                                  </p>
                                  {chip && (
                                    <span className="text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border border-[#235F45] text-[#00FF42]">
                                      {chip}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-extrabold mt-1 line-clamp-2 group-hover:text-[#00FF42]">
                                  {related.title}
                                </p>

                                {related.locationName && (
                                  <p className="text-[10px] text-[#8DCF74] mt-1 truncate">
                                    {related.locationName}
                                  </p>
                                )}

                                {distance && (
                                  <p className="text-[10px] font-mono text-[#86935C] mt-0.5">
                                    {distance}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
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