import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminLayoutClient } from "@/components/admin/AdminLayoutClient";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  const isAdmin = session?.user && (session.user.role === "SUPER_ADMIN" || session.user.role === "ADMIN" || session.user.email === "resumeforgeweb@gmail.com" || session.user.email === "admin@gmail.com");
  if (!session || !isAdmin) {
    redirect("/dashboard");
  }

  return (
    <AdminLayoutClient
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role ?? "ADMIN",
      }}
    >
      {children}
    </AdminLayoutClient>
  );
}
