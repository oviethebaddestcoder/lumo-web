import type { UploadContentType, UploadStart, UploadStartInput, UploadedPart, Video } from "@/lib/types";

export type MediaApi = {
  startUpload(input: UploadStartInput): Promise<UploadStart>;
  partUrls(id: string, from: number, to: number): Promise<{ from: number; part_urls: string[] }>;
  complete(id: string, parts: UploadedPart[]): Promise<Video>;
};

export type Progress = { sent: number; total: number; partsDone: number; parts: number };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Browser multipart upload: 16 MiB parts PUT straight to S3 via presigned
 * URLs (the bucket's CORS must allow PUT from this origin and expose ETag).
 * Parts retry independently; URLs are re-signed when they expire.
 */
export async function uploadFile(
  media: MediaApi,
  file: Blob,
  input: Omit<UploadStartInput, "size_bytes">,
  opts: { onProgress?: (p: Progress) => void; signal?: AbortSignal; concurrency?: number; fetchFn?: typeof fetch } = {},
): Promise<Video> {
  const fetchFn = opts.fetchFn ?? fetch;
  const start = await media.startUpload({ ...input, size_bytes: file.size });
  const urls = new Map<number, string>();
  start.part_urls.forEach((u, i) => urls.set(i + 1, u));
  const etags: UploadedPart[] = [];
  let sent = 0;
  const report = () => opts.onProgress?.({ sent, total: file.size, partsDone: etags.length, parts: start.parts });
  report();

  const urlFor = async (n: number, fresh: boolean) => {
    if (!fresh && urls.has(n)) return urls.get(n)!;
    const res = await media.partUrls(start.video_id, n, Math.min(start.parts, n + 199));
    res.part_urls.forEach((u, i) => urls.set(res.from + i, u));
    return urls.get(n)!;
  };

  const put = async (n: number) => {
    const from = (n - 1) * start.part_size;
    const chunk = file.slice(from, Math.min(file.size, from + start.part_size));
    for (let attempt = 0; ; attempt++) {
      if (opts.signal?.aborted) throw new Error("Upload cancelled.");
      let res: Response | null = null;
      try {
        res = await fetchFn(await urlFor(n, attempt > 0), { method: "PUT", body: chunk, signal: opts.signal });
      } catch {
        if (opts.signal?.aborted) throw new Error("Upload cancelled.");
      }
      if (res?.ok) {
        const etag = res.headers.get("etag");
        if (!etag) throw new Error("Storage didn't return an ETag. Check the bucket's CORS ExposeHeaders.");
        etags.push({ number: n, etag });
        sent += chunk.size;
        report();
        return;
      }
      if (attempt >= 4) throw new Error(`Part ${n} failed to upload. Try again.`);
      await sleep(Math.min(8000, 500 * 2 ** attempt));
    }
  };

  let next = 1;
  const worker = async () => {
    while (next <= start.parts) await put(next++);
  };
  await Promise.all(Array.from({ length: Math.min(opts.concurrency ?? 3, start.parts) }, worker));
  etags.sort((a, b) => a.number - b.number);
  return media.complete(start.video_id, etags);
}

export function contentTypeOf(file: File): UploadContentType {
  if (file.type === "video/quicktime" || /\.mov$/i.test(file.name)) return "video/quicktime";
  if (file.type === "video/webm" || /\.webm$/i.test(file.name)) return "video/webm";
  return "video/mp4";
}
