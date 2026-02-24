/* ------------------------------------------------------------------ */
/*  Chat Store — Redis storage for live chat conversations              */
/*  Shared across all Vercel serverless functions via external Redis    */
/*                                                                      */
/*  Env var (auto-injected by Vercel Marketplace → Redis):             */
/*    REDIS_URL                                                         */
/* ------------------------------------------------------------------ */

import Redis from "ioredis";
import { randomUUID } from "crypto";

// ── Types ──

/**
 * LINE channel runtime settings — persisted in Redis so the webhook
 * can read them without relying on browser localStorage.
 */
export interface LineChannelSettings {
  welcomeMessage: string;       // sent on LINE "follow" event
  offlineMessage?: string;      // sent when message arrives outside business hours
  autoReply: boolean;           // global auto-reply flag (mirrors Redis globalbot but settable via UI)
  responseDelaySec: number;     // seconds to wait before replying (0 = instant)
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
  source: "line" | "web" | "facebook";
  createdAt: number;
  pinned?: boolean;
  pinnedAt?: number;
  pinnedReason?: string;
  /** Admin who has claimed/assigned this conversation */
  assignedAdmin?: string;
  assignedAt?: number;
  /** Timestamp of last admin message — used for auto re-enable after inactivity */
  adminLastReplyAt?: number;
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
  /**
   * For image messages: data URL (data:image/jpeg;base64,...) or https URL.
   * Stored so admin panel can render image thumbnails in the chat.
   * LINE CDN URLs expire in 24h — prefer storing base64 data URL for persistence.
   */
  imageUrl?: string;
  /** For video messages: https URL (e.g. Cloudinary) */
  videoUrl?: string;
  /** For generic file attachments: https URL */
  fileUrl?: string;
  /** Original file name for file/PDF messages */
  fileName?: string;
  /** MIME type of the attached file */
  fileMimeType?: string;
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

/**
 * AI-generated summary for a single conversation.
 * Key: chatsum:{businessId}:{userId}  TTL: 7 days
 */
export interface ChatSummary {
  userId: string;
  businessId: string;
  displayName: string;
  topic: string;            // Main topic discussed
  outcome: string;          // How it ended (e.g. "ลูกค้าสนใจซื้อ Legend Pro", "resolved", "escalated")
  sentiment: "positive" | "neutral" | "negative";
  keyPoints: string[];      // Bullet points of conversation
  pendingAction?: string;   // Action needed (e.g. "รอ admin ตอบกลับ", "ลูกค้ายังไม่ตัดสินใจ")
  adminHandled: boolean;    // Whether a human admin responded
  adminNames: string[];     // Usernames of admins who participated
  messageCount: number;
  duration: number;         // Duration in minutes (first to last message)
  summarizedAt: number;
  conversationDate: string; // YYYY-MM-DD (Thai TZ)
}

/**
 * Daily digest for a business.
 * Key: dailydigest:{businessId}:{date}  TTL: 30 days
 * date format: YYYY-MM-DD
 */
export interface DailyDigest {
  businessId: string;
  date: string;             // YYYY-MM-DD
  totalConversations: number;
  newConversations: number;
  resolvedConversations: number;
  escalatedConversations: number;
  pendingConversations: number;
  avgResponseTimeMin: number;
  topTopics: { topic: string; count: number }[];
  adminActivity: { username: string; messagesSent: number; conversationsHandled: number }[];
  pendingWork: PendingWork[];
  generatedAt: number;
}

/**
 * CRM Profile — structured customer data extracted from chat + admin edits.
 * Key: crm:{businessId}:{userId}  → JSON object
 *
 * Fields are all optional — filled incrementally by AI extraction or admin.
 */
export interface CRMProfile {
  userId: string;
  businessId: string;

  // Core contact info
  name?: string;           // real name (ไม่ใช่ LINE displayName)
  phone?: string;          // เบอร์โทรศัพท์
  email?: string;
  lineDisplayName?: string; // LINE displayName at time of last extract

  // Purchase interest / intent
  interestedProducts?: string[];  // สินค้าที่สนใจ
  budget?: string;                // งบประมาณ
  purchaseIntent?: "hot" | "warm" | "cold" | "purchased";  // ระดับความสนใจ

