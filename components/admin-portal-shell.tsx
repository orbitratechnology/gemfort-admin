import { AdminPortal, type PortalSection, type PortalSectionMeta } from "@/components/admin-portal";

const sectionMeta: Record<PortalSection, PortalSectionMeta> = {
  overview: {
    eyebrow: "Operations center",
    title: "Good morning, admin",
    description: "A clear view of the people, trust signals, and content shaping GemFort today.",
  },
  users: {
    eyebrow: "People",
    title: "User management",
    description: "Search accounts, understand their status, and take documented admin actions.",
  },
  verification: {
    eyebrow: "Trust & safety",
    title: "Verification queue",
    description: "Work the oldest applications first and keep every decision traceable.",
  },
  "gem-shows": {
    eyebrow: "Content studio",
    title: "Gem Shows",
    description: "Publish timely gemstone stories, exhibitions, and field updates to the app.",
  },
  settings: {
    eyebrow: "Workspace",
    title: "Admin settings",
    description: "Review the connected Firebase project and the controls protecting this console.",
  },
};

export function AdminPortalShell({ section }: { section: PortalSection }) {
  return <AdminPortal section={section} meta={sectionMeta[section]} />;
}
