"use client";

import { forwardRef, useState } from "react";
import { FaEye } from "react-icons/fa";
import { FaEyeSlash } from "react-icons/fa";
import { FaCheck } from "react-icons/fa6";

const LoginWidget = forwardRef<HTMLDivElement, DivPropsNoChildren>(({ className, ...props }: DivPropsNoChildren, forwardedRef) => {
    const [showingPassword, setShowingPassword] = useState(false);

    return (
        <div
            ref={forwardedRef}
            className={`${className} flex flex-col justify-center items-center bg-foreground px-6 py-3 gap-3 border border-border rounded`}
            {...props}
        >
            <h2 className="">Authentication</h2>
            <p>Please provide a valid GitHub Access Token.</p>
            <div className="flex flex-row flex-nowrap gap-1">
                <input
                    className="border border-border rounded bg-background px-2 py-1"
                    type={showingPassword ? "text" : "password"}
                    name="GitHub Access Token"
                ></input>
                <button
                    className="border border-border rounded bg-background px-2 py-1"
                    onClick={() => {
                        setShowingPassword((prev) => !prev);
                    }}
                >
                    {showingPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
            </div>
            <button className="px-6 py-1 bg-success border border-border rounded text-2xl">
                <FaCheck />
            </button>
        </div>
    );
});

export default LoginWidget;
