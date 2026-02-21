/* ------------------------------------------------------------------ */
/*  Chat Store — Redis storage for live chat conversations              */
/*  Shared across all Vercel serverless functions via external Redis    */
/*                                                                      */
/*  Env var (auto-injected by Vercel Marketplace → Redis):             */
/*    REDIS_URL                                                         */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";

// ── Types ──

/**
 * LINE channel runtime settings — persisted in Redis so the webhook
 * can read them without relying on browser localStorage.
 */
export interface LineChannelSettings {
  welcomeMessage: string;       // sent on LINE "follow" event
  autoReply: boolean;           // global auto-reply flag (mirrors Redis globalbot but settable via UI)
  responseDelaySec: number;     // seconds to wait before replying (0 = instant)
  offlineMessage: string;       // sent to customer when bot is disabled
  richMenuEnabled: boolean;     // whether a rich menu should be linked
  richMenuId: string;           // LINE rich menu ID (richmenu-xxx)
  useReplyApi: boolean;         // currently always true; reserved for future Push API switch
  businessHours: {
    enabled: boolean;
    timezone: string;
    schedule: { day: string; open: string; close: string; active: boolean }[];
  };
}

export interface ChatConversation {
  userId: string;
  businessId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  lastMessage: string;
  lastMessageAt: number;
  lastMessageRole: "customer" | "bot" | "admin";
  unreadCount: number;
  botEnabled: boolean;
  source: "line" | "web";
  createdAt: number;
  pinned?: boolean;
  pinnedAt?: number;
  pinnedReason?: string;
}

export interface ChatMessage {
  id: string;
  role: "customer" | "bot" | "admin";
  content: string;
  timestamp: number;
  pipelineLayer?: number;
  pipelineLayerName?: string;
  /** Username of the admin who sent this message (populated for role="admin" only) */
  sentBy?: string;
}

/**
 * Admin activity log entry — one record per admin action.
 * Stored in a Redis sorted set: adminlog:{businessId} (score = timestamp)
 * and as individual keys: adminlogentry:{businessId}:{id}
 */
export interface AdminActivityEntry {
  id: string;
  businessId: string;
  username: string;
  action: "send" | "toggleBot" | "pin" | "unpin" | "globalToggleBot" | "sendFollowup";
  userId: string;          // LINE/web userId the action was performed on
  displayName?: string;    // customer display name at time of action
  detail: string;          // short human-readable description
  timestamp: number;
}

export interface FollowUpResult {
  needsFollowup: boolean;
  reason: string;
  suggestedMessage: string;
  priority: "high" | "medium" | "low";
  category: "unanswered" | "purchase_intent" | "support_pending" | "cold_lead" | "completed";
  displayName: string;
  lastMessageAt: number;
  analyzedAt: number;
}

// ── Redis client singleton (reused across warm invocations) ──

function createRedis(): Redis {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("[chatStore] Missing REDIS_URL env var.");
    // Return a dummy — will throw on first actual use
    return new Redis({ lazyConnect: true });
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 3,
    connectTimeout: 5000,
    // Disable reconnect in serverless — each invocation gets fresh connection if needed
    retryStrategy(times) {
      if (times > 3) return null; // stop retrying
      return Math.min(times * 200, 1000);
    },
  });

  client.on("error", (err) => {
    console.error("[chatStore] Redis error:", err.message);
  });

  return client;
}

const g = globalThis as unknown as { __redis?: Redis };
if (!g.__redis) g.__redis = createRedis();
const redis = g.__redis;

// ── Key helpers ──
// conv:{businessId}:{userId}     → JSON string of ChatConversation
// convs:{businessId}             → Sorted set (member=userId, score=lastMessageAt)
// msgs:{businessId}:{userId}     → List of JSON strings (ChatMessage)

function convKey(biz: string, uid: string) {
  return `conv:${biz}:${uid}`;
}
function convsKey(biz: string) {
  return `convs:${biz}`;
}
function msgsKey(biz: string, uid: string) {
  return `msgs:${biz}:${uid}`;
}

