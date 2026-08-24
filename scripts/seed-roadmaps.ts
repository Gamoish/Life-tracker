/**
 * Re-runnable roadmap seeder.
 *
 * Reads every JSON file in seeds/roadmaps/ and upserts it:
 *   - roadmaps          upsert on `slug`
 *   - group rows        upsert on (roadmap_id, parent_id=NULL, title)
 *   - topic rows        upsert on (roadmap_id, parent_id=<group>, title)
 *
 * Deliberately does NOT touch `status` on conflict — re-seeding must never wipe
 * progress you've already made. Only the authored fields (kind, sort order,
 * resource link) get refreshed.
 */
import "dotenv/config";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { roadmaps, roadmapTopics } from "../src/db/schema.js";
import { sslConfigFor } from "../src/db/ssl.js";

type TopicKind = "core" | "recommended" | "alternative" | "optional";

type SeedTopic = {
  title: string;
  kind?: TopicKind;
  /** `resource_link` is accepted as an alias for hand-written older files. */
  link?: string | null;
  resource_link?: string | null;
};

const linkOf = (t: SeedTopic) => t.link ?? t.resource_link ?? null;

type SeedGroup = {
  title: string;
  kind?: TopicKind;
  topics: SeedTopic[];
};

type SeedRoadmap = {
  slug: string;
  name: string;
  groups: SeedGroup[];
};

const SEED_DIR = path.resolve(process.cwd(), "seeds", "roadmaps");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pool = new Pool({ connectionString, max: 1, ssl: sslConfigFor(connectionString) });
const db = drizzle(pool);

async function seedFile(file: string) {
  const raw = await readFile(path.join(SEED_DIR, file), "utf8");
  const data = JSON.parse(raw) as SeedRoadmap;

  if (!data.slug || !data.name || !Array.isArray(data.groups)) {
    throw new Error(`${file}: expected { slug, name, groups[] }`);
  }

  const [roadmap] = await db
    .insert(roadmaps)
    .values({ slug: data.slug, name: data.name })
    .onConflictDoUpdate({ target: roadmaps.slug, set: { name: data.name } })
    .returning();

  let groupCount = 0;
  let topicCount = 0;

  for (const [groupIndex, group] of data.groups.entries()) {
    const [groupRow] = await db
      .insert(roadmapTopics)
      .values({
        roadmapId: roadmap.id,
        parentId: null,
        title: group.title,
        kind: group.kind ?? "core",
        sortOrder: groupIndex,
      })
      .onConflictDoUpdate({
        target: [roadmapTopics.roadmapId, roadmapTopics.parentId, roadmapTopics.title],
        set: { kind: group.kind ?? "core", sortOrder: groupIndex },
      })
      .returning();

    groupCount += 1;

    for (const [topicIndex, topic] of (group.topics ?? []).entries()) {
      await db
        .insert(roadmapTopics)
        .values({
          roadmapId: roadmap.id,
          parentId: groupRow.id,
          title: topic.title,
          kind: topic.kind ?? "core",
          sortOrder: topicIndex,
          resourceLink: linkOf(topic),
        })
        .onConflictDoUpdate({
          target: [roadmapTopics.roadmapId, roadmapTopics.parentId, roadmapTopics.title],
          set: {
            kind: topic.kind ?? "core",
            sortOrder: topicIndex,
            resourceLink: linkOf(topic),
          },
        });

      topicCount += 1;
    }
  }

  console.log(`  ${data.slug}: ${groupCount} groups, ${topicCount} topics`);
}

try {
  const files = (await readdir(SEED_DIR)).filter((f) => f.endsWith(".json")).sort();

  if (files.length === 0) {
    console.log(`no .json files in ${SEED_DIR}`);
  } else {
    console.log(`seeding ${files.length} roadmap file(s) from ${SEED_DIR}`);
    for (const file of files) await seedFile(file);
    console.log("seed complete");
  }
} catch (err) {
  console.error("seed failed:", err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
