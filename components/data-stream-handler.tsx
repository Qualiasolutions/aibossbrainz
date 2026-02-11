"use client";

import { useEffect, useRef } from "react";
import { initialArtifactData, useArtifact } from "@/hooks/use-artifact";
import type { ArtifactKind } from "./artifact";
import { artifactDefinitions } from "./artifact";
import { useDataStream } from "./data-stream-provider";

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  // Track the current kind across delta processing to handle kind changes mid-stream
  const currentKindRef = useRef<ArtifactKind>(artifact.kind);

  // Keep the ref in sync with the artifact kind
  useEffect(() => {
    currentKindRef.current = artifact.kind;
  }, [artifact.kind]);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      // CRITICAL: Process data-kind FIRST to update the kind before onStreamPart
      // This fixes the stale closure issue where subsequent events (like data-canvasItem)
      // weren't being processed by the correct artifact handler
      if (delta.type === "data-kind") {
        currentKindRef.current = delta.data as ArtifactKind;
        setArtifact((draftArtifact) => {
          if (!draftArtifact) {
            return {
              ...initialArtifactData,
              kind: delta.data,
              status: "streaming",
            };
          }
          return {
            ...draftArtifact,
            kind: delta.data,
            status: "streaming",
          };
        });
      }

      // Use the ref for current kind to avoid stale closure issues
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === currentKindRef.current,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      // Handle other delta types (skip data-kind as it's already processed above)
      if (delta.type !== "data-kind") {
        setArtifact((draftArtifact) => {
          if (!draftArtifact) {
            return { ...initialArtifactData, status: "streaming" };
          }

          switch (delta.type) {
            case "data-id":
              return {
                ...draftArtifact,
                documentId: delta.data,
                status: "streaming",
              };

            case "data-title":
              return {
                ...draftArtifact,
                title: delta.data,
                status: "streaming",
              };

            case "data-clear":
              return {
                ...draftArtifact,
                content: "",
                status: "streaming",
              };

            case "data-finish":
              return {
                ...draftArtifact,
                status: "idle",
              };

            default:
              return draftArtifact;
          }
        });
      }
    }
  }, [dataStream, setArtifact, setMetadata]);

  return null;
}
