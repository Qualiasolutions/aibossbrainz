export interface ExcelExportOptions {
	filename: string;
	sheetName?: string;
}

export async function exportToExcel(
	text: string,
	options: ExcelExportOptions,
): Promise<void> {
	// Dynamic import to reduce bundle size (~100KB savings)
	const ExcelJS = await import("exceljs");

	const { filename, sheetName = "Message" } = options;

	// Split text into paragraphs for better formatting
	const paragraphs = text.split(/\n\n+/).filter(Boolean);

	// Create workbook and worksheet
	const workbook = new ExcelJS.Workbook();
	const worksheet = workbook.addWorksheet(sheetName);

	// Add headers
	worksheet.columns = [
		{ header: "Section", key: "section", width: 10 },
		{ header: "Content", key: "content", width: 100 },
	];

	// Add data rows
	for (const [index, paragraph] of paragraphs.entries()) {
		worksheet.addRow({
			section: index + 1,
			content: paragraph.trim(),
		});
	}

	// Style header row
	const headerRow = worksheet.getRow(1);
	headerRow.font = { bold: true };
	headerRow.fill = {
		type: "pattern",
		pattern: "solid",
		fgColor: { argb: "FFE0E0E0" },
	};

	// Generate buffer and trigger download
	const buffer = await workbook.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
	const url = URL.createObjectURL(blob);

	const link = document.createElement("a");
	link.href = url;
	link.download = `${filename}.xlsx`;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}
