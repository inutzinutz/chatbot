/* ------------------------------------------------------------------ */
/*  Carousel Builder                                                    */
/*  Builds channel-specific carousel payloads from Product objects.    */
/*                                                                      */
/*  - buildLineFlexCarousel()   → LINE Flex Message (bubble carousel)  */
/*  - buildFbGenericCarousel()  → Facebook Generic Template elements   */
/*  - buildWebCarousel()        → Plain JSON for web chat widget        */
/* ------------------------------------------------------------------ */

import type { Product } from "@/lib/products";

// ── Shared helper ──────────────────────────────────────────────────────

function formatPrice(price: number): string {
  return price.toLocaleString("th-TH") + " ฿";
}

/** Cap carousel at 10 items (LINE limit) */
function cap(products: Product[], max = 10): Product[] {
  return products.slice(0, max);
}

// ── Web Carousel ────────────────────────────────────────────────────────

export interface WebCarouselCard {
  id: number;
  name: string;
  description: string;
  price: number;
  priceFormatted: string;
  image: string;
  category: string;
  tags: string[];
  status: string;
}

export interface WebCarousel {
  type: "carousel";
  cards: WebCarouselCard[];
  /** Optional intro text shown above the carousel */
  intro?: string;
}

export function buildWebCarousel(
  products: Product[],
  intro?: string
): WebCarousel {
  return {
    type: "carousel",
    intro,
    cards: cap(products).map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      priceFormatted: formatPrice(p.price),
      image: p.image,
      category: p.category,
      tags: p.tags,
      status: p.status ?? "active",
    })),
  };
}

// ── LINE Flex Message ───────────────────────────────────────────────────
// Spec: https://developers.line.biz/en/docs/messaging-api/flex-message-elements/

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlexComponent = Record<string, any>;

function buildFlexBubble(p: Product): FlexComponent {
  const priceText = formatPrice(p.price);
  const shortDesc =
    p.description.split("\n")[0].slice(0, 80) +
    (p.description.split("\n")[0].length > 80 ? "…" : "");

  return {
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: p.image,
      size: "full",
      aspectRatio: "20:13",
      aspectMode: "cover",
      action: {
        type: "uri",
        label: "ดูรายละเอียด",
        uri: `https://line.me/`, // placeholder — replace with product URL if available
      },
    },
    body: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "13px",
      contents: [
        {
          type: "text",
          text: p.name,
          weight: "bold",
          size: "sm",
          wrap: true,
          maxLines: 2,
          color: "#111111",
        },
        {
          type: "text",
          text: shortDesc,
          size: "xxs",
          color: "#888888",
          wrap: true,
          maxLines: 2,
          margin: "xs",
        },
        {
          type: "separator",
          margin: "md",
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: "ราคา",
              size: "xs",
              color: "#888888",
              flex: 1,
            },
            {
              type: "text",
              text: priceText,
              size: "sm",
              weight: "bold",
              color: "#E54141",
              align: "end",
              flex: 2,
            },
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      spacing: "sm",
      paddingAll: "10px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#4F46E5",
          height: "sm",
          action: {
            type: "message",
            label: "สนใจรุ่นนี้",
            text: `สนใจ ${p.name}`,
          },
        },
        {
          type: "button",
          style: "secondary",
          height: "sm",
          action: {
            type: "message",
            label: "ขอรายละเอียด",
            text: `ขอรายละเอียด ${p.name}`,
          },
        },
      ],
    },
  };
}

/**
 * Returns a LINE Flex Message object (the `messages` array element).
 * Max 10 bubbles per carousel.
 */
export function buildLineFlexCarousel(
  products: Product[],
  altText = "แนะนำสินค้า"
): FlexComponent {
  const items = cap(products);

  if (items.length === 1) {
    // Single bubble
    return {
      type: "flex",
      altText,
      contents: buildFlexBubble(items[0]),
    };
  }

  return {
    type: "flex",
    altText,
    contents: {
      type: "carousel",
      contents: items.map(buildFlexBubble),
    },
  };
}

// ── Facebook Generic Template ───────────────────────────────────────────
// Spec: https://developers.facebook.com/docs/messenger-platform/send-messages/template/generic

export interface FbGenericElement {
  title: string;
  image_url?: string;
  subtitle?: string;
  buttons?: FbButton[];
}

export interface FbButton {
  type: "postback" | "web_url";
  title: string;
  payload?: string;
  url?: string;
}

export interface FbGenericTemplate {
  attachment: {
    type: "template";
    payload: {
      template_type: "generic";
      elements: FbGenericElement[];
    };
  };
}

/**
 * Returns the `message` object for Facebook Send API.
 * FB allows max 10 elements per generic template.
 */
export function buildFbGenericCarousel(products: Product[]): FbGenericTemplate {
  const elements: FbGenericElement[] = cap(products).map((p) => ({
    title: p.name.slice(0, 80),
    image_url: p.image,
    subtitle: `${formatPrice(p.price)} | ${p.description.split("\n")[0].slice(0, 80)}`,
    buttons: [
      {
        type: "postback",
        title: "สนใจรุ่นนี้",
        payload: `INTERESTED_${p.id}`,
      },
      {
        type: "postback",
        title: "ขอรายละเอียด",
        payload: `DETAILS_${p.id}`,
      },
    ],
  }));

  return {
    attachment: {
      type: "template",
      payload: {
        template_type: "generic",
        elements,
      },
    },
  };
}

// ── Recommendation logic ───────────────────────────────────────────────

/**
 * Filter + rank products for recommendation.
 * - Only active products
 * - Filter by category if provided
 * - Filter by budget (max price) if provided
 * - Sort by price ascending
 * - Cap at `limit`
 */
export function recommendProducts(
  allProducts: Product[],
  opts: {
    category?: string;
    budget?: number;
    keywords?: string[];
    limit?: number;
  } = {}
): Product[] {
  const { category, budget, keywords = [], limit = 5 } = opts;

  let list = allProducts.filter((p) => p.status !== "discontinue");

  if (category) {
    const cat = category.toLowerCase();
    list = list.filter((p) => p.category.toLowerCase().includes(cat));
  }

  if (budget && budget > 0) {
    list = list.filter((p) => p.price <= budget);
  }

  if (keywords.length > 0) {
    const kws = keywords.map((k) => k.toLowerCase());
    list = list.filter((p) =>
      kws.some(
        (k) =>
          p.name.toLowerCase().includes(k) ||
          p.description.toLowerCase().includes(k) ||
          p.tags.some((t) => t.toLowerCase().includes(k))
      )
    );
  }

  // Sort: cheapest first (helps budget-conscious customers)
  list.sort((a, b) => a.price - b.price);

  return list.slice(0, limit);
}
