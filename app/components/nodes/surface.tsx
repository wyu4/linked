import { DivPropsNoChildren } from "@/types/global";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { Draggable, InertiaPlugin } from "gsap/all";
import { JSX, RefObject, useEffect, useLayoutEffect, useRef, useState } from "react";
import Connection from "./connection";
import { calculateNodeWidth, REM } from "@/utils/scaling";
import ConnectionLine from "./line";

type SurfaceType = {
    data?: MutualConnection[];
    updateTime?: number;
};

gsap.registerPlugin(Draggable, InertiaPlugin);

const ZOOM_INTENSITY = 0.0015;
const ZOOM_MAX = 2;
const ZOOM_MIN = 0.5;
const ZOOM_DURATION = 0.5;

const INITIAL_DRIFT_DISTANCE = 2 * REM;

const BOUNDS_ZERO: Bounds = { x: 0, y: 0, max: 0 };

type Mounted = {
    drag: boolean;
    scale: boolean;
};

const Surface = ({ className, data = [], updateTime = 0, ...props }: SurfaceType & DivPropsNoChildren) => {
    const container = useRef<HTMLDivElement>(null);
    const surface = useRef<HTMLDivElement>(null);
    const scaledSurface = useRef<HTMLDivElement>(null);
    const [size, setSize] = useState<Bounds>(BOUNDS_ZERO);
    const [zoom, setZoom] = useState(ZOOM_MIN);
    const zoomPosition = useRef<Bounds>(BOUNDS_ZERO);
    const pinchDistance = useRef<number>(undefined);
    const connectionRefs = useRef<HTMLDivElement[]>([]);

    const calculateRandomDirection = () => Math.random() * 2 * INITIAL_DRIFT_DISTANCE - INITIAL_DRIFT_DISTANCE;

    const createConnectionElements = (): JSX.Element[] => {
        const refs: HTMLDivElement[] = [];
        const elements = data.map((con, i) => {
            // if (i === 0) connectionElements.current = [];
            const gap = (size.x / data.length) * 0.75;
            const totalWidth = gap * (data.length - 1) + calculateNodeWidth(size.x);

            const x = i * gap + size.x / 2 - totalWidth / 2;
            const y = Math.random() * size.y * 0.33 + size.y * 0.33;
            return (
                <Connection
                    ref={(node) => {
                        refs[i] = node!;
                    }}
                    key={`node-${i}-${updateTime}`}
                    size={size}
                    data={con}
                    initialPos={[x / ZOOM_MIN, y / ZOOM_MIN]}
                    initialDirection={[calculateRandomDirection(), calculateRandomDirection()]}
                />
            );
        });
        connectionRefs.current = refs;
        return elements;
    };

    const isSurfaceTarget = (target: EventTarget | Element | null | undefined) => {
        if (!target || !container.current) return false;
        const el = target as HTMLElement;
        return !el.classList.contains("node") && (el.classList.contains("surface") || el == surface.current);
    };

    useLayoutEffect(() => {
        if (!container.current) return;

        // Sizing
        const sizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const x = entry.contentRect.width;
                const y = entry.contentRect.height;
                setSize({ x, y, max: Math.max(x, y) });
            }
        });
        sizeObserver.observe(container.current);

        // Zooming
        const updateZoom = (deltaScale: number) => {
            setZoom((prev) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, prev + deltaScale)));
        };

        const onWheel = (e: WheelEvent) => {
            if (!isSurfaceTarget(e.target)) return;
            e.preventDefault();
            zoomPosition.current.x = e.clientX;
            zoomPosition.current.y = e.clientY;
            updateZoom(-e.deltaY * ZOOM_INTENSITY);
        };
        window.addEventListener("wheel", onWheel, { passive: false });

        // Zooming but for touch screen
        const getDistanceBetweenTouches = (touches: TouchList) => {
            return Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
        };

        const onTouchStart = (e: TouchEvent) => {
            if (!isSurfaceTarget(e.target)) return;
            if (e.touches.length === 2) {
                pinchDistance.current = getDistanceBetweenTouches(e.touches);
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            if (!isSurfaceTarget(e.target) || e.touches.length != 2 || !pinchDistance.current) return;
            e.preventDefault();

            const touches = e.touches;

            const newDistance = getDistanceBetweenTouches(touches);
            const delta = newDistance - pinchDistance.current;
            pinchDistance.current = newDistance;

            zoomPosition.current.x = (touches[0].clientX + touches[1].clientX) / 2;
            zoomPosition.current.y = (touches[0].clientY + touches[1].clientY) / 2;

            updateZoom(delta * ZOOM_INTENSITY * 3); // slightly higher multiplier for feel
        };

        const onTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                pinchDistance.current = undefined;
            }
        };

        window.addEventListener("touchstart", onTouchStart, { passive: false });
        window.addEventListener("touchmove", onTouchMove, { passive: false });
        window.addEventListener("touchend", onTouchEnd);

        return () => {
            sizeObserver.disconnect();
            window.removeEventListener("wheel", onWheel);
            window.removeEventListener("touchstart", onTouchStart);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, []);

    useGSAP(() => {
        gsap.fromTo(surface.current, { opacity: 0 }, { opacity: 1, duration: 0.5 });
    }, []);

    const mounted = useRef<Mounted>({ drag: false, scale: false });
    useGSAP(
        () => {
            if (!container.current || !surface.current || (size.max ?? 0) <= 0) return;

            if (!mounted.current.drag) {
                const handleFocus = (e: PointerEvent) => {
                    const target = document.activeElement;
                    if (isSurfaceTarget(target)) return;
                    (target as HTMLElement).blur();
                };

                const [draggable] = Draggable.create(surface.current, {
                    bounds: container.current,
                    inertia: true,
                    onPress: handleFocus,
                });
                mounted.current.drag = true;

                return () => draggable.kill();
            }
        },
        { scope: container, dependencies: [size] },
    );

    useEffect(() => {
        setZoom(ZOOM_MIN);
    }, [data]);

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
        <div ref={container} {...props} className={"surface relative z-1 shrink-0 overflow-clip antialiased h-full w-full flex justify-center items-center"}>
            <div
                ref={scaledSurface}
                className="surface relative shrink-0 flex justify-center items-center"
                style={{ width: size.x / ZOOM_MIN, height: size.y / ZOOM_MIN }}
            >
                <div
                    ref={surface}
                    className="surface absolute h-full w-full origin-center flex justify-center items-center"
                    style={{
                        backgroundSize: `${(size.max ?? 0) * 0.05}px ${(size.max ?? 0) * 0.05}px`,
                        backgroundImage: `radial-gradient(#212830 ${(size.max ?? 0) * 0.004}px,transparent 1px)`,
                    }}
                >
                    <div className="surface relative w-full h-full">
                        {data && createConnectionElements()}
                        <ConnectionLine windowSize={size} connections={connectionRefs.current} zoom={zoom} className="z-15" updateTime={updateTime} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Surface;
