"use client";

import { BookOpen, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCsrf } from "@/hooks/use-csrf";

export default function KnowledgeBasePage() {
  const [transcriptId, setTranscriptId] = useState("");
  const [botType, setBotType] = useState<string>("shared");
  const [isIngesting, setIsIngesting] = useState(false);
  const { csrfFetch } = useCsrf();

  async function handleIngest() {
    if (!transcriptId.trim()) {
      toast.error("Please enter a Fireflies Transcript ID");
      return;
    }

    setIsIngesting(true);

    try {
      const response = await csrfFetch(
        "/api/admin/knowledge-base/fireflies",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcriptId: transcriptId.trim(),
            botType,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          toast.error("This transcript has already been ingested");
        } else {
          toast.error(data.error || "Failed to ingest transcript");
        }
        return;
      }

      toast.success(`Ingested: ${data.title}`);
      setTranscriptId("");
    } catch {
      toast.error("Failed to connect to server");
    } finally {
      setIsIngesting(false);
    }
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-neutral-900">Knowledge Base</h1>
        <p className="text-neutral-500 mt-1">
          Manage AI executive knowledge sources. Ingest call transcripts and
          documents.
        </p>
      </div>

      <div className="grid gap-6 max-w-xl">
        <Card className="border-neutral-200 bg-white shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-50 p-2">
                <BookOpen className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-neutral-900">
                  Fireflies Transcript Ingestion
                </CardTitle>
                <CardDescription className="text-neutral-500">
                  Import a call transcript from Fireflies.ai into the executive
                  knowledge base.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="transcriptId">Fireflies Transcript ID</Label>
              <Input
                id="transcriptId"
                placeholder="e.g. abc123def456"
                value={transcriptId}
                onChange={(e) => setTranscriptId(e.target.value)}
                disabled={isIngesting}
              />
              <p className="text-xs text-neutral-400">
                Find this in your Fireflies dashboard under the transcript URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="botType">Assign to Executive</Label>
              <Select
                value={botType}
                onValueChange={setBotType}
                disabled={isIngesting}
              >
                <SelectTrigger id="botType">
                  <SelectValue placeholder="Select executive" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="alexandria">
                    Alexandria (CMO)
                  </SelectItem>
                  <SelectItem value="kim">Kim (CSO)</SelectItem>
                  <SelectItem value="shared">
                    Shared (Both)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleIngest}
              disabled={isIngesting || !transcriptId.trim()}
              className="w-full"
            >
              {isIngesting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Ingesting...
                </>
              ) : (
                "Ingest Transcript"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
