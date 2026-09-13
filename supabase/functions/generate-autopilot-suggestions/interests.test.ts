import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseStatedInterests, withStatedInterestsFirst } from "./interests.ts";

Deno.test("splits the InterestsCard string and strips emoji", () => {
  assertEquals(parseStatedInterests("🚚 Trucks, 🦖 Dinosaurs, tractors"), ["Trucks", "Dinosaurs", "tractors"]);
});

Deno.test("keeps digits and Chinese, strips variation selectors", () => {
  assertEquals(parseStatedInterests("🌧️ Rain, 3 little pigs, 火车"), ["Rain", "3 little pigs", "火车"]);
});

Deno.test("drops blanks and case-insensitive duplicates, caps at five", () => {
  assertEquals(parseStatedInterests(" , 🚂 Trains, trains,,Bluey"), ["Trains", "Bluey"]);
  assertEquals(parseStatedInterests("a, b, c, d, e, f, g").length, 5);
});

Deno.test("empty or emoji-only input gives no interests", () => {
  assertEquals(parseStatedInterests(null), []);
  assertEquals(parseStatedInterests(""), []);
  assertEquals(parseStatedInterests("🚂"), []);
});

Deno.test("stated interests rank ahead of observed categories", () => {
  const observed = [{ label: "vehicles (12 spoken words)", source: "spoken_words" }];
  assertEquals(withStatedInterestsFirst(["Trains"], observed), [
    { label: "Trains (the parent told us)", source: "profile_interests" },
    observed[0],
  ]);
  assertEquals(withStatedInterestsFirst([], observed), observed);
});
