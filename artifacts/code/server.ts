import { streamObject } from "ai";
import { z } from "zod";
import { codePrompt, updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";
import { logger } from "@/lib/logger";

const MAX_RETRIES = 3;
const MIN_CONTENT_LENGTH = 20;

export const codeDocumentHandler = createDocumentHandler<"code">({
  kind: "code",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      draftContent = "";

      try {
        const { fullStream } = streamObject({
          model: myProvider.languageModel("artifact-model"),
          system: codePrompt,
          prompt: title,
          schema: z.object({
            code: z.string(),
          }),
        });

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === "object") {
            const { object } = delta;
            const { code } = object;

            if (code) {
              dataStream.write({
                type: "data-codeDelta",
                data: code ?? "",
                transient: true,
              });

              draftContent = code;
            }
          }
        }

        if (draftContent.trim().length >= MIN_CONTENT_LENGTH) {
          break;
        }

        logger.warn({ chars: draftContent.length, attempt, maxRetries: MAX_RETRIES }, "Code content too short, retrying");
        if (attempt < MAX_RETRIES) {
          dataStream.write({ type: "data-clear", data: null, transient: true });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        logger.error({ err: error, attempt, maxRetries: MAX_RETRIES }, "Error generating code content");
        if (attempt >= MAX_RETRIES) {
          draftContent = `// Error generating code for: ${title}\n// Please try again or write your code here.`;
          dataStream.write({ type: "data-codeDelta", data: draftContent, transient: true });
        } else {
          dataStream.write({ type: "data-clear", data: null, transient: true });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    if (!draftContent || draftContent.trim() === "") {
      draftContent = `// Code generation produced no output for: ${title}\n// Please write your code here.`;
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    try {
      const { fullStream } = streamObject({
        model: myProvider.languageModel("artifact-model"),
        system: updateDocumentPrompt(document.content, "code"),
        prompt: description,
        schema: z.object({
          code: z.string(),
        }),
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "object") {
          const { object } = delta;
          const { code } = object;

          if (code) {
            dataStream.write({
              type: "data-codeDelta",
              data: code ?? "",
              transient: true,
            });

            draftContent = code;
          }
        }
      }
    } catch (error) {
      logger.error({ err: error }, "Error updating code content");
      draftContent = document.content ?? "";
      dataStream.write({ type: "data-codeDelta", data: draftContent, transient: true });
    }

    return draftContent;
  },
});
