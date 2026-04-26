import { redirect } from "next/navigation";
import { Sidebar } from "@/components/shell/Sidebar";
import { Topbar } from "@/components/shell/Topbar";
import { CommandPalette } from "@/components/shell/CommandPalette";
import { Toaster } from "@/components/ui/Toaster";
import { createSupabaseServer } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  const role = (profile?.role as string) || "setter";
  const fullName = profile?.full_name || user.email || "";

  return (
    <div className="flex min-h-screen w-full bg-v12-bg">
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar fullName={fullName} email={user.email || ""} role={role} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
      {/* Globales — siempre presentes, no dependen del contenido */}
      <CommandPalette />
      <Toaster />
    </div>
  );
}
