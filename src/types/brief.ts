export type ObjectType = 'place' | 'identity' | 'experience' | 'opportunity' | 'knowledge' | 'community' | 'product' | 'service' | 'document' | 'conversation';

export type FlowState = 'discovered' | 'engaged' | 'committed' | 'completed' | 'archived';

export type ProtocolAction = 'discover' | 'read' | 'save' | 'follow' | 'share' | 'contact' | 'book' | 'buy' | 'verify' | 'report';

export type AccessPortal = 'citizen' | 'business' | 'advocate' | 'architect';

export interface BriefObject {
  id: string;
  type: ObjectType;
  title: string;
  summary: string;
  category: string;
  location?: string;
  imageUrl?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
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

export interface Journey {
  id: string;
  title: string;
  description: string;
  steps: JourneyStep[];
  progressPercent: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface JourneyStep {
  id: string;
  title: string;
  description: string;
  isCompleted: boolean;
  order: number;
}

export interface TownHealthMetrics {
  businessesHelped: number;
  opportunitiesActedOn: number;
  knowledgeResolved: number;
  communityContributions: number;
  journeysCompleted: number;
  infoFreshnessPct: number;
}
