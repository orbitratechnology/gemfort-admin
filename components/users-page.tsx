import { UsersRound } from "lucide-react";
import type { DataRecord } from "@/lib/firebase/admin-data";
import { AdminPage, PageIntro } from "@/components/admin-page";
import { EmptyState } from "@/components/admin-primitives";
import { UserRow } from "@/components/user-row";
import { UsersFilters, UsersToolbar } from "@/components/users-toolbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export function UsersPage({ users, query, role, adminUid }: { users: DataRecord[]; query: string; role: string; adminUid: string }) {
  const normalizedQuery = query.trim().toLowerCase();
  const filteredUsers = users.filter((user) => {
    const haystack = [String(user.displayName ?? ""), String(user.email ?? ""), String(user.phone ?? "")].join(" ").toLowerCase();
    return (!normalizedQuery || haystack.includes(normalizedQuery)) && (role === "all" || valueOfRole(user) === role);
  });
  return <AdminPage><PageIntro eyebrow="People" title="User management" description="Search accounts, understand their status, and take documented admin actions." /><Card><CardHeader className="gap-4 border-b"><div><CardTitle>Accounts</CardTitle><CardDescription>{filteredUsers.length.toLocaleString()} of {users.length.toLocaleString()} accounts shown</CardDescription></div><UsersToolbar total={users.length} visible={filteredUsers.length} /></CardHeader><CardContent className="flex flex-col gap-4 pt-6"><UsersFilters query={query} role={role} /><div className="rounded-2xl border border-border/70"><Table><TableHeader><TableRow><TableHead>User</TableHead><TableHead className="hidden md:table-cell">Role</TableHead><TableHead>Verification</TableHead><TableHead className="hidden lg:table-cell">Joined</TableHead><TableHead className="w-12"><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader><TableBody>{filteredUsers.length ? filteredUsers.map((user) => <UserRow key={user.id} user={user} adminUid={adminUid} />) : <TableRow><TableCell colSpan={5}><EmptyState icon={UsersRound} title="No matching users" description="Try a different search or role filter." /></TableCell></TableRow>}</TableBody></Table></div></CardContent></Card></AdminPage>;
}

function valueOfRole(user: DataRecord) {
  return typeof user.role === "string" ? user.role : "—";
}
