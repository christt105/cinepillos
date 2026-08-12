import { describe, it, expect } from "vitest";
import { filmLikeCount, sortByLikes } from "./proposals";

const film = (id: string, ...likes: number[]) => ({
    id,
    proposals: likes.map(count => ({ _count: { likes: count } })),
});

describe("filmLikeCount", () => {
    it("adds up the likes of every proposal of the film", () => {
        expect(filmLikeCount(film("a", 2, 3))).toBe(5);
    });

    it("is zero for a film nobody liked", () => {
        expect(filmLikeCount(film("a", 0))).toBe(0);
    });
});

describe("sortByLikes", () => {
    it("puts the most liked film first", () => {
        const sorted = sortByLikes([film("a", 1), film("b", 4), film("c", 2)]);

        expect(sorted.map(f => f.id)).toEqual(["b", "c", "a"]);
    });

    it("keeps the incoming order between films with the same likes", () => {
        const sorted = sortByLikes([film("newest", 1), film("older", 1)]);

        expect(sorted.map(f => f.id)).toEqual(["newest", "older"]);
    });

    it("leaves the input array untouched", () => {
        const films = [film("a", 1), film("b", 4)];

        sortByLikes(films);

        expect(films.map(f => f.id)).toEqual(["a", "b"]);
    });
});
