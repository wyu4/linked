import NextAuth from "next-auth";
import Github from "next-auth/providers/github";

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers: [
        Github({
            clientId: process.env.OAUTH_ID || "???",
            clientSecret: process.env.OAUTH_SECRET || "???",
        }),
    ],
    secret: process.env.BETTER_AUTH_SECRET,
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ account, token }) {
            if (account) {
                token.github = account.access_token;
            }
            return token;
        },
        async session({ session, token }) {
            session.github = token.github;
            return session;
        },
    },
});
