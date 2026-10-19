import {
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
  integer,
  boolean,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// Multi-tenant organizations
export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  plan: varchar("plan", { length: 50 }).notNull().default("demo"), // demo | pro (see src/lib/config.ts)
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Users belong to an organization
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: varchar("email", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: varchar("role", { length: 30 }).notNull().default("viewer"), // viewer | analyst | manager | admin
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Reusable import profiles — the big differentiator
export const importProfiles = pgTable("import_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  sourceSystem: varchar("source_system", { length: 100 }), // e.g., "Genesys Cloud", "Avaya", "Five9", "NICE", "Excel"
  sourceType: varchar("source_type", { length: 50 }).notNull(), // forecast | actual | schedule | adherence | agent
  columnMappings: jsonb("column_mappings").notNull(), // { fileColumn: canonicalField }
  sampleHeaders: jsonb("sample_headers").$type<string[]>(),
  delimiter: varchar("delimiter", { length: 5 }).default(","),
  encoding: varchar("encoding", { length: 20 }).default("utf-8"),
  notes: text("notes"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Saved report views / filters
export const savedViews = pgTable("saved_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  page: varchar("page", { length: 100 }).notNull(), // intraday | forecast | reports
  filters: jsonb("filters").notNull(),
  columns: jsonb("columns").$type<string[]>(),
  sortBy: varchar("sort_by", { length: 100 }),
  sortDir: varchar("sort_dir", { length: 4 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// Uploaded data source metadata (raw data processed client-side for MVP; this is audit trail)
export const dataSources = pgTable("data_sources", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  filename: varchar("filename", { length: 255 }).notNull(),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  profileId: uuid("profile_id").references(() => importProfiles.id),
  rowCount: integer("row_count"),
  intervalCount: integer("interval_count"),
  dateRangeStart: timestamp("date_range_start", { withTimezone: true }),
  dateRangeEnd: timestamp("date_range_end", { withTimezone: true }),
  qualityScore: integer("quality_score"),
  qualityIssues: jsonb("quality_issues").$type<
    Array<{
      severity: "error" | "warning" | "info";
      code: string;
      message: string;
      rowCount?: number;
    }>
  >(),
  columnsDetected: jsonb("columns_detected").$type<string[]>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(sql`now()`),
  createdBy: uuid("created_by").references(() => users.id),
});

export type Organization = typeof organizations.$inferSelect;
export type User = typeof users.$inferSelect;
export type ImportProfile = typeof importProfiles.$inferSelect;
export type SavedView = typeof savedViews.$inferSelect;
export type DataSource = typeof dataSources.$inferSelect;
