"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface MobileSidebarContextType {
	isMobileSidebarOpen: boolean;
	setIsMobileSidebarOpen: (open: boolean) => void;
	openMobileSidebar: () => void;
	closeMobileSidebar: () => void;
}

const MobileSidebarContext = createContext<
	MobileSidebarContextType | undefined
>(undefined);

export function MobileSidebarProvider({ children }: { children: ReactNode }) {
	const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

	const openMobileSidebar = () => setIsMobileSidebarOpen(true);
	const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

	return (
		<MobileSidebarContext.Provider
			value={{
				isMobileSidebarOpen,
				setIsMobileSidebarOpen,
				openMobileSidebar,
				closeMobileSidebar,
			}}
		>
			{children}
		</MobileSidebarContext.Provider>
	);
}

export function useMobileSidebar() {
	const context = useContext(MobileSidebarContext);
	if (context === undefined) {
		throw new Error(
			"useMobileSidebar must be used within a MobileSidebarProvider",
		);
	}
	return context;
}
