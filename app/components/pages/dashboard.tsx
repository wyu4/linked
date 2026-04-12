"use client";
import { filterUsername, searchConnections } from "@/utils/search";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { StartupForm } from "../user-input";
import Surface from "../nodes/surface";

type DashboardClientType = {
    token: string;
    username?: string;
};

/**
 * A cooldown in milliseconds. This prevents a bug where the URL parameters don't update in time when the user presses on submit.
 */
const COOLDOWN_AFTER_PARAM_UPDATE = 200;
const RENDER_TEST_BUTTON = false;

export default function DashboardClient({ token, username }: DashboardClientType) {
    const searchParams = useSearchParams();
    const user = searchParams.get("user") ?? "";
    const target = searchParams.get("target") ?? "";
    const [searching, setSearching] = useState(false);
    const [stream, setStream] = useState<SearchStream | undefined>(undefined);
    const cache = useRef<Map<string, string[]>>(new Map<string, string[]>());
    const lastParamUpdate = useRef<number>(Date.now());
    const router = useRouter();

    const updateParam = (key: "user" | "target", value: string) => {
        if (searching) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set(key, value);
        router.replace(`/dashboard?${params.toString()}`, { scroll: false });
        lastParamUpdate.current = Date.now();
    };

    const closeSession = async () => {
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    router.push(`/login?error=expired&error_description=${"The session expired.".replaceAll(" ", "+")}`);
                },
            },
        });
    };

    const handleError = async (data: SearchStream) => {
        if (data.phase === "Credentials") {
            const credentialError = data.credentialStatus ?? "Invalid";
            console.error(`Credential error: ${credentialError}`);
            if (credentialError === "Invalid") {
                await closeSession();
            }
        }
    };

    useEffect(() => {
        if (!searching) return;

        if (!token) {
            console.error("No token was found.");
            return;
        }

        if (RENDER_TEST_BUTTON) return;
        searchConnections(
            token,
            user,
            target,
            async (data) => {
                if (data.error) await handleError(data);
                setStream({ ...data });
            },
            cache.current,
        )
            .then((data) => {
                console.log(data.map((connection) => connection.login).join(" => "));
            })
            .finally(() => {
                setSearching(false);
                console.log("Searched.");
            });
    }, [searching, user, target]);

    const handleSearch = (): void | FormError => {
        if (Date.now() - lastParamUpdate.current < COOLDOWN_AFTER_PARAM_UPDATE) return "TooFast";
        if (searching) return;
        if (user === "" && target === "") return "Both";
        if (user === "") return "User";
        if (target === "") return "Target";
        setSearching(true);
    };

    return (
        <div className="absolute bg-background h-full w-full flex flex-col items-center justify-center overflow-hidden">
            <Surface />
            <StartupForm
                searching={searching}
                displayUser={username}
                user={user}
                setUser={(value) => updateParam("user", filterUsername(value))}
                target={target}
                setTarget={(value) => updateParam("target", filterUsername(value))}
                onSubmit={handleSearch}
            />
            {RENDER_TEST_BUTTON && (
                <button
                    className="absolute z-100 bottom-10 bg-link w-full flex flex-row justify-center items-center py-2.5 rounded-xl"
                    onClick={() => setSearching((value) => !value)}
                >
                    Test button
                </button>
            )}
        </div>
    );
}
