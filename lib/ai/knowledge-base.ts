import fs from "node:fs/promises";
import path from "node:path";
import { requestCoalescer } from "@/lib/request-coalescer";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge-base");

// Memory cache for knowledge base content with longer TTL
const cache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes (increased from 30 - KB rarely changes)

// Maximum file size to parse (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Maximum cache entries to prevent unbounded memory growth
const MAX_CACHE_ENTRIES = 10;

// Timeout for knowledge base loading to prevent blocking requests
const KB_LOAD_TIMEOUT = 10000; // 10 seconds

// Track if knowledge base has been preloaded
let preloaded = false;

/**
 * Wraps a promise with a timeout. Returns fallback value if timeout is reached.
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback: T,
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(
        `[Knowledge Base] Load timeout after ${timeoutMs}ms, using fallback`,
      );
      resolve(fallback);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    console.warn("[Knowledge Base] Load failed, using fallback:", error);
    return fallback;
  }
}

// File-level cache to avoid re-parsing individual files
// Limited to prevent unbounded memory growth
const fileCache = new Map<string, { content: string; mtime: number }>();
const MAX_FILE_CACHE_ENTRIES = 50;

/**
 * Evicts oldest file cache entries when limit is reached
 */
function evictOldestFileCacheEntries(): void {
  if (fileCache.size <= MAX_FILE_CACHE_ENTRIES) {
    return;
  }
  // Remove oldest entries (first inserted) until under limit
  const keysToDelete = Array.from(fileCache.keys()).slice(
    0,
    fileCache.size - MAX_FILE_CACHE_ENTRIES,
  );
  for (const key of keysToDelete) {
    fileCache.delete(key);
  }
}

async function parsePDF(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const pdfParse = new PDFParse({ data: buffer });
    // @ts-expect-error - pdf-parse v2 marks load() as private but it needs to be called
    await pdfParse.load();
    const result = await pdfParse.getText();
    // getText() returns TextResult which has a text property
    const text = typeof result === "string" ? result : (result?.text ?? "");
    return text || "[Unable to extract text from PDF]";
  } catch {
    return "[Error parsing PDF file]";
  }
}

async function parseDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = (await import("mammoth")).default;
    const result = await mammoth.extractRawText({ buffer });
    return result.value || "[Unable to extract text from DOCX]";
  } catch {
    return "[Error parsing DOCX file]";
  }
}

async function parseXLSX(buffer: Buffer): Promise<string> {
  try {
    const ExcelJS = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    // Use Uint8Array which exceljs accepts
    const uint8Array = new Uint8Array(buffer);
    await workbook.xlsx.load(uint8Array.buffer as ArrayBuffer);

    let content = "";
    for (const worksheet of workbook.worksheets) {
      content += `\n## Sheet: ${worksheet.name}\n`;

      worksheet.eachRow((row, _rowNumber) => {
        const values = row.values as (
          | string
          | number
          | boolean
          | Date
          | null
          | undefined
        )[];
        // Skip first element (row.values is 1-indexed, index 0 is undefined)
        const rowValues = values.slice(1).map((cell) => {
          if (cell === null || cell === undefined) return "";
          if (cell instanceof Date) return cell.toISOString();
          return String(cell);
        });
        content += `${rowValues.join("\t")}\n`;
      });
    }

    return content || "[Empty spreadsheet]";
  } catch {
    return "[Error parsing XLSX file]";
  }
}

async function parseFile(filePath: string, fileName: string): Promise<string> {
  const ext = path.extname(fileName).toLowerCase();

  // Skip media files immediately by extension (before stat() to avoid slow file operations)
  const mediaExtensions = [
    ".mp4",
    ".mp3",
    ".avi",
    ".mov",
    ".wav",
    ".m4a",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pptx",
    ".ppt",
  ];
  if (mediaExtensions.includes(ext)) {
    console.log(`[Knowledge Base] Skipping media file: ${fileName}`);
    return `[Media file: ${fileName} - content not extracted]`;
  }

  // Check file-level cache first
  try {
    const stats = await fs.stat(filePath);
    const cached = fileCache.get(filePath);

    // Return cached content if file hasn't been modified
    if (cached && cached.mtime === stats.mtimeMs) {
      return cached.content;
    }

    if (stats.size > MAX_FILE_SIZE) {
      console.log(
        `[Knowledge Base] Skipping large file: ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB)`,
      );
      return `[File too large: ${fileName} (${Math.round(stats.size / 1024 / 1024)}MB > ${MAX_FILE_SIZE / 1024 / 1024}MB limit)]`;
    }

    // Parse file
    let content: string;

    // Text-based files
    if (ext === ".md" || ext === ".txt") {
      content = await fs.readFile(filePath, "utf-8");
    } else {
      // Binary files that need parsing
      const buffer = await fs.readFile(filePath);

      if (ext === ".pdf") {
        content = await parsePDF(buffer);
      } else if (ext === ".docx" || ext === ".doc") {
        content = await parseDOCX(buffer);
      } else if (ext === ".xlsx" || ext === ".xls") {
        content = await parseXLSX(buffer);
      } else {
        content = `[Unsupported file format: ${ext}]`;
      }
    }

    // Evict old entries before adding new one
    evictOldestFileCacheEntries();

    // Cache the parsed content with mtime
    fileCache.set(filePath, { content, mtime: stats.mtimeMs });
    return content;
  } catch {
    return `[Error accessing file: ${fileName}]`;
  }
}

