"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import type { CanvasType } from "@/lib/supabase/types";

interface UseCanvasPersistenceOptions<T> {
	canvasType: CanvasType;
	defaultData: T;
	transformForSave?: (data: T) => unknown;
	transformFromLoad?: (data: unknown) => T;
	fetchFn?: (url: string, options?: RequestInit) => Promise<Response>;
}

interface UseCanvasPersistenceReturn<T> {
	data: T;
	setData: React.Dispatch<React.SetStateAction<T>>;
	canvasId: string | null;
	isSaving: boolean;
	isLoading: boolean;
	lastSaved: Date | null;
	error: string | null;
	saveNow: () => Promise<void>;
	refresh: () => Promise<void>;
}

export function useCanvasPersistence<T>({
	canvasType,
	defaultData,
	transformForSave,
	transformFromLoad,
	fetchFn,
}: UseCanvasPersistenceOptions<T>): UseCanvasPersistenceReturn<T> {
	const [data, setData] = useState<T>(defaultData);
	const [canvasId, setCanvasId] = useState<string | null>(null);
	const [isSaving, setIsSaving] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [error, setError] = useState<string | null>(null);
	const hasLoadedRef = useRef(false);
	const isInitialLoadRef = useRef(true);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Use provided fetch function or default native fetch
	const doFetch = fetchFn || fetch;

	// Load/Refresh function
	const refresh = useCallback(async () => {
		// If we're already saving, don't interrupt with a load
		// But if we're just idling, we can fetch

		setIsLoading(true);

		try {
			const res = await doFetch(`/api/canvas?type=${canvasType}`);
			if (res.ok) {
				const canvas = await res.json();
				if (canvas?.data) {
					setCanvasId(canvas.id);
					const raw = canvas.data;
					const loadedData = transformFromLoad
						? transformFromLoad(raw)
						: ({
								...defaultData,
								...(typeof raw === "object" &&
								raw !== null &&
								!Array.isArray(raw)
									? raw
									: {}),
							} as T);
					setData(loadedData);
				}
			}
		} catch (err) {
			console.warn("[Canvas] Failed to load:", err);
			setError("Failed to refresh canvas");
		} finally {
			setIsLoading(false);
			setTimeout(() => {
				isInitialLoadRef.current = false;
			}, 500);
		}
	}, [canvasType, defaultData, doFetch, transformFromLoad]);

	// Initial load
	useEffect(() => {
		if (hasLoadedRef.current) return;
		hasLoadedRef.current = true;
		refresh();
	}, [refresh]);

	// Cleanup abort controller on unmount
	useEffect(() => {
		return () => {
			abortControllerRef.current?.abort();
		};
	}, []);

	// Debounced save function
	const debouncedSave = useDebouncedCallback(
		async (dataToSave: T) => {
			// Skip save during initial load
			if (isInitialLoadRef.current) return;

			// Cancel any in-flight save
			abortControllerRef.current?.abort();
			const controller = new AbortController();
			abortControllerRef.current = controller;

			setIsSaving(true);
			setError(null);
			try {
				const saveData = transformForSave
					? transformForSave(dataToSave)
					: dataToSave;

				const res = await doFetch("/api/canvas", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						canvasType,
						data: saveData,
						canvasId,
						isDefault: true,
					}),
					signal: controller.signal,
				});

				if (res.ok) {
					const result = await res.json();
					if (result.id && !canvasId) {
						setCanvasId(result.id);
					}
					setLastSaved(new Date());
				} else {
					setError("Failed to save canvas");
				}
			} catch (err) {
				if (err instanceof DOMException && err.name === "AbortError") return;
				console.warn("[Canvas] Failed to save:", err);
				setError("Failed to save canvas");
			} finally {
				setIsSaving(false);
			}
		},
		2000, // 2 second debounce
	);

	// Auto-save when data changes (after initial load)
	useEffect(() => {
		if (!isInitialLoadRef.current && !isLoading) {
			debouncedSave(data);
		}
	}, [data, debouncedSave, isLoading]);

	// Manual save function
	const saveNow = useCallback(async () => {
		debouncedSave.cancel();

		// Cancel any in-flight save
		abortControllerRef.current?.abort();
		const controller = new AbortController();
		abortControllerRef.current = controller;

		setIsSaving(true);
		setError(null);
		try {
			const saveData = transformForSave ? transformForSave(data) : data;

			const res = await doFetch("/api/canvas", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					canvasType,
					data: saveData,
					canvasId,
					isDefault: true,
				}),
				signal: controller.signal,
			});

			if (res.ok) {
				const result = await res.json();
				if (result.id && !canvasId) {
					setCanvasId(result.id);
				}
				setLastSaved(new Date());
			} else {
				setError("Failed to save canvas");
			}
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") return;
			console.warn("[Canvas] Failed to save:", err);
			setError("Failed to save canvas");
		} finally {
			setIsSaving(false);
		}
	}, [canvasId, canvasType, data, debouncedSave, doFetch, transformForSave]);

	return {
		data,
		setData,
		canvasId,
		isSaving,
		isLoading,
		lastSaved,
		error,
		saveNow,
		refresh,
	};
}
