/* ------------------------------------------------------------------ */
/*  Chat Store — Redis storage for live chat conversations              */
/*  Shared across all Vercel serverless functions via external Redis    */
/*                                                                      */
/*  Env var (auto-injected by Vercel Marketplace → Redis):             */
/*    REDIS_URL                                                         */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";

// ── Types ──

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
}

export interface ChatMessage {
  id: string;
  role: "customer" | "bot" | "admin";
  content: string;
  timestamp: number;
  pipelineLayer?: number;
  pipelineLayerName?: string;
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
}

// ── Export singleton ──

const g2 = globalThis as unknown as { __chatStore?: ChatStore };
if (!g2.__chatStore) g2.__chatStore = new ChatStore();
export const chatStore = g2.__chatStore;
