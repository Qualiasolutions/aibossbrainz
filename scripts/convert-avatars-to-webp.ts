#!/usr/bin/env tsx

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const INPUT_DIR = "public/images";
const OUTPUT_DIR = "public/images";

const AVATAR_FILES = [
	"alex-avatar.png",
	"kim-avatar.png",
	"collaborative-avatar.png",
];

interface ConversionResult {
	filename: string;
	inputSize: number;
	outputSize: number;
	reduction: number;
	hasAlpha: boolean;
}

async function convertToWebP(filename: string): Promise<ConversionResult> {
	const inputPath = join(INPUT_DIR, filename);
	const outputFilename = filename.replace(".png", ".webp");
	const outputPath = join(OUTPUT_DIR, outputFilename);

	try {
		// Read input file to get size
		const inputBuffer = await readFile(inputPath);
		const inputSize = inputBuffer.length;

		// Check metadata for alpha channel
		const metadata = await sharp(inputBuffer).metadata();
		const hasAlpha = metadata.hasAlpha || false;

		// Convert to WebP with quality settings
		// Use quality 85 with alphaQuality 100 for transparency preservation
		const webpBuffer = await sharp(inputBuffer)
			.webp({
				quality: 85,
				alphaQuality: 100, // Preserve alpha channel quality
				lossless: false,
			})
			.toBuffer();

		// Write output file
		await writeFile(outputPath, webpBuffer);
		const outputSize = webpBuffer.length;

		// Calculate reduction percentage
		const reduction = ((inputSize - outputSize) / inputSize) * 100;

		return {
			filename,
			inputSize,
			outputSize,
			reduction,
			hasAlpha,
		};
	} catch (error) {
		console.error(`Failed to convert ${filename}:`, error);
		throw error;
	}
}

function formatBytes(bytes: number): string {
	return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

async function main() {
	console.log("Starting avatar conversion to WebP...\n");

	const results: ConversionResult[] = [];

	for (const filename of AVATAR_FILES) {
		try {
			console.log(`Converting ${filename}...`);
			const result = await convertToWebP(filename);
			results.push(result);

			console.log(`  Input:  ${formatBytes(result.inputSize)}`);
			console.log(`  Output: ${formatBytes(result.outputSize)}`);
			console.log(`  Reduction: ${result.reduction.toFixed(1)}%`);
			console.log(`  Alpha channel: ${result.hasAlpha ? "Yes" : "No"}`);
			console.log("");
		} catch (_error) {
			console.error(`Failed to convert ${filename}, skipping...`);
		}
	}

	// Summary
	console.log("=== Conversion Summary ===");
	console.log(
		`Total files converted: ${results.length}/${AVATAR_FILES.length}`,
	);

	if (results.length > 0) {
		const totalInputSize = results.reduce((sum, r) => sum + r.inputSize, 0);
		const totalOutputSize = results.reduce((sum, r) => sum + r.outputSize, 0);
		const avgReduction =
			results.reduce((sum, r) => sum + r.reduction, 0) / results.length;

		console.log(`Total input size:  ${formatBytes(totalInputSize)}`);
		console.log(`Total output size: ${formatBytes(totalOutputSize)}`);
		console.log(`Average reduction: ${avgReduction.toFixed(1)}%`);
	}

	console.log(
		"\nOriginal PNG files kept for rollback (delete after 1-2 sprints).",
	);
}

main().catch((error) => {
	console.error("Conversion failed:", error);
	process.exit(1);
});
