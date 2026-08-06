import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserUpdate, mockWriteFile, mockMkdir } = vi.hoisted(() => ({
    mockUserUpdate: vi.fn(),
    mockWriteFile: vi.fn(),
    mockMkdir: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
    prisma: {
        user: { update: mockUserUpdate },
    },
}));

vi.mock("next-auth", () => ({
    getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
    authOptions: {},
}));

vi.mock("fs/promises", () => ({
    writeFile: mockWriteFile,
    mkdir: mockMkdir,
}));

import { POST } from "@/app/api/users/[id]/avatar/route";
import { getServerSession } from "next-auth";

const makeRequest = (userId: string, file: File | null) => {
    const formData = new FormData();
    if (file) formData.append("file", file);

    return [
        new Request(`http://localhost/api/users/${userId}/avatar`, { method: "POST", body: formData }),
        { params: Promise.resolve({ id: userId }) } as never,
    ] as const;
};

const fileOf = (name: string, type: string, bytes: number) =>
    new File([new Uint8Array(bytes)], name, { type });

describe("POST /api/users/[id]/avatar", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getServerSession).mockResolvedValue({ user: { id: "u1", isAdmin: false } } as never);
        mockUserUpdate.mockResolvedValue({ id: "u1", image: "/uploads/avatars/u1.png" });
    });

    it("stores the image using the extension derived from the MIME type", async () => {
        const [req, ctx] = makeRequest("u1", fileOf("selfie.jpeg.exe", "image/png", 32));
        const res = await POST(req, ctx);

        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.image).toBe("/uploads/avatars/u1.png");
        expect(mockWriteFile).toHaveBeenCalledOnce();
        expect(mockWriteFile.mock.calls[0][0]).toMatch(/u1\.png$/);
    });

    it("returns 400 for a non-image upload", async () => {
        const [req, ctx] = makeRequest("u1", fileOf("payload.exe", "application/x-msdownload", 32));
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("unsupported_image_type");
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("returns 400 for an image over the size limit", async () => {
        const [req, ctx] = makeRequest("u1", fileOf("huge.png", "image/png", 3 * 1024 * 1024));
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("image_too_large");
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("returns 400 when no file is provided", async () => {
        const [req, ctx] = makeRequest("u1", null);
        const res = await POST(req, ctx);

        expect(res.status).toBe(400);
    });

    it("returns 403 when uploading an avatar for someone else", async () => {
        const [req, ctx] = makeRequest("u2", fileOf("selfie.png", "image/png", 32));
        const res = await POST(req, ctx);

        expect(res.status).toBe(403);
        expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("returns 401 when not authenticated", async () => {
        vi.mocked(getServerSession).mockResolvedValue(null);

        const [req, ctx] = makeRequest("u1", fileOf("selfie.png", "image/png", 32));
        const res = await POST(req, ctx);

        expect(res.status).toBe(401);
    });
});