// ── JSON helpers (ioredis stores/returns strings) ──

async function getJSON<T>(key: string): Promise<T | null> {
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  await redis.set(key, JSON.stringify(value));
}

// ── Chat Store (async API) ──

class ChatStore {
  /** Get or create a conversation */
  async getOrCreateConversation(
    businessId: string,
    userId: string,
    opts?: {
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
      source?: "line" | "web";
    }
  ): Promise<ChatConversation> {
    const ck = convKey(businessId, userId);
    const existing = await getJSON<ChatConversation>(ck);

    if (existing) {
      let updated = false;
      if (opts?.displayName && opts.displayName !== existing.displayName) {
        existing.displayName = opts.displayName;
        updated = true;
      }
      if (opts?.pictureUrl && opts.pictureUrl !== existing.pictureUrl) {
        existing.pictureUrl = opts.pictureUrl;
        updated = true;
      }
      if (opts?.statusMessage && opts.statusMessage !== existing.statusMessage) {
        existing.statusMessage = opts.statusMessage;
        updated = true;
      }
      if (updated) {
        await setJSON(ck, existing);
      }
      return existing;
    }

    // Create new
    const conv: ChatConversation = {
      userId,
      businessId,
      displayName: opts?.displayName || userId.slice(0, 12) + "...",
      pictureUrl: opts?.pictureUrl,
      statusMessage: opts?.statusMessage,
      lastMessage: "",
      lastMessageAt: Date.now(),
      lastMessageRole: "customer",
      unreadCount: 0,
      botEnabled: true,
      source: opts?.source || "line",
      createdAt: Date.now(),
    };
    await setJSON(ck, conv);
    await redis.zadd(convsKey(businessId), conv.lastMessageAt, userId);
    return conv;
  }

  /** Add a message to a conversation */
  async addMessage(
    businessId: string,
    userId: string,
    msg: Omit<ChatMessage, "id">
  ): Promise<ChatMessage> {
    const fullMsg: ChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };

    // Append to message list
    const mk = msgsKey(businessId, userId);
    await redis.rpush(mk, JSON.stringify(fullMsg));

    // Trim to last 500 messages
    const len = await redis.llen(mk);
    if (len > 500) {
      await redis.ltrim(mk, len - 500, -1);
    }

