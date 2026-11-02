import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ── Cloudinary storage — for general uploads (images etc.) ──────────────────
const cloudinaryStorage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: "blog_uploads",
        allowed_formats: ["jpg", "png", "jpeg", "webp", "pdf"],
        resource_type: "auto"
    },
});

// ── Local disk storage — for task proof files (avoids Cloudinary ACL) ───────
const proofsDir = path.join(__dirname, "../uploads/proofs");
if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });

const localProofStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, proofsDir),
    filename: (req, file, cb) => {
        const unique = `${Date.now()}_${Math.round(Math.random() * 1e9)}`;
        const ext    = path.extname(file.originalname);
        cb(null, `proof_${unique}${ext}`);
    }
});

// ── Task proofs also go to Cloudinary (Render's disk is wiped on every deploy) ──
const proofStorage = new CloudinaryStorage({
    cloudinary,
    params: { folder: "task_proofs", resource_type: "auto" },
});

export const upload           = multer({ storage: cloudinaryStorage });
export const uploadProofLocal = multer({ storage: proofStorage, limits: { fileSize: 10 * 1024 * 1024 } });

export default upload;