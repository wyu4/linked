"use client";
import { FaArrowRightLong } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";

type DashboardClientType = {
    name?: string;
};

export default function DashboardClient({ name = "Unknown User" }: DashboardClientType) {
    return (
        <div className="absolute bg-[radial-gradient(#0D1117_.2rem,#010409_1px)] bg-size-[2rem_2rem] min-h-full min-w-full">
            <div className="absolute text-2xl bg-foreground border border-border rounded-sm text-font top-[10%] flex flex-row justify-center items-center gap-10 py-5 px-10 left-1/2 -translate-x-1/2 shadow-[0_0_15px_--theme(--color-font/0.25)]">
                <div className="flex flex-col gap-2 justify-center items-center">
                    <h2>From</h2>
                    <input className="code bg-background border border-font rounded-sm text-font w-100 text-center" type="text" />
                </div>
                <FaArrowRightLong />
                <div className="flex flex-col gap-2 justify-center items-center">
                    <h2>To</h2>
                    <input className="code bg-background border border-font rounded-sm text-font w-100 text-center" type="text" />
                </div>
                <button className="p-3 aspect-square gap-2 flex flex-row justify-center items-center bg-clickable border border-border rounded-sm">
                    <FaSearch />
                </button>
            </div>
            <canvas className="absolute z-1"></canvas>
        </div>
    );
}