  // Location / context
  province?: string;       // จังหวัด
  occupation?: string;     // อาชีพ

  // Lifecycle
  tags?: string[];         // admin-defined tags เช่น "VIP", "ลูกค้าเก่า"
  stage?: "lead" | "prospect" | "customer" | "churned";

  // Metadata
  extractedAt?: number;    // last AI extract timestamp
  extractedBy?: "ai" | "admin";
  updatedAt?: number;      // last manual edit timestamp
  updatedBy?: string;      // admin username who last edited
  createdAt: number;
}

/**
 * CRM Note — private admin note for a customer conversation.
 * Key: crmnotes:{businessId}:{userId}  → JSON array
 */
export interface CRMNote {
  id: string;
  text: string;
  createdBy: string;  // admin username
  createdAt: number;
}

/**
 * Admin correction log entry — when admin corrects a bot response.
 * Key: corrections:{businessId}  → Sorted Set (score=ts, member=id)
 * Key: correction:{businessId}:{id}  → JSON
 * Used to build training data for knowledge base suggestions.
 */
export interface CorrectionEntry {
  id: string;
  businessId: string;
  userId: string;          // customer userId
  displayName?: string;
  botMessage: string;      // original bot response that was wrong
  adminCorrection: string; // what admin actually sent
  userQuestion: string;    // customer's question that triggered the bot
  correctedBy: string;     // admin username
  timestamp: number;
  suggestedForKB?: boolean; // has admin reviewed for KB addition?
}

/**
 * Quick Reply Template — a pre-written admin message snippet.
 * Key: templates:{businessId}  → JSON array
 */
export interface QuickReplyTemplate {
  id: string;
  title: string;    // short label shown in the picker
  text: string;     // full message text
  createdAt: number;
}

/**
 * A single pending work item — conversation that needs attention.
 */
export interface PendingWork {
  userId: string;
  displayName: string;
  businessId: string;
  reason: string;           // Why it's pending
  priority: "high" | "medium" | "low";
  lastMessageAt: number;
  lastMessage: string;
  waitingHours: number;     // How long customer has been waiting
  assignedAdmin?: string;   // Admin who last touched this
  source: "line" | "web" | "facebook";
  pinned: boolean;
  botEnabled: boolean;
}

// ── Redis client singleton (reused across warm invocations) ──

function createRedis(): Redis | null {
  const url = process.env.REDIS_URL;

  if (!url) {
    console.warn("[chatStore] Missing REDIS_URL env var — Redis disabled. All store operations will be no-ops.");
    return null;
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

const g = globalThis as unknown as { __redis?: Redis | null };
if (!("__redis" in g)) g.__redis = createRedis();
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
  if (!redis) return null;
  const raw = await redis.get(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function setJSON<T>(key: string, value: T): Promise<void> {
  if (!redis) return;
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
      source?: "line" | "web" | "facebook";
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
    if (redis) await redis.zadd(convsKey(businessId), conv.lastMessageAt, userId);
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
      id: randomUUID(),
    };

    // Atomically append + trim to last 500 messages via Lua script
    // This eliminates the rpush → llen → ltrim race condition where
    // concurrent writers could each read the same llen and skip the trim.
    const mk = msgsKey(businessId, userId);
    if (!redis) return fullMsg; // no-op when Redis is unavailable
    const LUA_RPUSH_TRIM = `
      redis.call('RPUSH', KEYS[1], ARGV[1])
      redis.call('LTRIM', KEYS[1], -tonumber(ARGV[2]), -1)
      return redis.call('LLEN', KEYS[1])
    `;
    await (redis as Redis).eval(LUA_RPUSH_TRIM, 1, mk, JSON.stringify(fullMsg), "500");

    // Update conversation metadata
    const ck = convKey(businessId, userId);
    const conv = await getJSON<ChatConversation>(ck);
    if (conv) {
      conv.lastMessage = msg.imageUrl
        ? `[รูปภาพ] ${msg.content || ""}`.trim().slice(0, 100)
        : msg.content.slice(0, 100);
      conv.lastMessageAt = msg.timestamp;
      conv.lastMessageRole = msg.role;
      if (msg.role === "customer") {
        conv.unreadCount++;
      }
      // Track last admin reply time for auto re-enable handoff
      if (msg.role === "admin") {
        conv.adminLastReplyAt = msg.timestamp;
      }
      await setJSON(ck, conv);
      // Update sorted set score
      if (redis) await redis.zadd(convsKey(businessId), msg.timestamp, userId);
    }

    // ── B1: Trigger conversation summarization every 20 messages ──
    // Fire-and-forget: don't await so we don't block the response
    try {
      const currentLen = redis ? await redis.llen(mk) : 0;
      if (currentLen > 0 && currentLen % 20 === 0) {
        const baseUrl = process.env.NEXTJS_URL ?? process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : "http://localhost:3000";
        fetch(`${baseUrl}/api/chat/summarize`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": process.env.INTERNAL_SECRET ?? "chatbot-internal",
          },
          body: JSON.stringify({ businessId, userId }),
        }).catch(() => {}); // truly fire-and-forget
      }
    } catch {
      // non-fatal — never block message delivery
    }

    return fullMsg;
  }

