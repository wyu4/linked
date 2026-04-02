import { redirect } from "next/navigation";
import { auth } from "../global/auth";

export default async function DashboardPage() {
    const session = await auth();
    if (!session?.github) redirect("/login");
    return <div className="absolute flex flex-col justify-center items-center bg-background min-h-full min-w-full"></div>;
}
