import { redirect } from "next/navigation";
import DashboardClient from "../components/pages/dashboard";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export default async () => {
    const authHeaders = await headers();
    const session = await auth.api.getSession({
        headers: authHeaders,
    });

    if (session) {
        const account = await auth.api.accountInfo({
            headers: authHeaders,
        });
        const username = (account?.user as any).username;
        const credentials = await auth.api.getAccessToken({
            body: { providerId: "github" },
            headers: authHeaders,
        });
        const token = credentials.accessToken;
        console.log(`User [${username}] logged in with token ${token.slice(0, token.length / 3)}`);
        return <DashboardClient username={username} token={token} />;
    }
    redirect("/login");
};
