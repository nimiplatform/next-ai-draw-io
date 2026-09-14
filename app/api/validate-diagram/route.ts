// Nimi AI runs in the supervised App through the public Local App bridge.
// This Next helper exposes no provider connection or protected forwarding route.
export async function POST(): Promise<Response> {
    return Response.json(
        {
            error: "Use Next AI Draw.io through Nimi Desktop for AI operations.",
        },
        { status: 403 },
    )
}
