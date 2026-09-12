import {
  BookOpen,
  Boxes,
  Brain,
  Cloud,
  Container,
  Cpu,
  Gauge,
  GitBranch,
  Layers,
  Shield,
  Terminal,
  Workflow,
  Wrench,
  type LucideProps,
} from "lucide-react";
import type { ElementType } from "react";

/** Lucide icon per track slug. Falls back to the stored `icon` field, then a book. */
const BY_SLUG: Record<string, ElementType<LucideProps>> = {
  hardware: Cpu,
  ai: Brain,
  cybersecurity: Shield,
  linux: Terminal,
  aws: Cloud,
  azure: Cloud,
  "version-control": GitBranch,
  docker: Container,
  kubernetes: Boxes,
  terraform: Layers,
  ansible: Wrench,
  cicd: Workflow,
  monitoring: Gauge,
};

const BY_ICON_FIELD: Record<string, ElementType<LucideProps>> = {
  cpu: Cpu,
  brain: Brain,
  shield: Shield,
  terminal: Terminal,
  cloud: Cloud,
};

export function TrackIcon({ slug, icon, ...props }: { slug: string; icon?: string } & LucideProps) {
  const Icon = BY_SLUG[slug] ?? (icon ? BY_ICON_FIELD[icon] : undefined) ?? BookOpen;
  return <Icon {...props} />;
}
