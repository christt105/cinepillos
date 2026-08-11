import { test, expect, type Page } from "@playwright/test";
import { signIn } from "./auth";
import { prisma } from "@/lib/prisma";

const ITEM_H = 48;

/** Cine Fórum is the club whose only session has no date yet. */
async function openScheduleDialog(page: Page) {
    await signIn(page);

    const group = await prisma.group.findFirstOrThrow({ where: { name: "Cine Fórum" } });
    await page.goto(`/g/${group.id}`);
    await page.getByRole("button", { name: "Programar" }).click();

    const overlay = page.locator(".modal-overlay");
    await expect(overlay).toBeVisible();
    return overlay;
}

test("the schedule dialog covers the screen, not the card that opened it", async ({ page }) => {
    const overlay = await openScheduleDialog(page);

    // backdrop-filter on the surrounding .glass-card makes it a containing
    // block for fixed positioning, so an inline overlay gets clipped to the
    // card. Same failure the film picker had in 063487f.
    expect(await overlay.evaluate(el => el.parentElement === document.body)).toBe(true);

    const fit = await overlay.evaluate(el => {
        const box = el.getBoundingClientRect();
        return {
            width: box.width,
            height: box.height,
            viewportWidth: document.documentElement.clientWidth,
            viewportHeight: document.documentElement.clientHeight,
        };
    });

    expect(fit.width).toBeGreaterThanOrEqual(fit.viewportWidth - 1);
    expect(fit.height).toBeGreaterThanOrEqual(fit.viewportHeight - 1);
});

test("one wheel notch moves the hour drum by exactly one hour", async ({ page, isMobile }) => {
    test.skip(!!isMobile, "the wheel is a desktop pointer");

    const overlay = await openScheduleDialog(page);

    const timeTab = page.getByRole("button", { name: /🕐/ });
    await timeTab.click();

    const readHour = async () =>
        Number(/(\d{2}):(\d{2})/.exec((await timeTab.textContent()) ?? "")![1]);

    const hours = overlay.locator(".drum-col").first();
    await hours.hover();

    const before = await readHour();
    // The drum clamps at 00 and 23, so pick a direction that has room.
    const step = before < 12 ? 1 : -1;

    await page.mouse.wheel(0, 120 * step);
    await expect.poll(readHour).toBe(before + step);

    // A notch used to scroll further than one item and leave the drum between
    // two values; it has to settle on a snap position.
    const offset = await hours.evaluate((el, itemHeight) => el.scrollTop % itemHeight, ITEM_H);
    expect(Math.min(offset, ITEM_H - offset)).toBeLessThanOrEqual(1);
});
