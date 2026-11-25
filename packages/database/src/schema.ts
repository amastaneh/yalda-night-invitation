import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
const times = {
  createdAt: text('created_at').notNull().default(''),
  updatedAt: text('updated_at').notNull().default(''),
};
export const events = sqliteTable('events', {
  id: text('id').primaryKey(),
  settings: text('settings').notNull(),
  ...times,
});
export const households = sqliteTable('households', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  greeting: text('greeting').notNull(),
  plusOnes: integer('plus_ones').notNull().default(0),
  revision: integer('revision').notNull().default(0),
  pomegranates: integer('pomegranates').notNull().default(0),
  ...times,
});
export const guests = sqliteTable('guests', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  kind: text('kind', { enum: ['adult', 'child'] }).notNull(),
  status: text('status', { enum: ['pending', 'attending', 'declined', 'maybe'] })
    .notNull()
    .default('pending'),
  isPlusOne: integer('is_plus_one').notNull().default(0),
  ...times,
});
export const invitationTokens = sqliteTable('invitation_tokens', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  hash: text('hash').notNull().unique(),
  revokedAt: text('revoked_at'),
  ...times,
});
export const responses = sqliteTable('rsvp_responses', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .unique()
    .references(() => households.id, { onDelete: 'cascade' }),
  dietary: text('dietary').notNull(),
  allergies: text('allergies').notNull(),
  message: text('message').notNull(),
  contact: text('contact').notNull(),
  ...times,
});
export const campaigns = sqliteTable('gift_campaigns', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  kind: text('kind', { enum: ['console', 'mystery'] }).notNull(),
  config: text('config').notNull(),
  ...times,
});
export const pledges = sqliteTable(
  'gift_pledges',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    campaignId: text('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    amountCents: integer('amount_cents').notNull(),
    receivedCents: integer('received_cents').notNull().default(0),
    ...times,
  },
  (t) => [uniqueIndex('pledges_household_campaign').on(t.householdId, t.campaignId)],
);
export const registryItems = sqliteTable('registry_items', {
  id: text('id').primaryKey(),
  eventId: text('event_id')
    .notNull()
    .references(() => events.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  unit: text('unit').notNull(),
  quantity: integer('quantity').notNull(),
  ...times,
});
export const commitments = sqliteTable(
  'registry_commitments',
  {
    id: text('id').primaryKey(),
    householdId: text('household_id')
      .notNull()
      .references(() => households.id, { onDelete: 'cascade' }),
    itemId: text('item_id')
      .notNull()
      .references(() => registryItems.id, { onDelete: 'cascade' }),
    quantity: integer('quantity').notNull(),
    ...times,
  },
  (t) => [uniqueIndex('commitment_household_item').on(t.householdId, t.itemId)],
);
export const guestbook = sqliteTable('guestbook_entries', {
  id: text('id').primaryKey(),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  message: text('message').notNull(),
  approved: integer('approved').notNull().default(0),
  ...times,
});
export const admins = sqliteTable('admin_users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  salt: text('salt').notNull(),
  passwordHash: text('password_hash').notNull(),
  ...times,
});
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  actorId: text('actor_id').notNull(),
  action: text('action').notNull(),
  resourceId: text('resource_id').notNull(),
  ...times,
});
