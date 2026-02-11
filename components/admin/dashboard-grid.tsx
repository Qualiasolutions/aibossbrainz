"use client";

import { GripVertical } from "lucide-react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { cn } from "@/lib/utils";

// Widget configuration
export interface WidgetConfig {
  id: string;
  title: string;
  size: "small" | "medium" | "large" | "full";
  component: ReactNode;
}

interface DashboardGridContextValue {
  widgets: WidgetConfig[];
  moveWidget: (dragIndex: number, hoverIndex: number) => void;
  isDragging: boolean;
  setIsDragging: (dragging: boolean) => void;
}

const DashboardGridContext = createContext<DashboardGridContextValue | null>(
  null,
);

const STORAGE_KEY = "admin-dashboard-layout";

// Get widget grid classes based on size
function getWidgetClasses(size: WidgetConfig["size"]) {
  switch (size) {
    case "small":
      return "col-span-1";
    case "medium":
      return "col-span-1 lg:col-span-2";
    case "large":
      return "col-span-1 lg:col-span-2";
    case "full":
      return "col-span-1 lg:col-span-4";
    default:
      return "col-span-1";
  }
}

interface DraggableWidgetProps {
  widget: WidgetConfig;
  index: number;
}

function DraggableWidget({ widget, index }: DraggableWidgetProps) {
  const context = useContext(DashboardGridContext);
  if (!context) return null;

  const { moveWidget, isDragging, setIsDragging } = context;
  const [isDraggedOver, setIsDraggedOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("text/plain", index.toString());
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setIsDraggedOver(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDraggedOver(true);
  };

  const handleDragLeave = () => {
    setIsDraggedOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (dragIndex !== index) {
      moveWidget(dragIndex, index);
    }
    setIsDraggedOver(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        getWidgetClasses(widget.size),
        "group relative transition-all duration-200",
        isDragging && "opacity-50",
        isDraggedOver && "ring-2 ring-rose-500 ring-offset-2 rounded-xl",
      )}
    >
      {/* Drag handle overlay */}
      <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm rounded-md shadow-sm border border-neutral-200 cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-neutral-400" />
          <span className="text-xs text-neutral-500">Drag</span>
        </div>
      </div>
      {widget.component}
    </div>
  );
}

interface DashboardGridProps {
  initialWidgets: WidgetConfig[];
}

export function DashboardGrid({ initialWidgets }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(initialWidgets);
  const [isDragging, setIsDragging] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Load saved layout from localStorage
  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedOrder = JSON.parse(saved) as string[];
        // Reorder widgets based on saved order
        const reordered = savedOrder
          .map((id) => initialWidgets.find((w) => w.id === id))
          .filter(Boolean) as WidgetConfig[];
        // Add any new widgets that weren't in saved order
        const newWidgets = initialWidgets.filter(
          (w) => !savedOrder.includes(w.id),
        );
        setWidgets([...reordered, ...newWidgets]);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [initialWidgets]);

  // Save layout to localStorage
  const saveLayout = useCallback((newWidgets: WidgetConfig[]) => {
    try {
      const order = newWidgets.map((w) => w.id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(order));
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const moveWidget = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      setWidgets((prev) => {
        const newWidgets = [...prev];
        const [removed] = newWidgets.splice(dragIndex, 1);
        newWidgets.splice(hoverIndex, 0, removed);
        saveLayout(newWidgets);
        return newWidgets;
      });
    },
    [saveLayout],
  );

  const resetLayout = useCallback(() => {
    setWidgets(initialWidgets);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore
    }
  }, [initialWidgets]);

  if (!mounted) {
    // SSR placeholder with same grid
    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
        {initialWidgets.map((widget) => (
          <div key={widget.id} className={getWidgetClasses(widget.size)}>
            {widget.component}
          </div>
        ))}
      </div>
    );
  }

  return (
    <DashboardGridContext.Provider
      value={{ widgets, moveWidget, isDragging, setIsDragging }}
    >
      <div className="space-y-4">
        <div className="flex justify-end">
          <button
            onClick={resetLayout}
            className="text-xs text-neutral-500 hover:text-neutral-700 transition-colors"
          >
            Reset layout
          </button>
        </div>
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-4">
          {widgets.map((widget, index) => (
            <DraggableWidget key={widget.id} widget={widget} index={index} />
          ))}
        </div>
      </div>
    </DashboardGridContext.Provider>
  );
}
