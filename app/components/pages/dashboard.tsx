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

type DashboardClientType = {
    token: string;
    username?: string;
};

type FormError = "User" | "Target" | "Both";

type FormType = {
    defaultUser?: string;
    setUser?: (user: string) => void;
    setTarget?: (target: string) => void;
    onSubmit?: () => void | FormError;
};

export default function DashboardClient({ token, username }: DashboardClientType) {
    const [user, setUser] = useState("");
    const [target, setTarget] = useState("");
    const [searching, setSearching] = useState(false);
    const [stream, setStream] = useState<SearchStream | undefined>(undefined);
    const cache = useRef<Map<string, string[]>>(new Map<string, string[]>());
    const router = useRouter();
    const searchParams = useSearchParams();
    const { replace } = useRouter();

    const onUserUpdate = (login: string) => {
        setUser(filterUsername(login));
    };

    const onTargetUpdate = (login: string) => {
        setTarget(filterUsername(login));
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
        if (searching) return;
        if (user === "" && target === "") return "Both";
        if (user === "") return "User";
        if (target === "") return "Target";
        setSearching(true);
    };

    return (
        <div className="absolute bg-background h-full w-full overflow-hidden">
            <StartupForm defaultUser={username} setUser={onUserUpdate} setTarget={onTargetUpdate} onSubmit={handleSearch} />
        </div>
    );
}

function StartupForm({ defaultUser = "wyu4", setUser, setTarget, onSubmit }: FormType) {
    const [userInvalid, setUserInvalid] = useState(false);
    const [targetInvalid, setTargetInvalid] = useState(false);

    const handleSubmit = () => {
        const error = onSubmit?.();
        switch (error) {
            case "User":
            case "Both":
                setUserInvalid(true);
            case "Target":
            case "Both":
                setTargetInvalid(true);
        }
    };

    return (
        <div className="fixed bg-foreground top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center items-center border border-border rounded-2xl p-5 gap-2.5">
            <h1>Get Started</h1>
            <p className="subtitle mb-5 text-center">Create a path between any two GitHub users</p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full justify-center items-center">
                <UserForm defaultUser={defaultUser} isInvalid={userInvalid} setUser={setUser} setInvalid={setUserInvalid} />
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
    defaultUser?: string;
    label?: string;
    isInvalid?: boolean;
    setUser?: (login: string) => void | Dispatch<SetStateAction<string>>;
    setInvalid?: (value: boolean) => void | Dispatch<SetStateAction<boolean>>;
};

function UserForm({ label = "User", isInvalid, setInvalid, setUser, defaultUser }: UserFormType) {
    const container = useRef<HTMLDivElement>(null);

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
            <UserInput className="animated w-full sm:w-[33vw] max-w-100 min-w-50" defaultUser={defaultUser} onChange={(e) => setUser?.(e.target.value)} />
        </div>
    );
}
