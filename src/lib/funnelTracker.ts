/**
 * Conversion Funnel Tracker
 *
 * Tracks 5-stage conversion funnel per business per user per day using Redis counters.
 * Stages (in order):
 *   awareness      → ลูกค้ารู้จักและเริ่มพูดคุย (intent: greeting, product_inquiry)
 *   interest       → ลูกค้าสนใจสินค้า (intent: category_select_*, em_motorcycle, recommendation)
 *   consideration  → ลูกค้าพิจารณาจริงจัง (intent: product_details, warranty_info, battery_compare, color_inquiry)
 *   intent         → ลูกค้าพร้อมซื้อ (intent: ev_purchase, installment_inquiry, deposit_policy, test_ride)
 *   converted      → ลูกค้าซื้อแล้ว (intent: admin_escalation ที่มี purchase outcome จาก ChatSummary)
 *
 * Redis key pattern:
 *   funnel:{businessId}:{YYYY-MM-DD}:{stage}  → integer counter (TTL 90 days)
 *   funnel:user:{businessId}:{userId}          → current stage (string, TTL 7 days)
 */

export type FunnelStage = "awareness" | "interest" | "consideration" | "intent" | "converted";

export const FUNNEL_STAGES: FunnelStage[] = [
  "awareness",
  "interest",
  "consideration",
  "intent",
  "converted",
];

const STAGE_ORDER: Record<FunnelStage, number> = {
  awareness: 0,
  interest: 1,
  consideration: 2,
  intent: 3,
  converted: 4,
};

/** Intent ID → funnel stage mapping */
export const INTENT_TO_STAGE: Record<string, FunnelStage> = {
  greeting: "awareness",
  product_inquiry: "awareness",
  contact_channels: "awareness",
  store_location_hours: "awareness",
  offtopic_playful: "awareness",

  category_select_battery: "interest",
  category_select_motorcycle: "interest",
  em_motorcycle: "interest",
  recommendation: "interest",
  promotion_inquiry: "interest",
  february_promotion: "interest",

  product_details: "consideration",
  warranty_info: "consideration",
  battery_compare: "consideration",
  color_inquiry: "consideration",
  battery_symptom: "consideration",
  battery_concern: "consideration",
  budget_recommendation: "consideration",
  installment_inquiry: "consideration",
  ev_subsidy: "consideration",
  vehicle_insurance: "consideration",
  on_site_service: "consideration",

  ev_purchase: "intent",
  deposit_policy: "intent",
  test_ride: "intent",
  em_motorcycle_service: "intent",

  admin_escalation: "converted", // Escalation often = hot lead or purchase follow-up
};

// Thai timezone: UTC+7
function thaiDateKey(): string {
  const d = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

/**
 * Track a funnel event for a user.
 * Only advances stage if the new stage is higher than the user's current stage.
 *
 * @param businessId  - e.g. "evlifethailand"
 * @param userId      - LINE userId / FB psid / web session id
 * @param intentId    - matched intent id from pipeline
 * @param redis       - ioredis instance (only available in Node.js runtime)
 */
export async function trackFunnelEvent(
  businessId: string,
  userId: string,
  intentId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: any
): Promise<void> {
  if (!redis) return;

  const stage = INTENT_TO_STAGE[intentId];
  if (!stage) return; // intent not in funnel map

  const userKey = `funnel:user:${businessId}:${userId}`;

  try {
    // Get user's current stage
    const currentStageStr = await redis.get(userKey) as string | null;
    const currentOrder = currentStageStr ? (STAGE_ORDER[currentStageStr as FunnelStage] ?? -1) : -1;
    const newOrder = STAGE_ORDER[stage];

    // Only advance, never go back
    if (newOrder > currentOrder) {
      const dateKey = thaiDateKey();
      const counterKey = `funnel:${businessId}:${dateKey}:${stage}`;

      // Increment daily counter and update user stage (fire-and-forget style)
      await Promise.all([
        redis.incr(counterKey),
        redis.expire(counterKey, 90 * 24 * 60 * 60), // TTL 90 days
        redis.set(userKey, stage, "EX", 7 * 24 * 60 * 60), // TTL 7 days
      ]);
    }
  } catch {
    // Non-fatal: funnel tracking should never crash the pipeline
  }
}

/**
 * Get funnel counts for a specific date range.
 * Returns counts per stage per day.
 */
export async function getFunnelData(
  businessId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  redis: any,
  days = 30
): Promise<{ date: string; stage: FunnelStage; count: number }[]> {
  if (!redis) return [];

  // Build all date keys upfront
  const today = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const dateKeys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    dateKeys.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }

  // Use a single Redis pipeline instead of sequential GETs (N*M → 1 round trip)
  const pipeline = redis.pipeline();
  for (const dateKey of dateKeys) {
    for (const stage of FUNNEL_STAGES) {
      pipeline.get(`funnel:${businessId}:${dateKey}:${stage}`);
    }
  }

  let pipelineResults: [Error | null, unknown][];
  try {
    pipelineResults = await pipeline.exec();
  } catch {
    return [];
  }

  const results: { date: string; stage: FunnelStage; count: number }[] = [];
  let idx = 0;
  for (const dateKey of dateKeys) {
    for (const stage of FUNNEL_STAGES) {
      const [err, val] = pipelineResults[idx++] ?? [null, null];
      if (!err && val) {
        const count = parseInt(val as string, 10);
        if (count > 0) results.push({ date: dateKey, stage, count });
      }
    }
  }

  return results;
}
