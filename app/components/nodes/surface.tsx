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
const ZOOM_DURATION = 0.5;

type Bounds = { x: number; y: number; max?: number };
const BOUNDS_ZERO: Bounds = { x: 0, y: 0, max: 0 };

type Mounted = {
    drag: boolean;
    scale: boolean;
};

export default function Surface() {
    const container = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const scaledSurface = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<Bounds>(BOUNDS_ZERO);
    const [zoom, setZoom] = useState(ZOOM_MIN);
    const zoomPosition = useRef<Bounds>(BOUNDS_ZERO);

    useLayoutEffect(() => {
        const updateMinWidth = () => {
            const x = window.innerWidth;
            const y = window.innerHeight;
            setSize({ x, y, max: Math.max(x, y) });
        };
        updateMinWidth();
        window.addEventListener("resize", updateMinWidth);

        const updateScale = (deltaScale: number) => {
            setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + deltaScale)));
        };

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            zoomPosition.current.x = e.clientX;
            zoomPosition.current.y = e.clientY;
            updateScale(-e.deltaY * ZOOM_INTENSITY);
        };

        window.addEventListener("wheel", onWheel, { passive: false });

        return () => {
            window.removeEventListener("resize", updateMinWidth);
            window.removeEventListener("wheel", onWheel);
        };
    }, []);

    useGSAP(() => {
        gsap.fromTo(surface.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }, []);

    const mounted = useRef<Mounted>({ drag: false, scale: false });
    useGSAP(
        () => {
            if (!container.current || !surface.current || (size.max ?? 0) <= 0) return;

            if (mounted.current.drag) {
            } else {
                const bounds = container.current.getBoundingClientRect();
                const centerX = (bounds.width - size.x / ZOOM_MIN) / 2;
                const centerY = (bounds.height - size.y / ZOOM_MIN) / 2;
                // gsap.set(surface.current, { x: centerX, y: centerY });
                gsap.set(scaledSurface.current, { x: centerX, y: centerY });

                const handleFocus = () => {
                    if (!document.activeElement || document.activeElement.className.includes("surface")) return;
                    (document.activeElement as HTMLElement).blur();
                };

                Draggable.create(surface.current, {
                    bounds: container.current,
                    inertia: true,
                    onPress: handleFocus,
                });
                mounted.current.drag = true;
            }
        },
        { scope: container, dependencies: [size] },
    );

    useGSAP(() => {
        if (!container.current || !scaledSurface.current || !surface.current || (size.max ?? 0) <= 0) return;
        if (!mounted.current.scale && container.current) {
            gsap.set(scaledSurface.current, { scale: zoom });
            mounted.current.scale = true;
        } else {
            const bounds = container.current.getBoundingClientRect();
            const lastZoom = gsap.getProperty(scaledSurface.current, "scale") as number;

            // All x/y coordinates are anchored to the element's center, and relative to the screen's center

            const currentX = gsap.getProperty(surface.current, "x") as number;
            const currentY = gsap.getProperty(surface.current, "y") as number;

            const desiredX = (zoomPosition.current.x - size.x / 2) / lastZoom;
            const desiredY = (zoomPosition.current.y - size.y / 2) / lastZoom;

            const scaleRatio = zoom / lastZoom;

            const newX = currentX - desiredX * (scaleRatio - 1);
            const newY = currentY - desiredY * (scaleRatio - 1);

            const maxWidth = (size.x / ZOOM_MIN) * zoom;
            const maxHeight = (size.y / ZOOM_MIN) * zoom;

            const maxX = (maxWidth - bounds.width) / 2 / zoom;
            const maxY = (maxHeight - bounds.height) / 2 / zoom;

            const clampedX = gsap.utils.clamp(-maxX, maxX, newX);
            const clampedY = gsap.utils.clamp(-maxY, maxY, newY);

            gsap.to(scaledSurface.current, { scale: zoom, duration: ZOOM_DURATION, ease: "power2.out" });
            gsap.to(surface.current, { x: clampedX, y: clampedY, duration: ZOOM_DURATION, ease: "power2.out" });
        }
    }, [zoom, size]);

    return (
        <div ref={container} className="relative z-1 w-full h-full shrink-0 overflow-clip antialiased">
            <div ref={scaledSurface} className="absolute flex justify-center items-center" style={{ width: size.x / ZOOM_MIN, height: size.y / ZOOM_MIN }}>
                <div
                    ref={surface}
                    className="absolute surface w-full h-full origin-center"
                    style={{
                        backgroundSize: `${(size.max ?? 0) * 0.05}px ${(size.max ?? 0) * 0.05}px`,
                        backgroundImage: `radial-gradient(#212830 ${(size.max ?? 0) * 0.003}px,transparent 1px)`,
                    }}
                ></div>
            </div>
        </div>
    );
}
