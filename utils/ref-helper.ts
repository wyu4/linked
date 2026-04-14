import type { ForwardedRef, RefObject } from "react";

export function bindRefAndForwardRef<T>(node: T | null, forwardedRef: ForwardedRef<T>, ref: RefObject<T | null> | RefObject<T>) {
    ref.current = node;
    if (forwardedRef) {
        if (typeof forwardedRef === "function") forwardedRef(node);
        else forwardedRef.current = node;
    }
}
