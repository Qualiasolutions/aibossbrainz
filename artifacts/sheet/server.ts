import { streamObject } from "ai";
import { z } from "zod";
import { sheetPrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

const MAX_RETRIES = 3;
const MIN_CONTENT_LENGTH = 10;

export const sheetDocumentHandler = createDocumentHandler<"sheet">({
  kind: "sheet",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      draftContent = "";

      try {
        const { fullStream } = streamObject({
          model: myProvider.languageModel("artifact-model"),
          system: sheetPrompt,
          prompt: title,
          schema: z.object({
            csv: z.string().describe("CSV data"),
          }),
        });

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === "object") {
            const { object } = delta;
            const { csv } = object;

            if (csv) {
              dataStream.write({
                type: "data-sheetDelta",
                data: csv,
                transient: true,
              });

              draftContent = csv;
            }
          }
        }

        dataStream.write({
          type: "data-sheetDelta",
          data: draftContent,
          transient: true,
        });

        if (draftContent.trim().length >= MIN_CONTENT_LENGTH) {
          break;
        }

        console.warn(`[Sheet] Content too short (${draftContent.length} chars), attempt ${attempt}/${MAX_RETRIES}`);
        if (attempt < MAX_RETRIES) {
          dataStream.write({ type: "data-clear", data: null, transient: true });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        console.error(`[Sheet] Error generating content (attempt ${attempt}/${MAX_RETRIES}):`, error);
        if (attempt >= MAX_RETRIES) {
          draftContent = "Column A,Column B\nData,Data";
          dataStream.write({ type: "data-sheetDelta", data: draftContent, transient: true });
        } else {
          dataStream.write({ type: "data-clear", data: null, transient: true });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!draftContent || draftContent.trim() === "") {
      draftContent = "Column A,Column B\nData,Data";
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    try {
      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: updateDocumentPrompt(document.content, "sheet"),
        prompt: description,
        schema: z.object({
          csv: z.string(),
        }),
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          const { csv } = object;

          if (csv) {
            dataStream.write({
              type: "data-sheetDelta",
              data: csv,
              transient: true,
            });

            draftContent = csv;
          }
        }
      }
    } catch (error) {
      console.error("Error updating sheet content:", error);
      draftContent = document.content ?? "";
      dataStream.write({ type: "data-sheetDelta", data: draftContent, transient: true });
    }

    return draftContent;
  },
});
