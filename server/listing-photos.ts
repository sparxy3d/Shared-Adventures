import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { Client } from "@replit/object-storage";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "./db";
import { experienceImages, experiences } from "@shared/schema";
import { storage } from "./storage";

export const PHOTO_MAX_BYTES = 10_000_000;
export const PHOTO_WIDTHS = [1600, 800, 400] as const;
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: PHOTO_MAX_BYTES, files: 6, fields: 0 } }).array("photos", 6);

export interface PhotoObjects {
  put(key: string, bytes: Buffer): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}

export class AppStoragePhotos implements PhotoObjects {
  // Client eagerly starts async initialization. Construct only alongside an
  // awaited request operation, never at boot when a bucket may not exist yet.
  private client() {
    const isProduction = process.env.NODE_ENV === "production" || !!process.env.REPLIT_DEPLOYMENT;
    const bucketId = process.env[isProduction ? "LISTING_PHOTOS_BUCKET_PROD" : "LISTING_PHOTOS_BUCKET_DEV"]?.trim();
    if (!bucketId) throw new Error("Listing photo storage is unavailable");
    return new Client({ bucketId });
  }
  async put(key: string, bytes: Buffer) {
    const result = await this.client().uploadFromBytes(key, bytes);
    if (!result.ok) throw new Error("Listing photo storage is unavailable");
  }
  async get(key: string) {
    const result = await this.client().downloadAsBytes(key);
    if (!result.ok) throw new Error("Listing photo storage is unavailable");
    return result.value[0];
  }
  async remove(key: string) {
    const result = await this.client().delete(key, { ignoreNotFound: true });
    if (!result.ok) throw new Error("Listing photo storage is unavailable");
  }
}

// Default Sharp output drops EXIF, GPS, XMP and camera metadata. Never call keepMetadata.
export async function prepareListingPhoto(bytes: Buffer) {
  if (!bytes.length || bytes.length > PHOTO_MAX_BYTES) throw new Error("Each photo must be no larger than 10MB");
  const image = sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000 });
  const meta = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) !== 1) {
    throw new Error("Choose a JPG, PNG or WebP photo");
  }
  const variants = [];
  for (const width of PHOTO_WIDTHS) variants.push({
    width, bytes: await sharp(bytes, { failOn: "warning", limitInputPixels: 40_000_000 })
      .rotate().resize({ width }).webp({ quality: 82 }).toBuffer(),
  });
  return variants;
}

const asyncRoute = (fn: (req: Request, res: Response) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction) => { void fn(req, res).catch(next); };