  /** Get all messages for a conversation */
  async getMessages(businessId: string, userId: string): Promise<ChatMessage[]> {
    if (!redis) return [];
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
    if (!redis) return [];
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

  /** Get a single conversation by userId */
  async getConversation(businessId: string, userId: string): Promise<ChatConversation | null> {
    return getJSON<ChatConversation>(convKey(businessId, userId));
  }

  /** Check if bot is enabled for a conversation */
  async isBotEnabled(businessId: string, userId: string): Promise<boolean> {
    try {
      const conv = await getJSON<ChatConversation>(convKey(businessId, userId));
      return conv?.botEnabled ?? true; // Default: bot enabled
    } catch (err) {
      console.error("[chatStore] isBotEnabled Redis error:", err);
      return true; // fail-open: allow bot to run
    }
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
    if (!redis) return;
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
    if (!redis) return;
    await redis.set(`globalbot:${businessId}`, enabled ? "1" : "0");
  }

  /** Check if global bot is enabled for a business (default: enabled) */
  async isGlobalBotEnabled(businessId: string): Promise<boolean> {
    try {
      if (!redis) return true;
      const val = await redis.get(`globalbot:${businessId}`);
      return val !== "0"; // Default: enabled (null or "1")
    } catch (err) {
      console.error("[chatStore] isGlobalBotEnabled Redis error:", err);
      return true; // fail-open: allow bot to run
    }
  }

  // ── Vision Feature Toggle ──
  // Key: vision:{businessId} → "1" (on) | "0" (off)
  // Default: on (follows businessConfig.features.visionEnabled as fallback)

  /** Set vision (image/file analysis) on/off for a business at runtime */
  async setVisionEnabled(businessId: string, enabled: boolean): Promise<void> {
    if (!redis) return;
    await redis.set(`vision:${businessId}`, enabled ? "1" : "0");
  }

  /**
   * Check if vision is enabled for a business.
   * Returns Redis value if set; otherwise falls back to defaultEnabled (from businessConfig).
   */
  async isVisionEnabled(businessId: string, defaultEnabled = true): Promise<boolean> {
    try {
      if (!redis) return defaultEnabled;
      const val = await redis.get(`vision:${businessId}`);
      if (val === null) return defaultEnabled; // not set → use config default
      return val !== "0";
    } catch (err) {
      console.error("[chatStore] isVisionEnabled Redis error:", err);
      return defaultEnabled; // fail-open: use config default
    }
  }

  // ── Follow-up Agent ──
  // Key: followup:{businessId}:{userId} → JSON<FollowUpResult>
  // Key: followups:{businessId}          → Sorted set (score = analyzedAt)

  async setFollowUp(
    businessId: string,
    userId: string,
    data: FollowUpResult
  ): Promise<void> {
    if (!redis) return;
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
    if (!redis) return [];
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
    if (!redis) return;
    await redis.del(`followup:${businessId}:${userId}`);
    await redis.zrem(`followups:${businessId}`, userId);
  }

  // ── Chat Summaries ──
  // Key: chatsum:{businessId}:{userId}           → JSON<ChatSummary>, TTL 7 days
  // Key: chatsums:{businessId}:{date}            → Sorted set (score=summarizedAt, member=userId), TTL 30 days

  async saveChatSummary(summary: ChatSummary): Promise<void> {
    if (!redis) return;
    const key = `chatsum:${summary.businessId}:${summary.userId}`;
    await setJSON(key, summary);
    await redis.expire(key, 60 * 60 * 24 * 7);
    // Index by date
    const dateKey = `chatsums:${summary.businessId}:${summary.conversationDate}`;
    await redis.zadd(dateKey, summary.summarizedAt, summary.userId);
    await redis.expire(dateKey, 60 * 60 * 24 * 30);
  }

  async getChatSummary(businessId: string, userId: string): Promise<ChatSummary | null> {
    return getJSON<ChatSummary>(`chatsum:${businessId}:${userId}`);
  }

  async getChatSummariesByDate(businessId: string, date: string): Promise<ChatSummary[]> {
    if (!redis) return [];
    const dateKey = `chatsums:${businessId}:${date}`;
    const userIds = await redis.zrange(dateKey, 0, -1, "REV");
    if (!userIds || userIds.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const uid of userIds) pipeline.get(`chatsum:${businessId}:${uid}`);
    const results = await pipeline.exec();
    if (!results) return [];

    return results
      .map(([, raw]) => {
        if (!raw || typeof raw !== "string") return null;
        try { return JSON.parse(raw) as ChatSummary; } catch { return null; }
      })
      .filter((s): s is ChatSummary => s !== null);
  }

  async getAllChatSummaries(businessId: string, limit = 100): Promise<ChatSummary[]> {
    if (!redis) return [];
    // Get all conversation userIds, most recent first
    const userIds = await redis.zrange(convsKey(businessId), 0, limit - 1, "REV");
    if (!userIds || userIds.length === 0) return [];

    const pipeline = redis.pipeline();
    for (const uid of userIds) pipeline.get(`chatsum:${businessId}:${uid}`);
    const results = await pipeline.exec();
    if (!results) return [];

    return results
      .map(([, raw]) => {
        if (!raw || typeof raw !== "string") return null;
        try { return JSON.parse(raw) as ChatSummary; } catch { return null; }
      })
      .filter((s): s is ChatSummary => s !== null);
  }

  // ── Daily Digest ──
  // Key: dailydigest:{businessId}:{date} → JSON<DailyDigest>, TTL 30 days

  async saveDailyDigest(digest: DailyDigest): Promise<void> {
    if (!redis) return;
    const key = `dailydigest:${digest.businessId}:${digest.date}`;
    await setJSON(key, digest);
    await redis.expire(key, 60 * 60 * 24 * 30);
  }

  async getDailyDigest(businessId: string, date: string): Promise<DailyDigest | null> {
    return getJSON<DailyDigest>(`dailydigest:${businessId}:${date}`);
  }

  // ── Pending Work ──
  // Computed on-the-fly from conversations (no separate store needed)

  async getPendingWork(businessId: string): Promise<PendingWork[]> {
    const convs = await this.getConversations(businessId);
    const now = Date.now();
    const pending: PendingWork[] = [];

    for (const conv of convs) {
      const waitingMs = now - conv.lastMessageAt;
      const waitingHours = waitingMs / (1000 * 60 * 60);

      // Criteria for "pending":
      // 1. Pinned (escalated but not resolved)
      // 2. Bot disabled but customer sent last message (needs human reply)
      // 3. Customer last message > 2 hours ago with no admin response
      const isPinned = conv.pinned === true;
      const botOff = !conv.botEnabled;
      const customerWaiting =
        conv.lastMessageRole === "customer" && waitingHours > 2;

      if (isPinned || (botOff && conv.lastMessageRole === "customer") || customerWaiting) {
        let reason = "";
        let priority: "high" | "medium" | "low" = "low";

        if (isPinned) {
          reason = "Escalated — รอ admin ดูแล";
          priority = "high";
        } else if (botOff && conv.lastMessageRole === "customer") {
          reason = "Bot ปิดอยู่ — ลูกค้ารอ admin ตอบ";
          priority = "high";
        } else if (waitingHours > 24) {
          reason = `ลูกค้ารอนาน ${Math.round(waitingHours)} ชม. แต่ยังไม่ได้รับการตอบ`;
          priority = "medium";
        } else {
          reason = `ลูกค้ารอ ${Math.round(waitingHours)} ชม.`;
          priority = "low";
        }

        pending.push({
          userId: conv.userId,
          displayName: conv.displayName,
          businessId: conv.businessId,
          reason,
          priority,
          lastMessageAt: conv.lastMessageAt,
          lastMessage: conv.lastMessage,
          waitingHours: Math.round(waitingHours * 10) / 10,
          source: conv.source,
          pinned: conv.pinned ?? false,
          botEnabled: conv.botEnabled,
        });
      }
    }

    // Sort: high priority first, then by waiting time desc
    return pending.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (pd !== 0) return pd;
      return b.waitingHours - a.waitingHours;
    });
  }

  // ── LINE Channel Settings (persisted per business) ──
  // Key: linesettings:{businessId} → JSON<LineChannelSettings>
  // Stored server-side so the webhook can read them at runtime.

  async getLineSettings(businessId: string): Promise<LineChannelSettings | null> {
    return getJSON<LineChannelSettings>(`linesettings:${businessId}`);
  }

  async setLineSettings(businessId: string, settings: LineChannelSettings): Promise<void> {
    if (!redis) return;
    await setJSON(`linesettings:${businessId}`, settings);
  }

  // ── Admin Activity Log ──
  // Sorted set: adminlog:{businessId}  score=timestamp  member=entryId
  // Entry key:  adminlogentry:{businessId}:{entryId}    value=JSON

  async logAdminActivity(entry: Omit<AdminActivityEntry, "id">): Promise<void> {
    if (!redis) return;
    const id = randomUUID();
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
    if (!redis) return [];
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
    if (!redis) return {};
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

  // ── CRM Notes ──

  async getCRMNotes(businessId: string, userId: string): Promise<CRMNote[]> {
    if (!redis) return [];
    const raw = await redis.get(`crmnotes:${businessId}:${userId}`);
    if (!raw) return [];
    try { return JSON.parse(raw) as CRMNote[]; } catch { return []; }
  }

  async addCRMNote(businessId: string, userId: string, text: string, createdBy: string): Promise<CRMNote> {
    const note: CRMNote = { id: randomUUID(), text, createdBy, createdAt: Date.now() };
    if (!redis) return note;
    const notes = await this.getCRMNotes(businessId, userId);
    notes.push(note);
    await redis.set(`crmnotes:${businessId}:${userId}`, JSON.stringify(notes));
    return note;
  }

  async deleteCRMNote(businessId: string, userId: string, noteId: string): Promise<void> {
    if (!redis) return;
    const notes = await this.getCRMNotes(businessId, userId);
    const filtered = notes.filter((n) => n.id !== noteId);
    await redis.set(`crmnotes:${businessId}:${userId}`, JSON.stringify(filtered));
  }

  // ── Agent Assignment ──

  async assignConversation(businessId: string, userId: string, adminUsername: string): Promise<void> {
    const conv = await getJSON<ChatConversation>(convKey(businessId, userId));
    if (!conv) return;
    conv.assignedAdmin = adminUsername;
    conv.assignedAt = Date.now();
    await setJSON(convKey(businessId, userId), conv);
  }

  async unassignConversation(businessId: string, userId: string): Promise<void> {
    const conv = await getJSON<ChatConversation>(convKey(businessId, userId));
    if (!conv) return;
    delete conv.assignedAdmin;
    delete conv.assignedAt;
    await setJSON(convKey(businessId, userId), conv);
  }

  // ── Quick Reply Templates ──

  async getTemplates(businessId: string): Promise<QuickReplyTemplate[]> {
    if (!redis) return [];
    const raw = await redis.get(`templates:${businessId}`);
    if (!raw) return [];
    try { return JSON.parse(raw) as QuickReplyTemplate[]; } catch { return []; }
  }

  async saveTemplate(businessId: string, template: Omit<QuickReplyTemplate, "id" | "createdAt">): Promise<QuickReplyTemplate> {
    const newTemplate: QuickReplyTemplate = {
      id: randomUUID(),
      createdAt: Date.now(),
      ...template,
    };
    if (!redis) return newTemplate;
    const templates = await this.getTemplates(businessId);
    templates.push(newTemplate);
    await redis.set(`templates:${businessId}`, JSON.stringify(templates));
    return newTemplate;
  }

  async deleteTemplate(businessId: string, templateId: string): Promise<void> {
    if (!redis) return;
    const templates = await this.getTemplates(businessId);
    const filtered = templates.filter((t) => t.id !== templateId);
    await redis.set(`templates:${businessId}`, JSON.stringify(filtered));
  }

  async updateTemplate(businessId: string, templateId: string, updates: Partial<Pick<QuickReplyTemplate, "title" | "text">>): Promise<void> {
    if (!redis) return;
    const templates = await this.getTemplates(businessId);
    const idx = templates.findIndex((t) => t.id === templateId);
    if (idx >= 0) {
      templates[idx] = { ...templates[idx], ...updates };
      await redis.set(`templates:${businessId}`, JSON.stringify(templates));
    }
  }

  // ── B3: Admin Correction Log ──
  // Key: correction:{businessId}:{id}  → JSON<CorrectionEntry>
  // Key: corrections:{businessId}      → Sorted Set (score=ts, member=id)
  // TTL: 180 days per entry

  async logCorrection(entry: Omit<CorrectionEntry, "id">): Promise<CorrectionEntry> {
    const id = randomUUID();
    const full: CorrectionEntry = { ...entry, id };
    if (!redis) return full;
    const entryKey = `correction:${entry.businessId}:${id}`;
    await setJSON(entryKey, full);
    await redis.expire(entryKey, 180 * 24 * 60 * 60);
    await redis.zadd(`corrections:${entry.businessId}`, entry.timestamp, id);
    // Trim to last 500
    await redis.zremrangebyrank(`corrections:${entry.businessId}`, 0, -501);
    return full;
  }

  async getCorrections(businessId: string, limit = 50): Promise<CorrectionEntry[]> {
    if (!redis) return [];
    const ids = await redis.zrange(`corrections:${businessId}`, 0, limit - 1, "REV");
    if (!ids.length) return [];
    const pipeline = redis.pipeline();
    for (const id of ids) pipeline.get(`correction:${businessId}:${id}`);
    const results = await pipeline.exec();
    if (!results) return [];
    const entries: CorrectionEntry[] = [];
    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try { entries.push(JSON.parse(raw as string) as CorrectionEntry); } catch { /* skip */ }
    }
    return entries;
  }

  async markCorrectionReviewed(businessId: string, id: string): Promise<void> {
    const key = `correction:${businessId}:${id}`;
    const entry = await getJSON<CorrectionEntry>(key);
    if (entry) {
      entry.suggestedForKB = true;
      await setJSON(key, entry);
    }
  }

  // ── CRM Profile ──

  async getCRMProfile(businessId: string, userId: string): Promise<CRMProfile | null> {
    return getJSON<CRMProfile>(`crm:${businessId}:${userId}`);
  }

  async saveCRMProfile(profile: CRMProfile): Promise<void> {
    if (!redis) return;
    await setJSON(`crm:${profile.businessId}:${profile.userId}`, profile);
    // Also add to the business index set (score = updatedAt for sorting)
    await redis.zadd(`crmindex:${profile.businessId}`, profile.updatedAt ?? profile.createdAt, profile.userId);
  }

  async getAllCRMProfiles(businessId: string, limit = 200): Promise<CRMProfile[]> {
    if (!redis) return [];
    // Pull most-recently-updated first
    const userIds = await redis.zrange(`crmindex:${businessId}`, 0, limit - 1, "REV");
    if (!userIds.length) return [];

    const pipeline = redis.pipeline();
    for (const uid of userIds) {
      pipeline.get(`crm:${businessId}:${uid}`);
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const profiles: CRMProfile[] = [];
    for (const [err, raw] of results) {
      if (err || !raw) continue;
      try {
        profiles.push(JSON.parse(raw as string) as CRMProfile);
      } catch { /* skip */ }
    }
    return profiles;
  }

  async deleteCRMProfile(businessId: string, userId: string): Promise<void> {
    if (!redis) return;
    await redis.del(`crm:${businessId}:${userId}`);
    await redis.zrem(`crmindex:${businessId}`, userId);
  }

  // ── C2: Customer Journey Timeline ──
  // Assembles a chronological timeline of key events for a customer:
  //   • first message, stage changes, admin replies, follow-ups, pins, bot toggles

  async getCustomerJourney(businessId: string, userId: string): Promise<JourneyEvent[]> {
    const [messages, conv, crm, corrections] = await Promise.all([
      this.getMessages(businessId, userId),
      this.getConversation(businessId, userId),
      this.getCRMProfile(businessId, userId),
      this.getCorrections(businessId, 200),
    ]);

    const events: JourneyEvent[] = [];

    // Conv creation
    if (conv?.createdAt) {
      events.push({
        ts: conv.createdAt,
        type: "start",
        label: "เริ่มบทสนทนา",
        detail: `ผ่านช่องทาง ${conv.source ?? "line"}`,
        icon: "chat",
      });
    }

    // First N messages — group by day to show engagement
    const msgsByDay: Record<string, number> = {};
    for (const m of messages) {
      const day = new Date(m.timestamp).toISOString().slice(0, 10);
      msgsByDay[day] = (msgsByDay[day] ?? 0) + 1;
    }

    // Admin messages (pick unique admin actions from messages)
    const adminMsgs = messages.filter((m) => m.role === "admin" && !m.content.startsWith("[ระบบ]"));
    if (adminMsgs.length > 0) {
      const firstAdmin = adminMsgs[0];
      events.push({
        ts: firstAdmin.timestamp,
        type: "admin",
        label: "Admin เข้ามาดูแล",
        detail: `โดย ${firstAdmin.sentBy ?? "admin"}`,
        icon: "admin",
      });
    }

    // System events from messages (bot toggle, pin)
    for (const m of messages) {
      if (!m.content.startsWith("[ระบบ]")) continue;
      if (m.content.includes("ปักหมุด")) {
        events.push({ ts: m.timestamp, type: "pin", label: "ปักหมุดสนทนา", detail: m.content.replace("[ระบบ] ", ""), icon: "pin" });
      } else if (m.content.includes("ปิด Bot")) {
        events.push({ ts: m.timestamp, type: "bot_off", label: "ปิด Bot", detail: m.content.replace("[ระบบ] ", ""), icon: "bot" });
      } else if (m.content.includes("เปิด Bot")) {
        events.push({ ts: m.timestamp, type: "bot_on", label: "เปิด Bot", detail: m.content.replace("[ระบบ] ", ""), icon: "bot" });
      }
    }

    // CRM stage change
    if (crm?.stage) {
      events.push({
        ts: crm.updatedAt ?? crm.createdAt,
        type: "stage",
        label: `Stage: ${crm.stage}`,
        detail: crm.updatedBy ? `แก้โดย ${crm.updatedBy}` : "AI สกัดอัตโนมัติ",
        icon: "crm",
      });
    }

    // CRM intent
    if (crm?.purchaseIntent) {
      events.push({
        ts: crm.extractedAt ?? crm.createdAt,
        type: "intent",
        label: `Intent: ${crm.purchaseIntent}`,
        detail: crm.interestedProducts?.join(", ") ?? "",
        icon: "intent",
      });
    }

    // Corrections for this user
    const userCorrections = corrections.filter((c) => c.userId === userId);
    for (const c of userCorrections) {
      events.push({
        ts: c.timestamp,
        type: "correction",
        label: "Admin แก้ไขคำตอบ Bot",
        detail: `Q: "${c.userQuestion.slice(0, 60)}"`,
        icon: "correction",
      });
    }

    // Daily message count milestones
    const days = Object.entries(msgsByDay);
    for (const [day, count] of days) {
      const dayTs = new Date(day + "T12:00:00+07:00").getTime();
      events.push({
        ts: dayTs,
        type: "activity",
        label: `${count} ข้อความ`,
        detail: day,
        icon: "message",
      });
    }

    // Sort by timestamp asc
    return events.sort((a, b) => a.ts - b.ts);
  }
}

export interface JourneyEvent {
  ts: number;
  type: "start" | "admin" | "pin" | "bot_on" | "bot_off" | "stage" | "intent" | "correction" | "activity";
  label: string;
  detail: string;
  icon: "chat" | "admin" | "pin" | "bot" | "crm" | "intent" | "correction" | "message";
}

// ── Export singleton ──

const g2 = globalThis as unknown as { __chatStore?: ChatStore };
if (!g2.__chatStore) g2.__chatStore = new ChatStore();
export const chatStore = g2.__chatStore;
