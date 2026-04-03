import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function Home() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const role = (session.user as any)?.role;
  if (role === "OPERATOR") {
    redirect("/my-kiosk");
  } else {
    redirect("/dashboard");
  }
}
