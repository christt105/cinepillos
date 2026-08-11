import { test, expect, type Page } from "@playwright/test";
import { signIn as authenticate } from "./auth";

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

async function signIn(page: Page) {
    await authenticate(page);
    await page.goto("/");
    await page.waitForURL(url => !url.pathname.startsWith("/login"));

    const groupId = new URL(page.url()).pathname.split("/")[2];
    expect(groupId).toBeTruthy();
    return groupId;
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
        await page.waitForLoadState("networkidle");
        expect(await overflowingElements(page), `overflow on ${path}`).toEqual([]);
    }
});

test("the concluded hero keeps the winning title inside the card", async ({ page }) => {
    const groupId = await signIn(page);
    await page.goto(`/g/${groupId}`);
    await page.waitForLoadState("networkidle");

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
