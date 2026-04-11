"use client";

import { FaGithub } from "react-icons/fa";
import InfoWidget from "../info";
import { useState } from "react";
import { authClient } from "@/utils/auth-client";
import { useSearchParams } from "next/navigation";

export default function LoginClient() {
    const [waiting, setWaiting] = useState(false);

    const searchParams = useSearchParams();
    const authError = searchParams.get("error");

    const generateErrorMessage = () => {
        switch (authError) {
            case "access_denied":
                return "User denied authentication. Please try again.";
            case "expired":
                return "Session expired, please re-authenticate.";
            case null:
                return "GitHub the only supported method right now.";
            default:
                const desc = searchParams.get("error_description");
                return `An unknown error [${authError}] occurred: '${desc?.slice(0, 50) ?? "Unknown error"}'`;
        }
    };

    return (
        <div className="absolute flex flex-col justify-center items-center bg-background min-h-full min-w-full">
            <div className="flex flex-col justify-center items-center bg-foreground px-6 py-3 gap-3 border border-border rounded">
                <h1 className="">Authentication</h1>
                <InfoWidget icon={false}>
                    <p className="text-center">{generateErrorMessage()}</p>
                </InfoWidget>
                <button
                    className="p-3 w-sm gap-2 flex flex-row justify-center items-center bg-clickable border border-border rounded-sm"
                    onClick={() => {
                        if (waiting) return;
                        setWaiting(true);
                        authClient.signIn.social({
                            provider: "github",
                        });
                    }}
                >
                    <FaGithub size={25} />
                    <p className="font-bold">Continue with GitHub</p>
                </button>
            </div>
        </div>
    );
}
