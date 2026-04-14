import { SVGPropsNoChildren } from "@/types/global";
import { bindRefAndForwardRef } from "@/utils/ref-helper";
import { calculateNodeWidth } from "@/utils/scaling";
import { forwardRef, useEffect, useLayoutEffect, useRef, useState } from "react";

const ConnectionLine = forwardRef<
    SVGSVGElement,
    SVGPropsNoChildren & {
        connections: HTMLDivElement[];
        windowSize: Bounds;
        zoom: number;
    }
>(({ connections, zoom, windowSize, className = "", ...props }, forwardRef) => {
    const ref = useRef<SVGSVGElement>(null);
    const lineRef = useRef<SVGPolylineElement>(null);
    const nodeWidth = calculateNodeWidth(windowSize.x);

    useEffect(() => {
        let frame: number | null = null;

        const updatePoints = () => {
            if (ref.current && lineRef.current) {
                const svgPoint = ref.current.createSVGPoint();
                const inverseCTM = ref.current.getScreenCTM()?.inverse();
                if (inverseCTM) {
                    const points = connections
                        .filter(Boolean)
                        .map((element) => {
                            const bounds = element.getBoundingClientRect();

                            svgPoint.x = bounds.x;
                            svgPoint.y = bounds.y;

                            const local = svgPoint.matrixTransform(inverseCTM);

                            return `${local.x + nodeWidth / 2},${local.y + nodeWidth / 2}`;
                        })
                        .join(" ");
                    lineRef.current.setAttribute("points", points);
                }
            }
            frame = requestAnimationFrame(updatePoints);
        };
        frame = requestAnimationFrame(updatePoints);

        return () => {
            if (frame) cancelAnimationFrame(frame);
        };
    }, [connections]);

    // useEffect(() => console.log("Points: ", points), [points]);

    return (
        <svg ref={(node) => bindRefAndForwardRef(node, forwardRef, ref)} className={"pointer-events-none absolute h-full w-full " + className} {...props}>
            <polyline
                ref={lineRef}
                className="absolite h-full w-full"
                stroke="rgba(40, 131, 248)"
                strokeWidth={nodeWidth / 4}
                fill="none"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
        </svg>
    );
});

export default ConnectionLine;
