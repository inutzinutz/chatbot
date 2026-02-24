import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/upload
 * Body: multipart/form-data  — field "file" (image / video / pdf / etc.)
 * Returns: { url, publicId, resourceType, format, bytes }
 *
 * Requires env vars:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 */
export async function POST(req: NextRequest) {
  // ── Auth guard (always required) ──
  const businessId = req.nextUrl.searchParams.get("businessId") || "";
  if (!businessId) {
    return NextResponse.json({ error: "Missing businessId query parameter" }, { status: 400 });
  }
  const session = await requireAdminSession(req, businessId);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: "Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET." },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "Missing file field" }, { status: 400 });
  }

  // Max 50 MB
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 50 MB)" }, { status: 413 });
  }

  // Determine resource_type for Cloudinary
  const mime = file.type || "";
  let resourceType: "image" | "video" | "raw" = "raw";
  if (mime.startsWith("image/")) resourceType = "image";
  else if (mime.startsWith("video/")) resourceType = "video";
  else if (mime.startsWith("audio/")) resourceType = "video"; // Cloudinary treats audio as video

  // Convert File to ArrayBuffer → Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64 = buffer.toString("base64");
  const dataUri = `data:${mime};base64,${base64}`;

  // Build signed upload params
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `droidmind/${businessId || "admin"}`;
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`;

  // Create HMAC-SHA1 signature
  const { createHmac } = await import("crypto");
  const signature = createHmac("sha1", apiSecret)
    .update(paramsToSign)
    .digest("hex");

  // Upload to Cloudinary
  const uploadForm = new FormData();
  uploadForm.append("file", dataUri);
  uploadForm.append("api_key", apiKey);
  uploadForm.append("timestamp", String(timestamp));
  uploadForm.append("signature", signature);
  uploadForm.append("folder", folder);

  const cloudinaryRes = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
    {
      method: "POST",
      body: uploadForm,
    }
  );

  if (!cloudinaryRes.ok) {
    const errText = await cloudinaryRes.text().catch(() => "");
    console.error("[Upload] Cloudinary error:", cloudinaryRes.status, errText);
    return NextResponse.json(
      { error: `Cloudinary upload failed: ${cloudinaryRes.status}`, detail: errText },
      { status: 500 }
    );
  }

  const result = await cloudinaryRes.json() as {
    secure_url: string;
    public_id: string;
    resource_type: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
  };

  return NextResponse.json({
    url: result.secure_url,
    publicId: result.public_id,
    resourceType: result.resource_type,
    format: result.format,
    bytes: result.bytes,
    width: result.width,
    height: result.height,
    duration: result.duration,
    fileName: file.name,
    mimeType: mime,
  });
}
