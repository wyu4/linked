import { redirect } from "next/navigation";
import DashboardClient from "../components/pages/dashboard";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export default async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (session) {
        const username = session.user.name;
        const credentials = await auth.api.getAccessToken({
            body: { providerId: "github" },
            headers: await headers(),
        });
        const token = credentials.accessToken;
        console.log(`User [${username}] logged in with token ${token.slice(0, token.length / 3)}`);
        return <DashboardClient name={username || "???"} token={token} />;
    }
    redirect("/login");
};
