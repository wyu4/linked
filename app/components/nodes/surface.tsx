import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

type SurfaceType = {
    data: MutualConnection[];
};

gsap.registerPlugin(Draggable, InertiaPlugin);

const ZOOM_INTENSITY = 0.0015;
const ZOOM_MAX = 2;
const ZOOM_MIN = 0.5;

type Bounds = { w: number; h: number; max: number };
const BOUNDS_ZERO: Bounds = { w: 0, h: 0, max: 0 };

export default function Surface() {
    const container = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const scaledSurface = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<Bounds>(BOUNDS_ZERO);
    const lastSize = useRef(BOUNDS_ZERO);

    useLayoutEffect(() => {
        const updateMinWidth = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setSize({ w, h, max: Math.max(w, h) });
        };
        updateMinWidth();
        window.addEventListener("resize", updateMinWidth);

        return () => window.removeEventListener("resize", updateMinWidth);
    }, []);

    useGSAP(() => {
        gsap.fromTo(surface.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }, []);

    const mounted = useRef(false);
    useGSAP(
        () => {
            if (!container.current || !surface.current || size.max <= 0) return;

            if (mounted.current) {
            } else {
                const bounds = container.current.getBoundingClientRect();
                const centerX = (bounds.width - size.w) / 2;
                const centerY = (bounds.height - size.h) / 2;
                gsap.set(surface.current, { x: centerX, y: centerY });

                const handleFocus = () => {
                    if (!document.activeElement || document.activeElement.className.includes("surface")) return;
                    (document.activeElement as HTMLElement).blur();
                };

                Draggable.create(surface.current, {
                    bounds: container.current,
                    inertia: true,
                    onPress: handleFocus,
                });
                mounted.current = true;
            }
            lastSize.current = size;
        },
        { scope: container, dependencies: [size] },
    );

    return (
        <div ref={container} className="relative z-1 w-full h-full shrink-0 overflow-hidden">
            <div ref={scaledSurface} className="absolute origin-center flex justify-center items-center" style={{ width: size.w, height: size.h }}>
                <div
                    ref={surface}
                    className="surface w-full h-full origin-center"
                    style={{
                        backgroundSize: `${size.max * 0.05}px ${size.max * 0.05}px`,
                        backgroundImage: `radial-gradient(#212830 ${size.max * 0.002}px,transparent 1px)`,
                    }}
                ></div>
            </div>
        </div>
    );
}
