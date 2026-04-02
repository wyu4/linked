import { redirect } from "next/navigation";
import LoginPage from "../components/pages/login";
import { auth } from "../global/auth";

export default async () => {
    const session = await auth();
    if (session?.user) redirect("/dashboard");
    return <LoginPage />;
};
