import { test, expect, type Page } from "@playwright/test";
import { signIn as authenticate } from "./auth";
import { prisma } from "@/lib/prisma";

/**
 * `body` hides horizontal overflow, so a cut-off element does not widen the
 * document. This looks for boxes that stick out of the viewport instead, which
 * is what actually clipped the winning film title on the home page.
 */
async function overflowingElements(page: Page) {
    return page.evaluate(() => {
        const limit = document.documentElement.clientWidth;
        const offenders: string[] = [];

        for (const el of document.querySelectorAll("body *")) {
            if (getComputedStyle(el).position === "fixed") continue;

            const box = el.getBoundingClientRect();
            if (box.width === 0 && box.height === 0) continue;
            if (box.right > limit + 1 || box.left < -1) {
                offenders.push(
                    `<${el.tagName.toLowerCase()} class="${el.className}"> ` +
                    `left=${Math.round(box.left)} right=${Math.round(box.right)} ` +
                    `(viewport ${limit}): ${(el.textContent ?? "").trim().slice(0, 40)}`
                );
            }
        }

        return offenders;
    });
}

/**
 * Landing on "/" only proves the redirect works; it resolves to whichever club
 * was visited last, which another spec may have changed. The demo data these
 * tests assert on all lives in Zorropillos, so ask for it by name.
 */
async function signIn(page: Page) {
    await authenticate(page);
    await page.goto("/");
    await page.waitForURL(url => !url.pathname.startsWith("/login"));

    const group = await prisma.group.findFirstOrThrow({ where: { name: "Zorropillos" } });
    return group.id;
}

test("the login page fits the viewport", async ({ page }) => {
    await page.goto("/login");
    expect(await overflowingElements(page)).toEqual([]);
});

test("the Google sign-in button is centred in the login card", async ({ page }) => {
    await page.goto("/login");

    const card = page.locator(".glass-card").first();
    const button = card.getByRole("button", { name: /google/i });
    await expect(button).toBeVisible();

    // A <button> sizes to fit-content, so without an explicit width it sat
    // against the card's left padding edge rather than under the title.
    const fit = await card.evaluate(box => {
        const button = box.querySelector("button")!.getBoundingClientRect();
        const card = box.getBoundingClientRect();
        const style = getComputedStyle(box);
        const inset = (side: "Left" | "Right") =>
            parseFloat(style[`padding${side}` as "paddingLeft"]) +
            parseFloat(style[`border${side}Width` as "borderLeftWidth"]);

        return {
            buttonCentre: (button.left + button.right) / 2,
            contentCentre:
                (card.left + inset("Left") + card.right - inset("Right")) / 2,
        };
    });

    expect(Math.abs(fit.buttonCentre - fit.contentCentre)).toBeLessThanOrEqual(1);
});

test("the group pages fit the viewport", async ({ page }) => {
    const groupId = await signIn(page);

    for (const path of [
        `/g/${groupId}`,
        `/g/${groupId}/meetings`,
        `/g/${groupId}/members`,
        `/g/${groupId}/search`,
        "/settings",
        "/admin",
    ]) {
        await page.goto(path);
        // `networkidle` used to wait here, but it also waits out slow
        // third-party poster fetches that can't move this layout: `.poster`
        // is a fixed 2:3 aspect-ratio box, so the image never affects
        // overflow. What can is data a page fetches after mount, so wait for
        // that, capped — a single slow image proxy request shouldn't be able
        // to eat the whole test's budget across six pages.
        await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
        expect(await overflowingElements(page), `overflow on ${path}`).toEqual([]);
    }
});

test("the navbar keeps its contents inside the bar", async ({ page }) => {
    const groupId = await signIn(page);
    await page.goto(`/g/${groupId}`);

    // The identity block is client-rendered off `useSession()`, so wait for
    // the piece the rest of this test measures rather than for the network
    // to fall quiet, which a slow poster fetch elsewhere on the page can
    // delay for reasons that have nothing to do with the bar.
    await expect(page.locator("nav").getByRole("combobox")).toBeVisible();

    // Christian is an admin in two clubs, which is the densest the bar ever
    // gets. Stacked, that identity block was 122px tall inside a 70px bar, so
    // the club selector sat above the top of the screen.
    const report = await page.evaluate(() => {
        const nav = document.querySelector("nav")!;
        const bar = nav.getBoundingClientRect();
        const row = nav.querySelector<HTMLElement>(".container")!;
        const spills: string[] = [];

        for (const el of nav.querySelectorAll("*")) {
            const box = el.getBoundingClientRect();
            if (box.width === 0 && box.height === 0) continue;
            if (box.top < bar.top - 1 || box.bottom > bar.bottom + 1) {
                spills.push(
                    `<${el.tagName.toLowerCase()} class="${el.className}"> ` +
                    `top=${Math.round(box.top)} bottom=${Math.round(box.bottom)} ` +
                    `(bar ${Math.round(bar.top)}–${Math.round(bar.bottom)}): ` +
                    `${(el.textContent ?? "").trim().slice(0, 30)}`
                );
            }
        }

        // `.container` caps the row well below the viewport, so a row that is
        // too wide crowds and wraps inside the bar without ever reaching the
        // edge of the screen for the viewport check above to notice.
        return { spills, crowdedBy: row.scrollWidth - row.clientWidth };
    });

    expect(report.spills).toEqual([]);
    expect(report.crowdedBy).toBeLessThanOrEqual(0);
});

test("the concluded hero keeps the winning title inside the card", async ({ page }) => {
    const groupId = await signIn(page);
    await page.goto(`/g/${groupId}`);

    // The hero is server-rendered, so nothing here needs the network to go
    // quiet; waiting for the heading is both necessary and sufficient.
    const hero = page.locator(".glass-card").first();
    await expect(hero.getByRole("heading", { level: 1 })).toBeVisible();

    // The title has to stay inside the card's padding box, not just inside its
    // border: at 3rem it used to spill into the padding and read as cut off.
    const fit = await hero.evaluate(card => {
        const title = card.querySelector("h1")!.getBoundingClientRect();
        const box = card.getBoundingClientRect();
        const style = getComputedStyle(card);
        const inset = (side: "Left" | "Right") =>
            parseFloat(style[`padding${side}` as "paddingLeft"]) +
            parseFloat(style[`border${side}Width` as "borderLeftWidth"]);

        return {
            titleLeft: title.left,
            titleRight: title.right,
            contentLeft: box.left + inset("Left"),
            contentRight: box.right - inset("Right"),
        };
    });

    expect(fit.titleRight).toBeLessThanOrEqual(fit.contentRight + 1);
    expect(fit.titleLeft).toBeGreaterThanOrEqual(fit.contentLeft - 1);
});
