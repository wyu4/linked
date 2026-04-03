import type { Metadata } from "next";
import "./styles/global.css";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
    title: "Linked",
    description: "See how GitHub users are connected",
    icons: {
        icon: "/icon.svg",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`h-full antialiased`}>
            <body className="min-h-full bg-background">
                <SessionProvider>{children}</SessionProvider>
            </body>
        </html>
    );
}
