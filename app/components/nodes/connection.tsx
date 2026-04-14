import { DivPropsNoChildren } from "@/types/global";
import { bindRefAndForwardRef } from "@/utils/ref-helper";
import { REM } from "@/utils/scaling";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all";
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";

gsap.registerPlugin(Draggable, InertiaPlugin);

const FOLLOW_DURATION = 0.03;

const Connection = forwardRef<
    HTMLDivElement,
    DivPropsNoChildren & {
        size: Bounds;
        data: MutualConnection;
        initialPos: number[];
        initialDirection?: number[];
    }
>(({ data, size, initialPos, initialDirection = [0, 0], className = "", ...props }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLParagraphElement>(null);

    useGSAP(() => {
        if (initialPos.length < 2) return;

        gsap.set([ref.current, nameRef.current], {
            x: initialPos[0],
            y: initialPos[1],
        });
    }, []);

    useGSAP(
        () => {
            if (!ref.current || !nameRef.current) return;

            const updateNameX = gsap.quickTo(nameRef.current, "x", { duration: FOLLOW_DURATION, ease: "power2.inOut" });
            const updateNameY = gsap.quickTo(nameRef.current, "y", { duration: FOLLOW_DURATION, ease: "power2.inOut" });

            const updateNamePosition = () => {
                if (!ref.current || !nameRef.current) return;
                const x = gsap.getProperty(ref.current, "x") as number;
                const y = gsap.getProperty(ref.current, "y") as number;

                const nodeW = ref.current.offsetWidth;
                const nameW = nameRef.current.offsetWidth;
                const nameH = nameRef.current.offsetHeight;

                updateNameX(x + nodeW / 2 - nameW / 2);
                updateNameY(y - nameH - REM);
            };

            gsap.ticker.add(updateNamePosition);

            const [draggable] = Draggable.create(ref.current, {
                bounds: ref.current.parentElement,
                inertia: true,
                onPress: (e: PointerEvent) => e.stopPropagation(),
            });
            return () => {
                draggable.kill();
                gsap.ticker.remove(updateNamePosition);
            };
        },
        {
            scope: ref,
            dependencies: [],
        },
    );

    return (
        <>
            <div
                ref={(node) => bindRefAndForwardRef(node, forwardedRef, ref)}
                className={"node absolute aspect-square bg-font rounded-full overflow-y-visible overflow-x-hidden " + className}
                style={{ x: initialPos[0], y: initialPos[1], width: size.x / 10, minWidth: 7.5 * REM }}
                {...props}
            ></div>
            <p ref={nameRef} className="code absolute text-2xl text-center origin-center" style={{ width: `${data.login.length}rem` }}>
                {data.login}
            </p>
        </>
    );
});

export default Connection;
