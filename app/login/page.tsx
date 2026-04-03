import { redirect } from "next/navigation";
import LoginPage from "../components/pages/login";
import { auth } from "../global/auth";

export default async () => {
    const session = await auth();
    if (session?.github) {
        const token = session.github;
        console.log(`${session.user?.name} is logging in with token [${token.slice(0, token.length / 3)}...]`);
        redirect("/dashboard");
    }
    return <LoginPage />;
};