export function registerPhotoRoutes(app: Express, objects: PhotoObjects = new AppStoragePhotos(), validateCopy: (data: unknown) => void) {
  async function canEdit(req: Request, res: Response) {
    const experienceId = Number(req.params.id);
    if (!Number.isSafeInteger(experienceId) || experienceId < 1) { res.status(400).json({ message: "Choose a valid listing" }); return; }
    const exp = await storage.getExperience(experienceId);
    if (!exp || (res.locals.user?.role !== "admin" && exp.vendorId !== res.locals.vendor?.id)) {
      res.status(404).json({ message: "Listing not found" }); return;
    }
    return exp;
  }
  // Prefix-level admin/vendor guards are already registered before these routes.
  for (const role of ["vendor", "admin"]) {
    const path = `/api/${role}/experiences/:id/photos`;
    app.post(`/api/${role}/experiences/:id/duplicate`, asyncRoute(async (req, res) => {
      const exp = await canEdit(req, res);
      if (!exp) return;
      if (!z.object({}).strict().safeParse(req.body ?? {}).success) return res.status(400).json({ message: "No extra fields are needed to duplicate a listing" });
      const written: string[] = [];
      try {
        const copy = await db.transaction(async tx => {
          const [source] = await tx.select().from(experiences).where(eq(experiences.id, exp.id)).for("update");
          if (!source) throw Object.assign(new Error("Listing not found"), { status: 404 });
          const photos = await tx.select().from(experienceImages).where(eq(experienceImages.experienceId, source.id)).orderBy(experienceImages.sortOrder, experienceImages.id);
          const { id: _id, createdAt: _createdAt, ...details } = source;
          const copyData = {
            ...details, title: `${source.title.slice(0, 53)} (copy)`, status: "draft", isDemo: false, currencyCode: "LKR", imageUrl: null,
          };
          validateCopy(copyData);
          const [draft] = await tx.insert(experiences).values(copyData).returning();
          const originals: { imageUrl: string; storageKey: string | null }[] = photos.length ? photos : source.imageUrl ? [{ imageUrl: source.imageUrl, storageKey: null }] : [];
          let cover: string | null = null;
          for (const [sortOrder, original] of Array.from(originals.entries())) {
            const storageKey = original.storageKey ? `listing-photos/${randomUUID()}` : null;
            if (storageKey) for (const width of PHOTO_WIDTHS) {
              const bytes = await objects.get(`${original.storageKey}/${width}.webp`);
              const key = `${storageKey}/${width}.webp`;
              written.push(key);
              await objects.put(key, bytes);
            }
            const [photo] = await tx.insert(experienceImages).values({
              experienceId: draft.id, imageUrl: storageKey ? "" : original.imageUrl, storageKey, sortOrder,
            }).returning();
            const imageUrl = storageKey ? `/api/listing-images/${photo.id}/1600.webp` : photo.imageUrl;
            if (storageKey) await tx.update(experienceImages).set({ imageUrl }).where(eq(experienceImages.id, photo.id));
            if (sortOrder === 0) cover = imageUrl;
          }
          const [result] = await tx.update(experiences).set({ imageUrl: cover }).where(eq(experiences.id, draft.id)).returning();
          return result;
        });
        res.json(copy);
      } catch (error) {
        await Promise.allSettled(written.map(key => objects.remove(key)));
        if ([400, 404].includes((error as { status?: number }).status ?? 0)) return res.status((error as { status: number }).status).json({ message: (error as Error).message });
        res.status(503).json({ message: "The listing could not be copied. Please check photo storage and try again." });
      }
    }));
    app.get(path, asyncRoute(async (req, res) => {
      const exp = await canEdit(req, res);
      if (exp) res.json(await storage.getListingPhotos(exp.id));
    }));
    app.post(path, asyncRoute(async (req, res) => {
      const exp = await canEdit(req, res);
      if (!exp) return;
      // Authenticate and check ownership BEFORE parsing up to 60MB.
      await new Promise<void>((resolve, reject) => upload(req, res, error => error ? reject(error) : resolve())).catch(error => {
        throw Object.assign(new Error(error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE"
          ? "Each photo must be no larger than 10MB" : "Upload up to 6 JPG, PNG or WebP photos, maximum 10MB each"), { status: 400 });
      });
      const files = req.files as Express.Multer.File[];
      if (!files?.length) return res.status(400).json({ message: "Choose at least one photo" });
      const prepared: Awaited<ReturnType<typeof prepareListingPhoto>>[] = [];
      try { for (const file of files) prepared.push(await prepareListingPhoto(file.buffer)); }
      catch { return res.status(400).json({ message: "Choose a valid JPG, PNG or WebP photo, maximum 10MB each" }); }
      const written: string[] = [];
      try {
        await db.transaction(async tx => {
          await tx.select().from(experiences).where(eq(experiences.id, exp.id)).for("update");
          const current = await tx.select().from(experienceImages).where(eq(experienceImages.experienceId, exp.id));
          if (current.length + files.length > 6) throw Object.assign(new Error("A listing can have up to 6 photos"), { status: 400 });
          // Preserve the old cover when starting a gallery, without copying or deleting its file.
          if (!current.length && exp.imageUrl && files.length < 6) {
            await tx.insert(experienceImages).values({ experienceId: exp.id, imageUrl: exp.imageUrl, sortOrder: 0 });
            current.push({ id: 0, experienceId: exp.id, imageUrl: exp.imageUrl, sortOrder: 0, storageKey: null });
          }
          for (const variants of prepared) {
            const storageKey = `listing-photos/${randomUUID()}`;
            for (const variant of variants) {
              const key = `${storageKey}/${variant.width}.webp`;
              written.push(key);
              await objects.put(key, variant.bytes);
            }
            const [photo] = await tx.insert(experienceImages).values({
              experienceId: exp.id, imageUrl: "", storageKey, sortOrder: current.length,
            }).returning();
            const imageUrl = `/api/listing-images/${photo.id}/1600.webp`;
            await tx.update(experienceImages).set({ imageUrl }).where(eq(experienceImages.id, photo.id));
            if (!current.length) await tx.update(experiences).set({ imageUrl }).where(eq(experiences.id, exp.id));
            current.push({ ...photo, imageUrl });
          }
        });
      } catch (error) {
        await Promise.allSettled(written.map(key => objects.remove(key)));
        if (error && typeof error === "object" && "status" in error) throw error;
        return res.status(503).json({ message: "Photo storage is not ready. Please try again after App Storage is configured." });
      }
      res.json(await storage.getListingPhotos(exp.id));
    }));
    app.put(path, asyncRoute(async (req, res) => {
      const exp = await canEdit(req, res);
      if (!exp) return;
      const { z } = await import("zod");
      const parsed = z.object({ photoIds: z.array(z.number().int().positive()).max(6) }).strict().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "Choose a valid photo order" });
      const success = await db.transaction(async tx => {
        await tx.select().from(experiences).where(eq(experiences.id, exp.id)).for("update");
        const photos = await tx.select().from(experienceImages).where(eq(experienceImages.experienceId, exp.id));
        const ids = parsed.data.photoIds;
        if (new Set(ids).size !== ids.length || ids.length !== photos.length || ids.some(id => !photos.some(photo => photo.id === id))) return false;
        for (const [sortOrder, id] of Array.from(ids.entries())) await tx.update(experienceImages).set({ sortOrder }).where(eq(experienceImages.id, id));
        const cover = photos.find(photo => photo.id === ids[0]);
        if (cover) await tx.update(experiences).set({ imageUrl: cover.imageUrl }).where(eq(experiences.id, exp.id));
        return true;
      });
      if (!success) return res.status(400).json({ message: "Photo list changed. Refresh and try again." });
      res.json(await storage.getListingPhotos(exp.id));
    }));
    app.delete(`${path}/:photoId`, asyncRoute(async (req, res) => {
      const exp = await canEdit(req, res);
      if (!exp) return;
      const photoId = Number(req.params.photoId);
      if (!Number.isSafeInteger(photoId) || photoId < 1) return res.status(400).json({ message: "Choose a valid photo" });
      try {
        const removed = await db.transaction(async tx => {
          await tx.select().from(experiences).where(eq(experiences.id, exp.id)).for("update");
          const [photo] = await tx.select().from(experienceImages)
            .where(and(eq(experienceImages.id, photoId), eq(experienceImages.experienceId, exp.id)));
          if (!photo) return false;
          if (photo.storageKey) for (const width of PHOTO_WIDTHS) await objects.remove(`${photo.storageKey}/${width}.webp`);
          await tx.delete(experienceImages).where(eq(experienceImages.id, photo.id));
          const photos = await tx.select().from(experienceImages).where(eq(experienceImages.experienceId, exp.id)).orderBy(experienceImages.sortOrder, experienceImages.id);
          for (const [sortOrder, row] of Array.from(photos.entries())) await tx.update(experienceImages).set({ sortOrder }).where(eq(experienceImages.id, row.id));
          await tx.update(experiences).set({ imageUrl: photos[0]?.imageUrl ?? null }).where(eq(experiences.id, exp.id));
          return true;
        });
        if (!removed) return res.status(404).json({ message: "Photo not found" });
        res.json(await storage.getListingPhotos(exp.id));
      } catch { res.status(503).json({ message: "Photo could not be removed from storage. Please try again." }); }
    }));
  }
  app.get("/api/experiences/:id/photos", asyncRoute(async (req, res) => {
    const exp = await storage.getPublicExperience(Number(req.params.id));
    if (!exp) return res.status(404).json({ message: "Activity not found" });
    res.json(await storage.getListingPhotos(exp.id));
  }));
  app.get("/api/listing-images/:photoId/:variant", asyncRoute(async (req, res) => {
    if (!Number.isSafeInteger(Number(req.params.photoId)) || Number(req.params.photoId) < 1) return res.status(404).end();
    const width = Number(String(req.params.variant).replace(/\.webp$/, ""));
    if (!PHOTO_WIDTHS.includes(width as typeof PHOTO_WIDTHS[number]) || !/^\d+\.webp$/.test(String(req.params.variant))) {
      return res.status(404).end();
    }
    const [photo] = await db.select().from(experienceImages).where(eq(experienceImages.id, Number(req.params.photoId)));
    if (!photo?.storageKey) return res.status(404).end();
    let visible = !!await storage.getPublicExperience(photo.experienceId);
    if (!visible && req.session.userId) {
      const user = await storage.getUser(req.session.userId);
      const exp = await storage.getExperience(photo.experienceId);
      const vendor = user?.role === "vendor" ? await storage.getVendorByOwner(user.id) : undefined;
      visible = user?.role === "admin" || !!(vendor && exp?.vendorId === vendor.id);
    }
    if (!visible) return res.status(404).end();
    try {
      const bytes = await objects.get(`${photo.storageKey}/${width}.webp`);
      res.set({ "Content-Type": "image/webp", "Cache-Control": "private, no-cache", "X-Content-Type-Options": "nosniff" }).send(bytes);
    } catch { res.status(503).end(); }
  }));
}
