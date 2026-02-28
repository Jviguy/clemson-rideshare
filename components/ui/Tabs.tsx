"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { clsx } from "clsx";

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used within <Tabs>");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Tabs (root)                                                       */
/* ------------------------------------------------------------------ */

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

function Tabs({ defaultValue, children, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsList                                                          */
/* ------------------------------------------------------------------ */

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={clsx(
        "inline-flex items-center gap-1 rounded-lg bg-gray-100 dark:bg-gray-900/50 p-1",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsTrigger                                                       */
/* ------------------------------------------------------------------ */

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext();
  const isActive = activeTab === value;

  const handleClick = useCallback(() => {
    setActiveTab(value);
  }, [setActiveTab, value]);

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={handleClick}
      className={clsx(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clemson-orange/50 focus-visible:ring-offset-1",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-gray-500 hover:text-foreground/80 dark:text-gray-400 dark:hover:text-gray-200",
        className
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  TabsContent                                                       */
/* ------------------------------------------------------------------ */

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabsContext();

  if (activeTab !== value) return null;

  return (
    <div
      role="tabpanel"
      className={clsx("mt-3 focus-visible:outline-none", className)}
    >
      {children}
    </div>
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
export type { TabsProps, TabsListProps, TabsTriggerProps, TabsContentProps };
