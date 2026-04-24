"use client";
import { filterUsername, searchConnections } from "@/utils/search";
import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { StartupForm } from "../user-input";
import Surface from "../nodes/surface";

type DashboardClientType = {
    token?: string;
    username?: string;
    locked: boolean;
};

/**
 * A cooldown in milliseconds. This prevents a bug where the URL parameters don't update in time when the user presses on submit.
 */
const COOLDOWN_AFTER_PARAM_UPDATE = 200;
const RENDER_TEST_BUTTON = false;

export default function DashboardClient({ token, username, locked }: DashboardClientType) {
    const searchParams = useSearchParams();
    const user = useRef<string>(filterUsername(searchParams.get("user") ?? ""));
    const target = useRef<string>(filterUsername(searchParams.get("target") ?? ""));
    const [searching, setSearching] = useState(false);
    const [stream, setStream] = useState<SearchStream | undefined>(undefined);
    const updateStream = useCallback((data: SearchStream) => setStream({ ...data }), []);
    const [data, setData] = useState<MutualConnection[] | undefined>(undefined);
    const [updateTime, setUpdateTime] = useState(0);
    const cache = useRef<Map<string, string[]>>(new Map<string, string[]>());
    const lastParamUpdate = useRef<number>(Date.now());
    const router = useRouter();

    const updateParams = () => {
        if (searching) return;
        const params = new URLSearchParams(searchParams.toString());
        params.set("user", user.current);
        params.set("target", target.current);
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
            user.current,
            target.current,
            async (data) => {
                if (data.error) await handleError(data);
                updateStream({ ...data });
            },
            cache.current,
        )
            .then((data) => {
                console.log(data.map((connection) => connection.login).join(" => "));
                setData([...data]);
                setUpdateTime(Date.now());
            })
            .finally(() => {
                setSearching(false);
                console.log("Searched.");
            });
    }, [searching, user, target]);

    const handleSearch = (): void | FormError => {
        if (Date.now() - lastParamUpdate.current < COOLDOWN_AFTER_PARAM_UPDATE) return "TooFast";
        if (searching) return;
        if (user.current === "" && target.current === "") return "Both";
        if (user.current === "") return "User";
        if (target.current === "") return "Target";
        updateParams();
        setSearching(true);
    };

    return (
        <div className="absolute bg-background h-full w-full flex flex-col items-center justify-center overflow-hidden">
            <Surface data={data} updateTime={updateTime} />
            {!locked && (
                <StartupForm
                    searching={searching}
                    displayUser={username}
                    user={user.current}
                    setUser={(value) => (user.current = filterUsername(value))}
                    target={target.current}
                    setTarget={(value) => (target.current = filterUsername(value))}
                    onSubmit={handleSearch}
                />
            )}
            {locked && (
                <div className="w-full h-full flex flex-col items-center justify-center">
                    <h1>You have been rate limited.</h1>
                </div>
            )}
            {stream && (
                <div className="absolute right-0 bottom-0 flex flex-row gap-1 p-2 items-center justify-center">
                    <p className="text-nowrap">{`${stream.requestsLeft} / ${stream.totalRequests}`}</p>
                </div>
            )}
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
