import { betterAuth } from "better-auth";

export const auth = betterAuth({
    appName: "linked",
    baseURL: process.env.BETTER_AUTH_URL as string,
    basePath: "api/auth",
    trustedOrigins: ["https://*.wyu.app", "http://localhost:3000"],
    onAPIError: {
        errorURL: "/login",
        throw: true,
    },
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID as string,
            clientSecret: process.env.GITHUB_CLIENT_SECRET as string,
            scope: ["user:email"],
            disableDefaultScope: true,
            mapProfileToUser: (profile) => {
                return {
                    username: profile.login,
                };
            },
        },
    },
    user: {
        additionalFields: {
            username: { type: "string" },
        },
    },
});
