import { InputProps } from "@/types/global";
import { filterUsername } from "@/utils/search";
import { ChangeEvent, forwardRef } from "react";

const UserInput = forwardRef<HTMLInputElement, InputProps & { defaultUser?: string }>(({ className, defaultUser = "wyu4", onChange, ...props }, ref) => {
    const filter = (e: ChangeEvent<HTMLInputElement>) => {
        e.target.value = filterUsername(e.target.value);
        onChange?.(e);
    };
    return (
        <input
            ref={ref}
            className={"code border border-[#00000000] ring-2 ring-border focus:ring-link rounded-xl text-lg outline-hidden px-3 py-1.5 " + className}
            type="text"
            placeholder={`i.e. ${defaultUser}`}
            onChange={filter}
            {...props}
        />
    );
});

export default UserInput;
