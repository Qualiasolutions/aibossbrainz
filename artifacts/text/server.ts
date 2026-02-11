import { smoothStream, streamText } from "ai";
import { updateDocumentPrompt } from "@/lib/ai/prompts";
import { myProvider } from "@/lib/ai/providers";
import { createDocumentHandler } from "@/lib/artifacts/server";

const MAX_RETRIES = 3;
const MIN_CONTENT_LENGTH = 50;

export const textDocumentHandler = createDocumentHandler<"text">({
  kind: "text",
  onCreateDocument: async ({ title, dataStream }) => {
    let draftContent = "";

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      draftContent = "";

      try {
        const { fullStream } = streamText({
          model: myProvider.languageModel("artifact-model"),
          system: `You are a professional document writer. Create a comprehensive, well-structured document based on the title provided.

Guidelines:
- Use clear markdown formatting with headers, bullet points, and sections
- Structure content logically with introduction, main sections, and conclusion where appropriate
- Be thorough but concise - aim for actionable, valuable content
- Use professional business language appropriate for executive audiences`,
          experimental_transform: smoothStream({ chunking: "word" }),
          prompt: `Create a detailed document titled: "${title}"`,
        });

        for await (const delta of fullStream) {
          const { type } = delta;

          if (type === "text-delta") {
            const { text } = delta;

            draftContent += text;

            dataStream.write({
              type: "data-textDelta",
              data: text,
              transient: true,
            });
          }
        }

        // Log successful generation for debugging
        console.log(`[Document] Generated "${title}" with ${draftContent.length} chars (attempt ${attempt})`);

        // If we got enough content, break out of retry loop
        if (draftContent.trim().length >= MIN_CONTENT_LENGTH) {
          break;
        }

        console.warn(`[Document] Content too short (${draftContent.length} chars) for "${title}", attempt ${attempt}/${MAX_RETRIES}`);

        // On retry, clear previous partial content in the UI
        if (attempt < MAX_RETRIES) {
          dataStream.write({
            type: "data-clear",
            data: null,
            transient: true,
          });
          // Brief delay before retry
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      } catch (error) {
        console.error(`[Document] Error generating content (attempt ${attempt}/${MAX_RETRIES}):`, error);

        if (attempt >= MAX_RETRIES) {
          // Final attempt failed - provide fallback content
          draftContent = `# ${title}\n\n*Document generation encountered an error. Please try again or edit this document manually.*`;
          dataStream.write({
            type: "data-textDelta",
            data: draftContent,
            transient: true,
          });
        } else {
          // Clear and retry
          dataStream.write({
            type: "data-clear",
            data: null,
            transient: true,
          });
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    // Ensure we never return empty content
    if (!draftContent || draftContent.trim() === "") {
      console.error(`[Document] Empty content for "${title}" after ${MAX_RETRIES} attempts, using fallback`);
      draftContent = `# ${title}\n\n*Content generation completed but produced no output. Please edit this document manually.*`;
    }

    return draftContent;
  },
  onUpdateDocument: async ({ document, description, dataStream }) => {
    let draftContent = "";

    try {
      const { fullStream } = streamText({
        model: myProvider.languageModel("artifact-model"),
        system: updateDocumentPrompt(document.content, "text"),
        experimental_transform: smoothStream({ chunking: "word" }),
        prompt: description,
        providerOptions: {
          openai: {
            prediction: {
              type: "content",
              content: document.content,
            },
          },
        },
      });

      for await (const delta of fullStream) {
        const { type } = delta;

        if (type === "text-delta") {
          const { text } = delta;

          draftContent += text;

          dataStream.write({
            type: "data-textDelta",
            data: text,
            transient: true,
          });
        }
      }
    } catch (error) {
      console.error("Error updating document content:", error);
      // Keep original content if update fails
      draftContent = document.content ?? "";
      dataStream.write({
        type: "data-textDelta",
        data: draftContent,
        transient: true,
      });
    }

    return draftContent;
  },
});
