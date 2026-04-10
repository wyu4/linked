import { redirect } from "next/navigation";
import LoginPage from "../components/pages/login";
import { auth } from "@/utils/auth";
import { headers } from "next/headers";

export default async () => {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    if (session) {
        redirect("/dashboard");
    }
    return <LoginPage />;
};
