// SPDX-License-Identifier: AGPL-3.0-only
import "dotenv/config";
import { createDatabase } from "./connection.js";
import * as schema from "./schema/index.js";

async function seed() {
  const { db, client } = createDatabase();
  console.log("Seeding database...");

  const [org] = await db.insert(schema.organizations).values({ name: "OpenFactory Demo", slug: "openfactory-demo", settings: {} }).returning();
  const [user] = await db.insert(schema.users).values({ email: "demo@openfactory.dev", name: "Demo User", emailVerified: true }).returning();
  await db.insert(schema.organizationMembers).values({ organizationId: org!.id, userId: user!.id, role: "admin" });
  const [project] = await db.insert(schema.projects).values({ organizationId: org!.id, name: "Sample Project", slug: "sample-project", description: "A sample project for testing OpenFactory", settings: {} }).returning();
  const [authFeature] = await db.insert(schema.features).values({ projectId: project!.id, name: "Authentication", slug: "authentication", sortOrder: 0 }).returning();
  await db.insert(schema.features).values({ projectId: project!.id, name: "Dashboard", slug: "dashboard", sortOrder: 1 });
  await db.insert(schema.documents).values({ projectId: project!.id, type: "product_overview", title: "Product Overview", slug: "product-overview", content: { type: "doc", content: [{ type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Sample Project Overview" }] }] }, createdBy: user!.id });
  const [phase] = await db.insert(schema.phases).values({ projectId: project!.id, name: "Phase 1: Foundation", description: "Core infrastructure", sortOrder: 0 }).returning();
  await db.insert(schema.workOrders).values({ projectId: project!.id, phaseId: phase!.id, featureId: authFeature!.id, title: "Implement user signup flow", status: "ready", deliverableType: "feature", createdBy: user!.id });

  console.log(`Seed complete. Org: ${org!.slug}, User: ${user!.email}, Project: ${project!.slug}`);
  await client.end();
  process.exit(0);
}
seed().catch((err) => { console.error("Seed failed:", err); process.exit(1); });
