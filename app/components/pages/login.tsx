"use client";

import { FaGithub } from "react-icons/fa";
import InfoWidget from "../info";
import { useState } from "react";
import { authClient } from "@/utils/auth-client";

export default function LoginClient() {
    const [waiting, setWaiting] = useState(false);

    return (
        <div className="absolute flex flex-col justify-center items-center bg-background min-h-full min-w-full">
            <div className="flex flex-col justify-center items-center bg-foreground px-6 py-3 gap-3 border border-border rounded">
                <h2 className="">Authentication</h2>
                <InfoWidget icon={false}>
                    <p>GitHub the only supported method right now.</p>
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
