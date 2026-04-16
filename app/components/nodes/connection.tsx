import { DivPropsNoChildren } from "@/types/global";
import { bindRefAndForwardRef } from "@/utils/ref-helper";
import { calculateNodeWidth, REM } from "@/utils/scaling";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all";
import { forwardRef, RefObject, useRef } from "react";

gsap.registerPlugin(Draggable, InertiaPlugin);

const FOLLOW_DURATION = 0.03;

const Connection = forwardRef<
    HTMLDivElement,
    DivPropsNoChildren & {
        parentDraggable: RefObject<Draggable | null>;
        size: Bounds;
        data: MutualConnection;
        initialPos: number[];
        initialDirection?: number[];
    }
>(({ parentDraggable, data, size, initialPos, initialDirection = [0, 0], className = "", ...props }, forwardedRef) => {
    const ref = useRef<HTMLDivElement>(null);
    const nameRef = useRef<HTMLParagraphElement>(null);

    useGSAP(() => {
        if (initialPos.length < 2 || initialDirection.length < 2) return;

        gsap.fromTo(
            [ref.current, nameRef.current],
            {
                x: initialPos[0],
                y: initialPos[1],
            },
            {
                x: "+=" + initialDirection[0],
                y: "+=" + initialDirection[0],
                duration: 1,
                ease: "sine.out",
            },
        );
        gsap.fromTo(
            [ref.current, nameRef.current],
            { opacity: 0 },
            {
                opacity: 1,
                stagger: {
                    from: "start",
                    each: 0.25,
                },
                duration: 0.5,
            },
        );
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
                allowNativeTouchScrolling: false,
                // onPress: (e: PointerEvent) => e.stopPropagation(),
                onPressInit: () => {
                    parentDraggable.current?.disable();
                },
                onRelease: () => {
                    parentDraggable.current?.enable();
                },
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
                className={
                    "node absolute aspect-square bg-font border-4 border-font rounded-full overflow-y-visible overflow-x-hidden flex items-center justify-center z-20" +
                    className
                }
                style={{ x: initialPos[0], y: initialPos[1], width: calculateNodeWidth(size.x) }}
                {...props}
            >
                <img src={`https://github.com/${data.login}.png`} />
            </div>
            <p ref={nameRef} className="code absolute text-2xl text-center origin-center z-20" style={{ width: `${data.login.length}rem` }}>
                {data.login}
            </p>
        </>
    );
});

export default Connection;
