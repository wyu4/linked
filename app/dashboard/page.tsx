import { redirect } from "next/navigation";
import { auth } from "../global/auth";
import DashboardClient from "../components/pages/dashboard";

export default async () => {
    const session = await auth();
    if (!session?.github) redirect("/login");
    return <DashboardClient name={session.user?.name || undefined} />;
};
