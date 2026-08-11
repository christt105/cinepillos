import { describe, it, expect } from "vitest";
import en from "./en.json";
import es from "./es.json";

type Messages = Record<string, Record<string, string>>;

const keysOf = (messages: Messages) =>
    Object.entries(messages)
        .flatMap(([namespace, entries]) => Object.keys(entries).map(key => `${namespace}.${key}`))
        .sort();

describe("message catalogs", () => {
    it("translate exactly the same keys", () => {
        expect(keysOf(en as Messages)).toEqual(keysOf(es as Messages));
    });

    it("leave no message empty", () => {
        for (const [locale, messages] of Object.entries({ en, es })) {
            for (const [namespace, entries] of Object.entries(messages as Messages)) {
                for (const [key, value] of Object.entries(entries)) {
                    expect(value.trim(), `${locale}: ${namespace}.${key}`).not.toBe("");
                }
            }
        }
    });
});
