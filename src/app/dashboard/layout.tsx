import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { FeedbackButton } from "@/components/FeedbackButton";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  if (session.user.status !== "APPROVED") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <DashboardSidebar
        user={{
          name: session.user.name ?? "",
          email: session.user.email ?? "",
          role: session.user.role ?? "USER",
          image: session.user.image ?? "",
        }}
      />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0 relative">
        {children}
        <FeedbackButton />
      </main>
    </div>
  );
}
