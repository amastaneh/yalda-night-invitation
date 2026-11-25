import type { Attendance } from '../../../../../packages/shared/src';
export type EventRow = { id: string; settings: string };
export type Household = {
  id: string;
  eventId: string;
  name: string;
  greeting: string;
  plusOnes: number;
  revision: number;
  pomegranates: number;
};
export type Guest = {
  id: string;
  household_id: string;
  name: string;
  kind: 'adult' | 'child';
  status: Attendance;
};
export type Pledge = {
  id: string;
  household_name: string;
  campaign_config: string;
  campaign_id: string;
  amount_cents: number;
  received_cents: number;
};
export type Registry = {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  committed: number;
};
export type CampaignRow = { id: string; kind: 'console' | 'mystery'; config: string };
export type BookEntry = { id: string; household_name: string; message: string; approved: number };
export type ResponseRow = {
  household_id: string;
  dietary: string;
  allergies: string;
  contact: string;
  message: string;
};
export type Overview = {
  commitments: {
    id: string;
    quantity: number;
    household_name: string;
    item_name: string;
    unit: string;
  }[];
  households: Household[];
  members: Guest[];
  pledges: Pledge[];
  registry: Registry[];
  campaigns: CampaignRow[];
  guestbook: BookEntry[];
  responses: ResponseRow[];
  audit: { action: string; resource_id: string; created_at: string }[];
};
export type Section = 'overview' | 'households' | 'gifts' | 'guestbook' | 'settings';
