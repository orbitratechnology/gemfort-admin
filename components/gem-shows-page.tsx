import { Gem } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { AdminPage, PageIntro } from "@/components/admin-page";
import { EmptyState } from "@/components/admin-primitives";
import { GemShowCreateButton } from "@/components/gem-show-actions";
import { GemShowCard } from "@/components/gem-show-card";
import { Card } from "@/components/ui/card";

export function GemShowsPage({ shows }: { shows: DataRecord[] }) {
  return <AdminPage><div className="flex flex-col justify-between gap-4 md:flex-row md:items-end"><PageIntro eyebrow="Content studio" title="Gem Shows" description="Publish timely gemstone stories, exhibitions, and field updates to the app." /><GemShowCreateButton /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{shows.length ? shows.map((show) => <GemShowCard key={show.id} show={show} />) : <Card className="md:col-span-2 xl:col-span-3"><EmptyState icon={Gem} title="No Gem Shows yet" description="Create the first story for exhibitions, new collections, or moments from the gemstone trade." /></Card>}</div></AdminPage>;
}