    // Update conversation metadata
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.lastMessage = msg.content.slice(0, 100);
      conv.lastMessageAt = msg.timestamp;
      conv.lastMessageRole = msg.role;
      if (msg.role === "customer") {
        conv.unreadCount++;
      }
      await setJSON(ck, conv);
      // Update sorted set score
      await redis.zadd(convsKey(businessId), msg.timestamp, userId);
    }

    return fullMsg;
  }

  /** Get all messages for a conversation */
  async getMessages(businessId: string, userId: string): Promise<ChatMessage[]> {
    const raw = await redis.lrange(msgsKey(businessId, userId), 0, -1);
    return raw.map((item) => {
      try {
        return JSON.parse(item) as ChatMessage;
      } catch {
        return null;
      }
    }).filter((m): m is ChatMessage => m !== null);
  }

  /** Get all conversations for a business, sorted by most recent */
  async getConversations(businessId: string): Promise<ChatConversation[]> {
    // Get all userIds from sorted set, most recent first (REV)
    const userIds = await redis.zrange(convsKey(businessId), 0, -1, "REV");

    if (!userIds || userIds.length === 0) return [];

    // Fetch all conversation objects via pipeline
    const pipeline = redis.pipeline();
    for (const uid of userIds) {
      pipeline.get(convKey(businessId, uid));
    }
    const results = await pipeline.exec();

    if (!results) return [];

    const convs: ChatConversation[] = [];
    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try {
        const conv = JSON.parse(raw as string) as ChatConversation;
        convs.push(conv);
      } catch {
        // skip malformed
      }
    }
    return convs;
  }

  /** Toggle bot auto-reply for a conversation */
  async toggleBot(
    businessId: string,
    userId: string,
    enabled: boolean
  ): Promise<boolean> {
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.botEnabled = enabled;
      await setJSON(ck, conv);
      return true;
    }
    return false;
  }

  /** Check if bot is enabled for a conversation */
  async isBotEnabled(businessId: string, userId: string): Promise<boolean> {
    const conv = await getJSON<ChatConversation>(convKey(businessId, userId));
    return conv?.botEnabled ?? true; // Default: bot enabled
  }

  /** Mark conversation as read (reset unread count) */
  async markRead(businessId: string, userId: string): Promise<void> {
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.unreadCount = 0;
      await setJSON(ck, conv);
    }
  }

  /** Get total unread count across all conversations for a business */
  async getTotalUnread(businessId: string): Promise<number> {
    const convs = await this.getConversations(businessId);
    return convs.reduce((sum, c) => sum + c.unreadCount, 0);
  }

  /** Delete a conversation and its messages */
  async deleteConversation(businessId: string, userId: string): Promise<void> {
    await redis.del(convKey(businessId, userId));
    await redis.del(msgsKey(businessId, userId));
    await redis.zrem(convsKey(businessId), userId);
  }

  // ── Conversation Pinning ──

  /** Pin a conversation (auto-disables bot) */
  async pinConversation(
    businessId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.pinned = true;
      conv.pinnedAt = Date.now();
      conv.pinnedReason = reason;
      conv.botEnabled = false; // Auto-disable bot when pinned
      await setJSON(ck, conv);
    }
  }

  /** Unpin a conversation (does NOT auto-enable bot) */
  async unpinConversation(businessId: string, userId: string): Promise<void> {
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.pinned = false;
      conv.pinnedAt = undefined;
      conv.pinnedReason = undefined;
      await setJSON(ck, conv);
    }
  }

  // ── Global Bot Toggle (per business) ──
  // Key: globalbot:{businessId} → "1" (enabled) or "0" (disabled)

  /** Set global bot on/off for entire business */
  async setGlobalBotEnabled(businessId: string, enabled: boolean): Promise<void> {
    await redis.set(`globalbot:${businessId}`, enabled ? "1" : "0");
  }

  /** Check if global bot is enabled for a business (default: enabled) */
  async isGlobalBotEnabled(businessId: string): Promise<boolean> {
    const val = await redis.get(`globalbot:${businessId}`);
    return val !== "0"; // Default: enabled (null or "1")
  }

  // ── Follow-up Agent ──
  // Key: followup:{businessId}:{userId} → JSON<FollowUpResult>
  // Key: followups:{businessId}          → Sorted set (score = analyzedAt)

  async setFollowUp(
    businessId: string,
    userId: string,
    data: FollowUpResult
  ): Promise<void> {
    const key = `followup:${businessId}:${userId}`;
    await setJSON(key, data);
    // Auto-expire after 7 days
    await redis.expire(key, 60 * 60 * 24 * 7);
    await redis.zadd(`followups:${businessId}`, data.analyzedAt, userId);
  }

  async getFollowUp(
    businessId: string,
    userId: string
  ): Promise<FollowUpResult | null> {
    return getJSON<FollowUpResult>(`followup:${businessId}:${userId}`);
  }

  async getAllFollowUps(businessId: string): Promise<(FollowUpResult & { userId: string })[]> {
    const userIds = await redis.zrange(`followups:${businessId}`, 0, -1, "REV");
    if (!userIds || userIds.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const uid of userIds) {
      pipeline.get(`followup:${businessId}:${uid}`);
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const followups: (FollowUpResult & { userId: string })[] = [];
    for (let i = 0; i < results.length; i++) {
      const [err, raw] = results[i];
      if (err || !raw) continue;
      try {
        const data = JSON.parse(raw as string) as FollowUpResult;
        if (data.needsFollowup) {
          followups.push({ ...data, userId: userIds[i] });
        }
      } catch { /* skip */ }
    }
    return followups;
  }

  async clearFollowUp(businessId: string, userId: string): Promise<void> {
    await redis.del(`followup:${businessId}:${userId}`);
    await redis.zrem(`followups:${businessId}`, userId);
  }

  // ── LINE Channel Settings (persisted per business) ──
  // Key: linesettings:{businessId} → JSON<LineChannelSettings>
  // Stored server-side so the webhook can read them at runtime.

  async getLineSettings(businessId: string): Promise<LineChannelSettings | null> {
    return getJSON<LineChannelSettings>(`linesettings:${businessId}`);
  }

  async setLineSettings(businessId: string, settings: LineChannelSettings): Promise<void> {
    await setJSON(`linesettings:${businessId}`, settings);
  }

  // ── Admin Activity Log ──
  // Sorted set: adminlog:{businessId}  score=timestamp  member=entryId
  // Entry key:  adminlogentry:{businessId}:{entryId}    value=JSON

  async logAdminActivity(entry: Omit<AdminActivityEntry, "id">): Promise<void> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const full: AdminActivityEntry = { ...entry, id };
    const entryKey = `adminlogentry:${entry.businessId}:${id}`;
    await setJSON(entryKey, full);
    await redis.expire(entryKey, 60 * 60 * 24 * 90); // keep 90 days
    await redis.zadd(`adminlog:${entry.businessId}`, entry.timestamp, id);
    // Trim to last 5000 entries
    await redis.zremrangebyrank(`adminlog:${entry.businessId}`, 0, -5001);
  }

  async getAdminActivityLog(
    businessId: string,
    opts?: { limit?: number; offset?: number; username?: string }
  ): Promise<AdminActivityEntry[]> {
    const limit = opts?.limit ?? 100;
    const offset = opts?.offset ?? 0;
    // Most recent first (REV)
    const ids = await redis.zrange(
      `adminlog:${businessId}`,
      offset,
      offset + limit - 1,
      "REV"
    );
    if (!ids || ids.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.get(`adminlogentry:${businessId}:${id}`);
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const entries: AdminActivityEntry[] = [];
    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try {
        const entry = JSON.parse(raw as string) as AdminActivityEntry;
        if (!opts?.username || entry.username === opts.username) {
          entries.push(entry);
        }
      } catch { /* skip */ }
    }
    return entries;
  }

  async getAdminStats(
    businessId: string,
    since?: number
  ): Promise<Record<string, { sent: number; toggleBot: number; pin: number; lastActive: number }>> {
    // Pull last 1000 entries for stats
    const ids = await redis.zrange(`adminlog:${businessId}`, 0, 999, "REV");
    if (!ids || ids.length === 0) return {};

    const pipeline = redis.pipeline();
    for (const id of ids) {
      pipeline.get(`adminlogentry:${businessId}:${id}`);
    }
    const results = await pipeline.exec();
    if (!results) return {};

    const stats: Record<string, { sent: number; toggleBot: number; pin: number; lastActive: number }> = {};

    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try {
        const entry = JSON.parse(raw as string) as AdminActivityEntry;
        if (since && entry.timestamp < since) continue;
        if (!stats[entry.username]) {
          stats[entry.username] = { sent: 0, toggleBot: 0, pin: 0, lastActive: 0 };
        }
        if (entry.action === "send" || entry.action === "sendFollowup") stats[entry.username].sent++;
        if (entry.action === "toggleBot") stats[entry.username].toggleBot++;
        if (entry.action === "pin" || entry.action === "unpin") stats[entry.username].pin++;
        if (entry.timestamp > stats[entry.username].lastActive) {
          stats[entry.username].lastActive = entry.timestamp;
        }
      } catch { /* skip */ }
    }
    return stats;
  }
}

// ── Export singleton ──

const g2 = globalThis as unknown as { __chatStore?: ChatStore };
if (!g2.__chatStore) g2.__chatStore = new ChatStore();
export const chatStore = g2.__chatStore;
