/**
 * REM unit in pixels, assumed to be 16px.
 */
export const REM = 16;

/**
 * Desired ratio between the width of the connection node to its container's.
 */
export const NODE_SCALE_FACTOR = 0.08;

/**
 * Calculate the width that a connection node will have
 * @param windowWidth Width of the container of the node
 * @returns The width of the node
 */
export const calculateNodeWidth = (windowWidth: number) => Math.max(windowWidth * NODE_SCALE_FACTOR, 2.5 * REM);
