import fs from "node:fs/promises";
import path from "node:path";
import mammoth from "mammoth";

const KNOWLEDGE_BASE_PATH = path.join(process.cwd(), "knowledge-base");

async function convertFile(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  const basename = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  const outputPath = path.join(dir, `${basename}.md`);

  try {
    // Check if markdown already exists
    try {
      await fs.access(outputPath);
      console.log(`Skipping ${basename}, markdown already exists.`);
      return;
    } catch {
      // Continue if file doesn't exist
    }

    let text = "";

    if (ext === ".pdf") {
      console.warn(
        `Skipping ${basename}.pdf: PDF conversion temporarily disabled due to library issues.`,
      );
      return;
    }
    if (ext === ".docx") {
      console.log(`Converting ${basename}.docx...`);
      const buffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else {
      return;
    }

    if (text) {
      await fs.writeFile(outputPath, text);
      console.log(`Created ${basename}.md`);
    }
  } catch (error) {
    console.error(`Error converting ${filePath}:`, error);
  }
}

async function processDirectory(dirPath: string) {
  try {
    const files = await fs.readdir(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stat = await fs.stat(filePath);

      if (stat.isDirectory()) {
        await processDirectory(filePath);
      } else {
        await convertFile(filePath);
      }
    }
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error);
  }
}

async function main() {
  console.log("Starting Knowledge Base conversion...");
  await processDirectory(KNOWLEDGE_BASE_PATH);
  console.log("Conversion complete.");
}

main().catch(console.error);
