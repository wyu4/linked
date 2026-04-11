"use client";
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { filterUsername, searchConnections } from "@/utils/search";
import { Dispatch, SetStateAction, useEffect, useRef, useState } from "react";
import { authClient } from "@/utils/auth-client";
import { redirect, useRouter, useSearchParams } from "next/navigation";
import UserInput from "../user-input";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

type DashboardClientType = {
    token: string;
    username?: string;
};

type FormError = "User" | "Target" | "Both" | "TooFast";

type FormType = {
    displayUser?: string;
    user: string;
    setUser?: (user: string) => void;
    target: string;
    setTarget?: (target: string) => void;
    onSubmit?: () => void | FormError;
};

/**
 * A cooldown in milliseconds. This prevents a bug where the URL parameters don't update in time when the user presses on submit.
 */
const COOLDOWN_AFTER_PARAM_UPDATE = 200;

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

        console.log("Searching...");

        searchConnections(
            token,
            user,
            target,
            async (data) => {
                if (data.error) await handleError(data);
                setStream(data);
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
        console.log(`${user} -> ${target}`);
    };

    return (
        <div className="absolute bg-background h-full w-full overflow-hidden">
            <StartupForm
                displayUser={username}
                user={user}
                setUser={(value) => {
                    updateParam("user", filterUsername(value));
                }}
                target={target}
                setTarget={(value) => {
                    updateParam("target", filterUsername(value));
                }}
                onSubmit={handleSearch}
            />
        </div>
    );
}

function StartupForm({ displayUser = "wyu4", user, setUser, target, setTarget, onSubmit }: FormType) {
    const [userInvalid, setUserInvalid] = useState(false);
    const [targetInvalid, setTargetInvalid] = useState(false);
    const [collapsed, setCollapsed] = useState(user !== "" && target !== "");
    const container = useRef<HTMLDivElement>(null);
    const GAP = "0.625rem";
    const [extraIsMounted, setExtraIsMounted] = useState(!collapsed);

    const handleSubmit = () => {
        const error = onSubmit?.() ?? undefined;
        if (user !== "" && target !== "") {
            setCollapsed(true);
        }
        switch (error) {
            case "User":
            case "Both":
                setUserInvalid(true);
            case "Target":
            case "Both":
                setTargetInvalid(true);
                break;
            case "TooFast":
                console.warn("Slow down!");
                break;
            case undefined:
                setCollapsed(true);
        }
    };

    const PRESET_POSITIONS = {
        containerDefault: {
            top: "50%",
            left: "50%",
            translateX: "-50%",
            translateY: "-50%",
        } as gsap.TweenVars,
        containerCollapsed: {
            top: "1rem",
            left: "50%",
            translateX: "-50%",
            translateY: 0,
        } as gsap.TweenVars,
    };

    useGSAP(
        () => {
            gsap.set(container.current, collapsed ? PRESET_POSITIONS.containerCollapsed : PRESET_POSITIONS.containerDefault);
            gsap.set(
                ".extra-container",
                collapsed
                    ? {
                          opacity: 0,
                          position: "absolute",
                      }
                    : {
                          opacity: 1,
                          position: "relative",
                      },
            );
            gsap.fromTo(container.current, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" });
        },
        {
            dependencies: [],
            scope: container,
        },
    );

    useGSAP(
        () => {
            if (!collapsed) return;

            const extra = new SplitText(".extra", {
                type: "words",
            });

            gsap.timeline()
                .to(extra.words, {
                    duration: 0.5,
                    opacity: 0,
                    translateY: "-1rem",
                    stagger: 0.02,
                    ease: "power2.inOut",
                })
                .to(
                    ".extra-container",
                    {
                        duration: 0.5,
                        delay: 0.25,
                        pointerEvents: "none",
                        height: 0,
                        marginBottom: "-" + GAP,
                        ease: "sine.inOut",
                        onComplete: () => {
                            setExtraIsMounted(false);
                        },
                    },
                    "<",
                )
                .to(
                    container.current,
                    {
                        ...PRESET_POSITIONS.containerCollapsed,
                        duration: 0.5,
                        delay: 0.25,
                        ease: "power2.inOut",
                    },
                    "<",
                );

            return () => extra.revert();
        },
        {
            dependencies: [collapsed],
            scope: container,
        },
    );

    return (
        <div
            ref={container}
            className={`fixed opacity-0 overflow-hidden bg-foreground flex flex-col justify-center items-center border border-border rounded-2xl p-5`}
            style={{ gap: `var(--form-gap)`, "--form-gap": GAP } as React.CSSProperties}
        >
            {extraIsMounted && (
                <div className="extra-container flex flex-col justify-center items-center gap-inherit mb-5">
                    <h1 className="extra">Get Started</h1>
                    <p className="extra subtitle text-center">Create a path between any two GitHub users</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center items-center">
                <UserForm displayUser={displayUser} isInvalid={userInvalid} setUser={setUser} setInvalid={setUserInvalid} />
                <UserForm label="Target" isInvalid={targetInvalid} setUser={setTarget} setInvalid={setTargetInvalid} />
            </div>
            <button className="bg-link w-full flex flex-row justify-center items-center gap-2 py-2.5 rounded-xl" onClick={handleSubmit}>
                <FaSearch />
                <h2>Lookup</h2>
            </button>
        </div>
    );
}

type UserFormType = {
    displayUser?: string;
    label?: string;
    isInvalid?: boolean;
    setUser?: (login: string) => void | Dispatch<SetStateAction<string>>;
    setInvalid?: (value: boolean) => void | Dispatch<SetStateAction<boolean>>;
};

function UserForm({ label = "User", isInvalid, setInvalid, setUser, displayUser }: UserFormType) {
    const container = useRef<HTMLDivElement>(null);
    const param = useSearchParams().get(label.toLowerCase());

    useGSAP(
        () => {
            if (!isInvalid) return;
            gsap.fromTo(
                ".animated",
                {
                    color: "#FF7373",
                    borderColor: "#FF7373",
                },
                { color: "#F0F6FC", borderColor: "#00000000", duration: 0.5 },
            );
            gsap.to(".animated", {
                x: `${Math.random() * 0.2 - 0.1}rem`,
                y: `${Math.random() * 0.2 - 0.1}rem`,
                duration: 0.1,
                repeat: Math.round(1 / 0.5),
                yoyo: true,
                ease: "sine.inOut",
                onComplete: () => {
                    gsap.to(".animated", {
                        x: 0,
                        y: 0,
                        duration: 0.1,
                        ease: "sine.inOut",
                        onComplete: () => {
                            setInvalid?.(false);
                        },
                    });
                },
            });
        },
        {
            dependencies: [isInvalid],
            scope: container,
        },
    );

    return (
        <div ref={container} className="flex flex-col gap-1 w-full justify-center items-center">
            <h2 className="animated w-full">{label}</h2>
            <UserInput
                className="animated w-full sm:w-[33vw] max-w-100 min-w-50"
                displayUser={displayUser}
                defaultValue={filterUsername(param ?? "")}
                onChange={(e) => setUser?.(e.target.value)}
            />
        </div>
    );
}
