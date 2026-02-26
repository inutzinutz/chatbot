/* ------------------------------------------------------------------ */
/*  Learned Store — auto-learned intents, knowledge docs, sale scripts  */
/*  Populated by /api/learn when admin corrects a bot response.         */
/*                                                                      */
/*  Redis key schema (all scoped per businessId):                       */
/*    learnedintents:{biz}      → Sorted set (score=createdAt, member=id) */
/*    learnedintent:{biz}:{id}  → JSON<LearnedIntent>                   */
/*    learnedknowledge:{biz}    → Sorted set (score=createdAt, member=id) */
/*    learnedknow:{biz}:{id}    → JSON<LearnedKnowledge>                */
/*    learnedscripts:{biz}      → Sorted set (score=createdAt, member=id) */
/*    learnedscript:{biz}:{id}  → JSON<LearnedScript>                   */
/*    learnmiss:{biz}           → Sorted set (score=count, member=normQuestion) */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";
import { randomUUID } from "crypto";

// ── Types ──────────────────────────────────────────────────────────────

/** A new intent trigger learned from admin correction */
export interface LearnedIntent {
  id: string;
  businessId: string;
  /** Intent ID to add this trigger to (e.g. "em_motorcycle_service") or "new" to create a new intent */
  intentId: string;
  /** Human-readable intent name */
  intentName: string;
  /** New trigger keywords/phrases to recognise */
  triggers: string[];
  /** The bot response to use when this intent is triggered */
  responseTemplate: string;
  /** Original customer question that was missed */
  sourceQuestion: string;
  /** Admin's correct response */
  sourceAdminAnswer: string;
  /** Confidence score from GPT (0-1) */
  confidence: number;
  createdAt: number;
  /** How many times this has fired since learning */
  hitCount: number;
  enabled: boolean;
}

/** A new knowledge document learned from admin correction */
export interface LearnedKnowledge {
  id: string;
  businessId: string;
  title: string;
  content: string;
  /** Keywords that trigger this doc */
  triggers: string[];
  sourceQuestion: string;
  sourceAdminAnswer: string;
  confidence: number;
  createdAt: number;
  hitCount: number;
  enabled: boolean;
}

/** A new sale script learned from admin correction */
export interface LearnedScript {
  id: string;
  businessId: string;
  name: string;
  triggers: string[];
  adminReply: string;
  sourceQuestion: string;
  confidence: number;
  createdAt: number;
  hitCount: number;
  enabled: boolean;
}

/** Stats about missed/unanswered questions */
export interface MissEntry {
  normalizedQuestion: string;
  count: number;
  examples: string[];   // up to 5 actual customer messages
  lastSeenAt: number;
}

// ── Redis singleton ────────────────────────────────────────────────────

function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  const g = globalThis as unknown as { __redis?: Redis | null };
  if (!("__redis" in g)) {
    const client = new Redis(url, {
      maxRetriesPerRequest: 3,
      connectTimeout: 5000,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 1000);
      },
    });
    client.on("error", (e) => console.error("[learnedStore] Redis:", e.message));
    g.__redis = client;
  }
  return g.__redis ?? null;
}

async function getJSON<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key, JSON.stringify(value));
}

// TTL: 180 days for learned entries
const TTL = 180 * 24 * 60 * 60;

// ── LearnedStore class ─────────────────────────────────────────────────

class LearnedStore {

  // ── Learned Intents ──────────────────────────────────────────────────

  async saveLearnedIntent(intent: Omit<LearnedIntent, "id" | "hitCount" | "createdAt">): Promise<LearnedIntent> {
    const redis = getRedis();
    const full: LearnedIntent = {
      ...intent,
      id: randomUUID(),
      hitCount: 0,
      createdAt: Date.now(),
    };
    const key = `learnedintent:${intent.businessId}:${full.id}`;
    await setJSON(key, full);
    if (redis) {
      await redis.expire(key, TTL);
      await redis.zadd(`learnedintents:${intent.businessId}`, full.createdAt, full.id);
    }
    return full;
  }

