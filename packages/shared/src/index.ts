import { z } from 'zod';
// The static site and Workers do not permit runtime code generation.
z.config({ jitless: true });

export const statusSchema = z.enum(['pending', 'attending', 'declined', 'maybe']);
export type Attendance = z.infer<typeof statusSchema>;
export const featuresSchema = z.object({
  gifts: z.boolean(),
  pomegranate: z.boolean(),
  feast: z.boolean(),
  mystery: z.boolean(),
  hafez: z.boolean(),
  guestbook: z.boolean(),
  card: z.boolean(),
});
const safeUrl = z
  .string()
  .max(2000)
  .refine((v) => {
    if (v === '') return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password;
    } catch {
      return false;
    }
  }, 'Use an HTTPS URL');
export const eventSchema = z
  .object({
    title: z.string().min(1).max(120),
    description: z.string().max(1000),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    deadline: z.iso.datetime(),
    venue: z.string().max(200),
    address: z.string().max(500),
    parking: z.string().max(500),
    entrance: z.string().max(500),
    dressCode: z.string().max(200),
    host: z.string().max(150),
    contact: z.string().max(200),
    heroUrl: safeUrl,
    status: z.enum(['open', 'closed', 'archived']),
    features: featuresSchema,
    pomegranateMultiplier: z.number().int().min(0).max(20),
    pomegranateMax: z.number().int().min(0).max(500),
  })
  .refine((e) => Date.parse(e.endsAt) > Date.parse(e.startsAt), 'End must follow start')
  .refine((e) => Date.parse(e.deadline) <= Date.parse(e.startsAt), 'Deadline must precede start');
export type EventSettings = z.infer<typeof eventSchema>;
export const memberSchema = z.object({
  id: z.uuid().optional(),
  name: z.string().trim().min(1).max(100),
  kind: z.enum(['adult', 'child']),
  status: statusSchema.default('pending'),
});
export const householdSchema = z.object({
  name: z.string().trim().min(1).max(120),
  greeting: z.string().max(300),
  plusOnes: z.number().int().min(0).max(5),
  members: z.array(memberSchema).min(1).max(20),
});
export const rsvpSchema = z.object({
  requestId: z.uuid(),
  revision: z.number().int().min(0),
  members: z
    .array(z.object({ id: z.uuid(), status: statusSchema }))
    .min(1)
    .max(25),
  dietary: z.string().max(1000),
  allergies: z.string().max(1000),
  message: z.string().max(2000),
  contact: z.string().max(200),
});
export const campaignSchema = z.object({
  name: z.string().min(1).max(150),
  product: z.string().max(200),
  consoleType: z.string().max(100),
  imageUrl: safeUrl,
  targetCents: z.number().int().min(100).max(10000000),
  purchaseUrl: safeUrl,
  enabled: z.boolean(),
  milestones: z
    .array(
      z.object({ percent: z.number().int().min(1).max(100), label: z.string().min(1).max(100) }),
    )
    .max(10),
});
export const pledgeSchema = z.object({
  campaignId: z.uuid(),
  amountCents: z.number().int().min(0).max(1000000),
});
export const commitmentSchema = z.object({
  itemId: z.uuid(),
  quantity: z.number().int().min(0).max(500),
});
export interface Member {
  id: string;
  name: string;
  kind: 'adult' | 'child';
  status: Attendance;
  isPlusOne: number;
}
export interface Campaign {
  id: string;
  kind: 'console' | 'mystery';
  config: z.infer<typeof campaignSchema>;
  receivedCents: number;
  promisedCents?: number;
}
export interface RegistryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  committed: number;
  mine: number;
}
export interface InvitationData {
  eventId: string;
  event: EventSettings;
  household: {
    id: string;
    name: string;
    greeting: string;
    plusOnes: number;
    revision: number;
    pomegranates: number;
  };
  members: Member[];
  response: { dietary: string; allergies: string; message: string; contact: string };
  attending: number;
  campaigns: Campaign[];
  pledges: { campaignId: string; amountCents: number; receivedCents: number }[];
  registry: RegistryItem[];
  guestbook: { id: string; message: string }[];
}
export {
  money,
  number,
  dateLabel,
  timeLabel,
  foldICS,
  calendarICS,
  calendarLinks,
  progress,
  csvCell,
} from './format';
