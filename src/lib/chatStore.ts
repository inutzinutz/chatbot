/* ------------------------------------------------------------------ */
/*  Chat Store — in-memory storage for live chat conversations          */
/*  Uses globalThis to persist across warm serverless invocations       */
/*  NOTE: Data is lost on cold starts. For production persistence,     */
/*  upgrade to Vercel KV or Upstash Redis.                              */
/* ------------------------------------------------------------------ */

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

class ChatStore {
  private conversations: Map<string, ChatConversation> = new Map();
  private messages: Map<string, ChatMessage[]> = new Map();

  private key(businessId: string, userId: string): string {
    return `${businessId}:${userId}`;
  }

  /** Get or create a conversation */
  getOrCreateConversation(
    businessId: string,
    userId: string,
    opts?: {
      displayName?: string;
      pictureUrl?: string;
      statusMessage?: string;
      source?: "line" | "web";
    }
  ): ChatConversation {
    const k = this.key(businessId, userId);
    let conv = this.conversations.get(k);
    if (!conv) {
      conv = {
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
      this.conversations.set(k, conv);
    }
    // Update profile if new info provided
    if (opts?.displayName && opts.displayName !== conv.displayName) {
      conv.displayName = opts.displayName;
    }
    if (opts?.pictureUrl) {
      conv.pictureUrl = opts.pictureUrl;
    }
    if (opts?.statusMessage) {
      conv.statusMessage = opts.statusMessage;
    }
    return conv;
  }

  /** Add a message to a conversation */
  addMessage(
    businessId: string,
    userId: string,
    msg: Omit<ChatMessage, "id">
  ): ChatMessage {
    const k = this.key(businessId, userId);
    const messages = this.messages.get(k) || [];
    const fullMsg: ChatMessage = {
      ...msg,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    messages.push(fullMsg);
    // Keep last 500 messages per conversation
    if (messages.length > 500) messages.splice(0, messages.length - 500);
    this.messages.set(k, messages);

    // Update conversation metadata
    const conv = this.getOrCreateConversation(businessId, userId);
    conv.lastMessage = msg.content.slice(0, 100);
    conv.lastMessageAt = msg.timestamp;
    conv.lastMessageRole = msg.role;
    if (msg.role === "customer") {
      conv.unreadCount++;
    }

    return fullMsg;
  }

  /** Get all messages for a conversation */
  getMessages(businessId: string, userId: string): ChatMessage[] {
    return this.messages.get(this.key(businessId, userId)) || [];
  }

  /** Get all conversations for a business, sorted by most recent */
  getConversations(businessId: string): ChatConversation[] {
    const result: ChatConversation[] = [];
    for (const conv of this.conversations.values()) {
      if (conv.businessId === businessId) result.push(conv);
    }
    return result.sort((a, b) => b.lastMessageAt - a.lastMessageAt);
  }

  /** Toggle bot auto-reply for a conversation */
  toggleBot(businessId: string, userId: string, enabled: boolean): boolean {
    const conv = this.conversations.get(this.key(businessId, userId));
    if (conv) {
      conv.botEnabled = enabled;
      return true;
    }
    return false;
  }

  /** Check if bot is enabled for a conversation */
  isBotEnabled(businessId: string, userId: string): boolean {
    const conv = this.conversations.get(this.key(businessId, userId));
    return conv?.botEnabled ?? true; // Default: bot enabled
  }

  /** Mark conversation as read (reset unread count) */
  markRead(businessId: string, userId: string): void {
    const conv = this.conversations.get(this.key(businessId, userId));
    if (conv) conv.unreadCount = 0;
  }

  /** Get total unread count across all conversations for a business */
  getTotalUnread(businessId: string): number {
    let total = 0;
    for (const conv of this.conversations.values()) {
      if (conv.businessId === businessId) total += conv.unreadCount;
    }
    return total;
  }

  /** Delete a conversation and its messages */
  deleteConversation(businessId: string, userId: string): void {
    const k = this.key(businessId, userId);
    this.conversations.delete(k);
    this.messages.delete(k);
  }
}

// ── Global singleton — persists across warm Vercel invocations ──

const g = globalThis as unknown as { __chatStore?: ChatStore };
if (!g.__chatStore) g.__chatStore = new ChatStore();
export const chatStore = g.__chatStore;
