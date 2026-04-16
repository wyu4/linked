import { SVGPropsNoChildren } from "@/types/global";
import { bindRefAndForwardRef } from "@/utils/ref-helper";
import { calculateNodeWidth } from "@/utils/scaling";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { forwardRef, RefObject, useRef } from "react";

const ConnectionLine = forwardRef<
    SVGSVGElement,
    SVGPropsNoChildren & {
        scaledSurfaceRef: RefObject<HTMLDivElement | null>;
        connections: HTMLDivElement[];
        windowSize: Bounds;
        updateTime: number;
    }
>(({ scaledSurfaceRef, connections, updateTime, windowSize, className = "", ...props }, forwardRef) => {
    const ref = useRef<SVGSVGElement>(null);
    const lineRef = useRef<SVGPolylineElement>(null);
    const nodeWidth = calculateNodeWidth(windowSize.x);

    const lastUpdateTime = useRef(0);
    useGSAP(() => {
        let frame: number | null = null;

        const updatePoints = () => {
            if (ref.current && lineRef.current && scaledSurfaceRef.current) {
                const bounds = ref.current.getBoundingClientRect();
                const zoom = gsap.getProperty(scaledSurfaceRef.current, "scale") as number;
                const points = connections
                    .filter(Boolean)
                    .map((element) => {
                        const elementBounds = element.getBoundingClientRect();

                        const x = (elementBounds.x - bounds.x) / zoom;
                        const y = (elementBounds.y - bounds.y) / zoom;

                        return `${x + nodeWidth / 2},${y + nodeWidth / 2}`;
                    })
                    .join(" ");
                lineRef.current.setAttribute("points", points);
            }
            frame = requestAnimationFrame(updatePoints);
        };
        frame = requestAnimationFrame(updatePoints);

        if (lastUpdateTime.current !== updateTime) {
            lastUpdateTime.current = updateTime;
            gsap.fromTo(
                lineRef.current,
                { attr: { opacity: 0 } },
                {
                    attr: { opacity: 1 },
                    duration: 0.5,
                    delay: 0.5,
                    overwrite: true,
                },
            );
        }

        return () => {
            if (frame) cancelAnimationFrame(frame);
        };
    }, [connections, updateTime]);

    // useEffect(() => console.log("Points: ", points), [points]);

    return (
        <svg ref={(node) => bindRefAndForwardRef(node, forwardRef, ref)} className={"pointer-events-none absolute h-full w-full " + className} {...props}>
            <polyline ref={lineRef} stroke="rgba(40, 131, 248)" strokeWidth={nodeWidth / 4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
});

export default ConnectionLine;
