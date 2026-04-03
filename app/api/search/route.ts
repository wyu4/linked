import { NextResponse } from "next/server";

export function GET(res: Request) {
    return NextResponse.json({ message: "This will be the endpoint for search requests!" });
}
