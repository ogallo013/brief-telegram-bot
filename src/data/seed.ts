import { BriefObject, Journey, TownHealthMetrics } from '../types/brief';

export const INITIAL_OBJECTS: BriefObject[] = [
  {
    id: 'plc_maji_mazuri',
    type: 'place',
    title: 'Maji Mazuri Market',
    summary: 'A bustling local market serving fresh produce and household goods.',
    category: 'market',
    location: 'Nairobi CBD',
    imageUrl: '',
    tags: ['market', 'food'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'knw_permit_guide',
    type: 'knowledge',
    title: 'Permit Guide',
    summary: 'Step-by-step guide to business permits in Nairobi.',
    category: 'guide',
    location: 'Nairobi',
    imageUrl: '',
    tags: ['guide', 'permits'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'srv_health_inspection',
    type: 'service',
    title: 'Health Inspection Service',
    summary: 'Book an inspection for your food stall or shop.',
    category: 'service',
    location: 'Nairobi',
    imageUrl: '',
    tags: ['health', 'inspection'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_JOURNEYS: Journey[] = [
  {
    id: 'journey_1',
    title: 'Start a Street Food Stall',
    description: 'Steps to get your stall up and running legally and safely.',
    steps: [
      { id: 'step_1', title: 'Find location', description: 'Scout market stalls and spaces', isCompleted: false, order: 1 },
      { id: 'step_2', title: 'Get permits', description: 'Apply for required permits', isCompleted: false, order: 2 },
      { id: 'step_3', title: 'Health inspection', description: 'Schedule inspection', isCompleted: false, order: 3 },
    ],
    progressPercent: 0,
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export const INITIAL_TOWN_HEALTH: TownHealthMetrics = {
  businessesHelped: 0,
  opportunitiesActedOn: 0,
  knowledgeResolved: 0,
  communityContributions: 0,
  journeysCompleted: 0,
  infoFreshnessPct: 80,
};
