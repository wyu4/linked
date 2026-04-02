import type { Metadata } from "next";
import "./styles/global.css";

export const metadata: Metadata = {
    title: "Linked",
    description: "See how GitHub users are connected",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`h-full antialiased`}>
            <body className="min-h-full">{children}</body>
        </html>
    );
}
