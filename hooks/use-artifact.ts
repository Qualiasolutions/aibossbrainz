"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { UIArtifact } from "@/components/artifact";

export const initialArtifactData: UIArtifact = {
	documentId: "init",
	content: "",
	kind: "text",
	title: "",
	status: "idle",
	isVisible: false,
	boundingBox: {
		top: 0,
		left: 0,
		width: 0,
		height: 0,
	},
};

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
	const { data: localArtifact } = useSWR<UIArtifact>("artifact", null, {
		fallbackData: initialArtifactData,
	});

	const selectedValue = useMemo(() => {
		if (!localArtifact) {
			return selector(initialArtifactData);
		}
		return selector(localArtifact);
	}, [localArtifact, selector]);

	return selectedValue;
}

export function useArtifact() {
	const { data: localArtifact, mutate: setLocalArtifact } = useSWR<UIArtifact>(
		"artifact",
		null,
		{
			fallbackData: initialArtifactData,
		},
	);

	const artifact = useMemo(() => {
		if (!localArtifact) {
			return initialArtifactData;
		}
		return localArtifact;
	}, [localArtifact]);

	const setArtifact = useCallback(
		(updaterFn: UIArtifact | ((currentArtifact: UIArtifact) => UIArtifact)) => {
			setLocalArtifact((currentArtifact) => {
				const artifactToUpdate = currentArtifact || initialArtifactData;

				if (typeof updaterFn === "function") {
					return updaterFn(artifactToUpdate);
				}

				return updaterFn;
			});
		},
		[setLocalArtifact],
	);

	// Metadata type varies per artifact kind (TextArtifactMetadata, Metadata, etc.)
	// and is consumed via ArtifactActionContext<M=any>. Using Record<string, unknown>
	// here causes type incompatibility with SWR's KeyedMutator vs Dispatch<SetStateAction>.
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Generic metadata across artifact types
	const { data: localArtifactMetadata, mutate: setLocalArtifactMetadata } =
		useSWR<any>(
			() =>
				artifact.documentId ? `artifact-metadata-${artifact.documentId}` : null,
			null,
			{
				fallbackData: null,
			},
		);

	return useMemo(
		() => ({
			artifact,
			setArtifact,
			metadata: localArtifactMetadata,
			setMetadata: setLocalArtifactMetadata,
		}),
		[artifact, setArtifact, localArtifactMetadata, setLocalArtifactMetadata],
	);
}
