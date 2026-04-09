"use client";
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";
import { searchConnections } from "@/app/utils/search";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

type DashboardClientType = {
    name?: string;
};

export default function DashboardClient({ name = "Unknown User" }: DashboardClientType) {
    const [user, setUser] = useState("");
    const [target, setTarget] = useState("");
    const [searching, setSearching] = useState(false);
    const session = useSession();
    const cache = useRef<Map<string, string[]>>(new Map<string, string[]>());

    useEffect(() => {
        if (!searching) return;
        const token = session.data?.github;

        if (!token) {
            console.error("No token was found.");
            return;
        }

        console.log("Searching...");

        searchConnections(
            token,
            user,
            target,
            (phase, count, error) => {
                if (error) {
                    console.error(`Error while searching: ${error}`);
                }
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

    const handleSearch = async () => {
        if (searching) return;
        setSearching(true);
    };

    return (
        <div className="absolute bg-[radial-gradient(#0D1117_.2rem,#010409_1px)] bg-size-[2rem_2rem] min-h-full min-w-full">
            <div className="absolute text-2xl bg-foreground border border-border rounded-sm text-font top-[10%] flex flex-row justify-center items-center gap-10 py-5 px-10 left-1/2 -translate-x-1/2 shadow-[0_0_15px_--theme(--color-font/0.25)]">
                <div className="flex flex-col gap-2 justify-center items-center">
                    <h2>From</h2>
                    <input
                        className="code bg-background border border-font rounded-sm text-font w-100 text-center"
                        type="text"
                        onChange={(event) => {
                            if (!searching) setUser(event.target.value);
                        }}
                    />
                </div>
                <FaArrowRightLong />
                <div className="flex flex-col gap-2 justify-center items-center">
                    <h2>To</h2>
                    <input
                        className="code bg-background border border-font rounded-sm text-font w-100 text-center"
                        type="text"
                        onChange={(event) => {
                            if (!searching) setTarget(event.target.value);
                        }}
                    />
                </div>
                <button
                    className="p-3 aspect-square gap-2 flex flex-row justify-center items-center bg-clickable border border-border rounded-sm"
                    onClick={handleSearch}
                >
                    <FaSearch />
                </button>
            </div>
            <canvas className="absolute z-1"></canvas>
        </div>
    );
}
