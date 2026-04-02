"use client";

import { forwardRef } from "react";
import { LuInfo } from "react-icons/lu";
import { DivProps } from "../global/global";

const InfoWidget = forwardRef<HTMLDivElement, DivProps & { icon?: boolean }>(({ className, icon = true, children, ...props }, ref) => {
    return (
        <div
            className={`${className} flex flex-row max-w-sm justify-start items-center text-link text-sm bg-focus px-6 py-3 gap-2 border border-link rounded`}
            ref={ref}
            {...props}
        >
            {icon && <LuInfo className="shrink-0" />}
            {children}
        </div>
    );
});

export default InfoWidget;
