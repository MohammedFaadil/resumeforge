import { redirect } from "next/navigation";

// Legacy redirect: /dashboard/upload → /dashboard/check-score
export default function UploadRedirectPage() {
  redirect("/dashboard/check-score");
}
