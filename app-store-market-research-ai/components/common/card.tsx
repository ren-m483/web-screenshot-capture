import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] p-4 ${className}`}>
      {children}
    </div>
  );
}

export function SectionCard({ title, children, className = "" }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <h2 className="font-medium mb-2">{title}</h2>
      {children}
    </Card>
  );
}