  async getLearnedIntents(businessId: string): Promise<LearnedIntent[]> {
    const redis = getRedis();
    if (!redis) return [];
    const ids = await redis.zrange(`learnedintents:${businessId}`, 0, -1, "REV");
    if (!ids.length) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(`learnedintent:${businessId}:${id}`);
    const results = await pipeline.exec();
    if (!results) return [];
    return results
      .map(([, raw]) => {
        if (!raw || typeof raw !== "string") return null;
        try { return JSON.parse(raw) as LearnedIntent; } catch { return null; }
      })
      .filter((x): x is LearnedIntent => x !== null && x.enabled);
  }

  async incrementIntentHit(businessId: string, id: string): Promise<void> {
    const key = `learnedintent:${businessId}:${id}`;
    const item = await getJSON<LearnedIntent>(key);
    if (item) {
      item.hitCount++;
      await setJSON(key, item);
    }
  }

  async toggleLearnedIntent(businessId: string, id: string, enabled: boolean): Promise<void> {
    const key = `learnedintent:${businessId}:${id}`;
    const item = await getJSON<LearnedIntent>(key);
    if (item) { item.enabled = enabled; await setJSON(key, item); }
  }

  async deleteLearnedIntent(businessId: string, id: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`learnedintent:${businessId}:${id}`);
    await redis.zrem(`learnedintents:${businessId}`, id);
  }

  // ── Learned Knowledge Docs ───────────────────────────────────────────

  async saveLearnedKnowledge(doc: Omit<LearnedKnowledge, "id" | "hitCount" | "createdAt">): Promise<LearnedKnowledge> {
    const redis = getRedis();
    const full: LearnedKnowledge = {
      ...doc,
      id: randomUUID(),
      hitCount: 0,
      createdAt: Date.now(),
    };
    const key = `learnedknow:${doc.businessId}:${full.id}`;
    await setJSON(key, full);
    if (redis) {
      await redis.expire(key, TTL);
      await redis.zadd(`learnedknowledge:${doc.businessId}`, full.createdAt, full.id);
    }
    return full;
  }

  async getLearnedKnowledge(businessId: string): Promise<LearnedKnowledge[]> {
    const redis = getRedis();
    if (!redis) return [];
    const ids = await redis.zrange(`learnedknowledge:${businessId}`, 0, -1, "REV");
    if (!ids.length) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(`learnedknow:${businessId}:${id}`);
    const results = await pipeline.exec();
    if (!results) return [];
    return results
      .map(([, raw]) => {
        if (!raw || typeof raw !== "string") return null;
        try { return JSON.parse(raw) as LearnedKnowledge; } catch { return null; }
      })
      .filter((x): x is LearnedKnowledge => x !== null && x.enabled);
  }

  async incrementKnowledgeHit(businessId: string, id: string): Promise<void> {
    const key = `learnedknow:${businessId}:${id}`;
    const item = await getJSON<LearnedKnowledge>(key);
    if (item) { item.hitCount++; await setJSON(key, item); }
  }

  async toggleLearnedKnowledge(businessId: string, id: string, enabled: boolean): Promise<void> {
    const key = `learnedknow:${businessId}:${id}`;
    const item = await getJSON<LearnedKnowledge>(key);
    if (item) { item.enabled = enabled; await setJSON(key, item); }
  }

  async deleteLearnedKnowledge(businessId: string, id: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`learnedknow:${businessId}:${id}`);
    await redis.zrem(`learnedknowledge:${businessId}`, id);
  }

  // ── Learned Sale Scripts ─────────────────────────────────────────────

  async saveLearnedScript(script: Omit<LearnedScript, "id" | "hitCount" | "createdAt">): Promise<LearnedScript> {
    const redis = getRedis();
    const full: LearnedScript = {
      ...script,
      id: randomUUID(),
      hitCount: 0,
      createdAt: Date.now(),
    };
    const key = `learnedscript:${script.businessId}:${full.id}`;
    await setJSON(key, full);
    if (redis) {
      await redis.expire(key, TTL);
      await redis.zadd(`learnedscripts:${script.businessId}`, full.createdAt, full.id);
    }
    return full;
  }

  async getLearnedScripts(businessId: string): Promise<LearnedScript[]> {
    const redis = getRedis();
    if (!redis) return [];
    const ids = await redis.zrange(`learnedscripts:${businessId}`, 0, -1, "REV");
    if (!ids.length) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(`learnedscript:${businessId}:${id}`);
    const results = await pipeline.exec();
    if (!results) return [];
    return results
      .map(([, raw]) => {
        if (!raw || typeof raw !== "string") return null;
        try { return JSON.parse(raw) as LearnedScript; } catch { return null; }
      })
      .filter((x): x is LearnedScript => x !== null && x.enabled);
  }

  async incrementScriptHit(businessId: string, id: string): Promise<void> {
    const key = `learnedscript:${businessId}:${id}`;
    const item = await getJSON<LearnedScript>(key);
    if (item) { item.hitCount++; await setJSON(key, item); }
  }

  async toggleLearnedScript(businessId: string, id: string, enabled: boolean): Promise<void> {
    const key = `learnedscript:${businessId}:${id}`;
    const item = await getJSON<LearnedScript>(key);
    if (item) { item.enabled = enabled; await setJSON(key, item); }
  }

  async deleteLearnedScript(businessId: string, id: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    await redis.del(`learnedscript:${businessId}:${id}`);
    await redis.zrem(`learnedscripts:${businessId}`, id);
  }

  // ── Miss Tracker ─────────────────────────────────────────────────────
  // Track questions the bot couldn't answer well (reached L15 or was corrected)

  async trackMiss(businessId: string, question: string): Promise<void> {
    const redis = getRedis();
    if (!redis) return;
    const norm = question.toLowerCase().replace(/\s+/g, " ").trim().slice(0, 100);
    const setKey = `learnmiss:${businessId}`;
    const detailKey = `learnmissdetail:${businessId}:${norm}`;

    // Increment count in sorted set
    await redis.zincrby(setKey, 1, norm);

    // Store/update detail entry
    const existing = await getJSON<MissEntry>(detailKey);
    const entry: MissEntry = existing ?? {
      normalizedQuestion: norm,
      count: 0,
      examples: [],
      lastSeenAt: 0,
    };
    entry.count++;
    entry.lastSeenAt = Date.now();
    if (!entry.examples.includes(question) && entry.examples.length < 5) {
      entry.examples.push(question);
    }
    await setJSON(detailKey, entry);
    await redis.expire(detailKey, 90 * 24 * 60 * 60); // 90 days
  }

  async getTopMisses(businessId: string, limit = 20): Promise<MissEntry[]> {
    const redis = getRedis();
    if (!redis) return [];
    // zrange REV to get highest count first
    const members = await redis.zrange(`learnmiss:${businessId}`, 0, limit - 1, "REV");
    if (!members.length) return [];
    const results: MissEntry[] = [];
    for (const norm of members) {
      const detail = await getJSON<MissEntry>(`learnmissdetail:${businessId}:${norm}`);
      if (detail) results.push(detail);
    }
    return results;
  }

  // ── Get all learned data (for pipeline injection) ────────────────────

  async getAllLearnedData(businessId: string): Promise<{
    intents: LearnedIntent[];
    knowledge: LearnedKnowledge[];
    scripts: LearnedScript[];
  }> {
    const [intents, knowledge, scripts] = await Promise.all([
      this.getLearnedIntents(businessId),
      this.getLearnedKnowledge(businessId),
      this.getLearnedScripts(businessId),
    ]);
    return { intents, knowledge, scripts };
  }

  // ── Get stats for dashboard ──────────────────────────────────────────

  async getStats(businessId: string): Promise<{
    totalIntents: number;
    totalKnowledge: number;
    totalScripts: number;
    totalMissTypes: number;
    topMisses: MissEntry[];
  }> {
    const redis = getRedis();
    if (!redis) return { totalIntents: 0, totalKnowledge: 0, totalScripts: 0, totalMissTypes: 0, topMisses: [] };

    const [intentsCount, knowledgeCount, scriptsCount, missCount, topMisses] = await Promise.all([
      redis.zcard(`learnedintents:${businessId}`),
      redis.zcard(`learnedknowledge:${businessId}`),
      redis.zcard(`learnedscripts:${businessId}`),
      redis.zcard(`learnmiss:${businessId}`),
      this.getTopMisses(businessId, 10),
    ]);

    return {
      totalIntents: intentsCount,
      totalKnowledge: knowledgeCount,
      totalScripts: scriptsCount,
      totalMissTypes: missCount,
      topMisses,
    };
  }
}

// ── Singleton export ───────────────────────────────────────────────────

const g = globalThis as unknown as { __learnedStore?: LearnedStore };
if (!g.__learnedStore) g.__learnedStore = new LearnedStore();
export const learnedStore = g.__learnedStore;