async function readDirectoryContent(dirPath: string): Promise<string> {
  try {
    await fs.access(dirPath);
  } catch {
    return "";
  }

  const files = await fs.readdir(dirPath, { withFileTypes: true });
  const contentParts: string[] = [];

  // Process files in parallel for better performance
  const filePromises = files
    .filter((file) => file.isFile())
    .map(async (file) => {
      const filePath = path.join(dirPath, file.name);
      try {
        const fileContent = await parseFile(filePath, file.name);
        return `\n\n--- ${file.name} ---\n${fileContent}`;
      } catch {
        return `\n\n--- ${file.name} ---\n[Error reading file]`;
      }
    });

  const results = await Promise.all(filePromises);
  contentParts.push(...results);

  // Check for subdirectories
  for (const item of files) {
    if (item.isDirectory()) {
      const subDirPath = path.join(dirPath, item.name);
      const subContent = await readDirectoryContent(subDirPath);
      if (subContent) {
        contentParts.push(`\n\n=== Folder: ${item.name} ===\n${subContent}`);
      }
    }
  }

  return contentParts.join("");
}

/**
 * Evicts oldest cache entries when limit is reached (LRU-like behavior)
 */
function evictOldestEntries(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) {
    return;
  }

  // Find oldest entries
  const entries = Array.from(cache.entries()).sort(
    (a, b) => a[1].timestamp - b[1].timestamp,
  );

  // Remove oldest entries until we're under the limit
  while (cache.size > MAX_CACHE_ENTRIES && entries.length > 0) {
    const oldest = entries.shift();
    if (oldest) {
      cache.delete(oldest[0]);
    }
  }
}

export async function getKnowledgeBaseContent(
  botType: string,
): Promise<string> {
  // Check cache first
  const cached = cache.get(botType);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    // Update timestamp for LRU behavior
    cached.timestamp = Date.now();
    return cached.content;
  }

  // Wrap with timeout to prevent blocking the request too long
  return withTimeout(
    requestCoalescer.coalesce(`kb:${botType}`, async () => {
      // Double-check cache after acquiring coalescer lock
      const recheck = cache.get(botType);
      if (recheck && Date.now() - recheck.timestamp < CACHE_TTL) {
        recheck.timestamp = Date.now();
        return recheck.content;
      }

      try {
        let content = "";

        if (botType === "alexandria") {
          const dirPath = path.join(KNOWLEDGE_BASE_PATH, "alexandria");
          content = await readDirectoryContent(dirPath);
        } else if (botType === "kim") {
          const dirPath = path.join(KNOWLEDGE_BASE_PATH, "kim");
          content = await readDirectoryContent(dirPath);
        } else if (botType === "collaborative") {
          // Load all directories in parallel for collaborative mode
          const [alexandriaContent, kimContent, sharedContent] =
            await Promise.all([
              (async () => {
                const dirPath = path.join(KNOWLEDGE_BASE_PATH, "alexandria");
                return await readDirectoryContent(dirPath);
              })(),
              (async () => {
                const dirPath = path.join(KNOWLEDGE_BASE_PATH, "kim");
                return await readDirectoryContent(dirPath);
              })(),
              (async () => {
                const dirPath = path.join(KNOWLEDGE_BASE_PATH, "shared");
                return await readDirectoryContent(dirPath);
              })(),
            ]);

          content = `\n\n=== Alexandria's Knowledge ===\n${alexandriaContent}\n\n=== Kim's Knowledge ===\n${kimContent}`;
          if (sharedContent) {
            content += `\n\n=== Shared Knowledge ===\n${sharedContent}`;
          }
        } else {
          return "";
        }

        // Evict old entries before adding new one
        evictOldestEntries();

        // Cache the result
        cache.set(botType, { content, timestamp: Date.now() });

        return content;
      } catch {
        return "";
      }
    }),
    KB_LOAD_TIMEOUT,
    "", // Empty fallback if timeout
  );
}

/**
 * Preloads knowledge base content for all bot types.
 * Call this during server startup or build time to avoid cold start latency.
 */
export async function preloadKnowledgeBase(): Promise<void> {
  if (preloaded) {
    return;
  }

  const botTypes = ["alexandria", "kim", "collaborative"];

  await Promise.all(
    botTypes.map(async (botType) => {
      try {
        await getKnowledgeBaseContent(botType);
      } catch {
        // Silently fail - knowledge base is optional
      }
    }),
  );

  preloaded = true;
}

/**
 * Clears the knowledge base cache. Useful for testing or manual refresh.
 */
export function clearKnowledgeBaseCache(): void {
  cache.clear();
  preloaded = false;
}
