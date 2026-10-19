import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const router = Router();

// Ensure uploads folder exists in working directory
const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  try {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  } catch (err) {
    console.error("Failed to create uploads directory:", err);
  }
}

// POST /api/upload
// Accepts { data: "data:image/png;base64,...", name: "screenshot.png", type: "image/png" }
router.post("/", async (req, res, next) => {
  try {
    const { data, name, type } = req.body;

    if (!data || typeof data !== "string") {
      return res.status(400).json({ error: "No media data provided in payload" });
    }

    let fileBuffer: Buffer;
    let extension = "png";

    if (data.startsWith("data:")) {
      const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (matches && matches.length === 3) {
        const mimeType = matches[1];
        fileBuffer = Buffer.from(matches[2], "base64");
        if (mimeType.includes("jpeg") || mimeType.includes("jpg")) extension = "jpg";
        else if (mimeType.includes("webp")) extension = "webp";
        else if (mimeType.includes("gif")) extension = "gif";
        else if (mimeType.includes("pdf")) extension = "pdf";
        else if (mimeType.includes("svg")) extension = "svg";
      } else {
        fileBuffer = Buffer.from(data, "base64");
      }
    } else {
      fileBuffer = Buffer.from(data, "base64");
    }

    if (name && name.includes(".")) {
      const ext = name.split(".").pop();
      if (ext && /^[a-zA-Z0-9]+$/.test(ext)) {
        extension = ext.toLowerCase();
      }
    }

    const uniqueId = crypto.randomBytes(8).toString("hex");
    const sanitizedName = (name ? name.replace(/[^a-zA-Z0-9._-]/g, "_") : `media_${Date.now()}`);
    const filename = `${Date.now()}_${uniqueId}_${sanitizedName}`;
    const filePath = path.join(UPLOADS_DIR, filename);

    await fs.promises.writeFile(filePath, fileBuffer);

    // Return the relative URL served by Express static
    const publicUrl = `/uploads/${filename}`;
    res.status(201).json({
      success: true,
      url: publicUrl,
      name: name || filename,
      size: fileBuffer.length,
      mimeType: type || `image/${extension}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    next(error);
  }
});

export default router;
