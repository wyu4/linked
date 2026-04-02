import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        github?: string;
        user: DefaultSession["user"];
        expires: DefaultSession["expires"];
    }
}

declare module "@auth/core/jwt" {
    interface JWT {
        github?: string;
    }
}
