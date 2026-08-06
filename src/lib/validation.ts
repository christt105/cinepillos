import { NextResponse } from "next/server";
import { z } from "zod";

type ParseFailure = { ok: false; response: NextResponse };

type ParseResult<T> = { ok: true; data: T } | ParseFailure;

const invalidBody = (fields: Record<string, string[] | undefined>): ParseFailure => ({
    ok: false,
    response: NextResponse.json({ error: "invalid_body", fields }, { status: 400 }),
});

/** Parses and validates a JSON body, or answers 400 with the failing fields. */
export async function parseBody<S extends z.ZodType>(
    req: Request,
    schema: S
): Promise<ParseResult<z.infer<S>>> {
    let raw: unknown;

    try {
        raw = await req.json();
    } catch {
        return invalidBody({ body: ["Expected a JSON body"] });
    }

    const result = schema.safeParse(raw);
    if (!result.success) {
        return invalidBody(z.flattenError(result.error).fieldErrors);
    }

    return { ok: true, data: result.data };
}
