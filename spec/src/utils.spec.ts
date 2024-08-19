import "jasmine";
import { applyRangeTransformers, combineClasses, manageNestLevel, MergeClassConstructors, MixClasses } from "../../build/utils.js";
import { token } from "./spec_utils.js";

describe("manageNestLevel", () => {
	const pOpen = token("parentheses.open", "(");
	const pClose = token("parentheses.close", ")");
	const bOpen = token("bracket.open", "[");
	const bClose = token("bracket.close", "]");
	it("should manage the nest level correctly for parens", () => {
		const nestLevel = manageNestLevel();
		nestLevel.update(pOpen);
		nestLevel.update(bOpen);
		expect(nestLevel.out()).toEqual(false);
		expect(nestLevel.in()).toEqual(true);
		nestLevel.update(bClose);
		expect(nestLevel.out()).toEqual(false);
		expect(nestLevel.in()).toEqual(true);
		nestLevel.update(pClose);
		expect(nestLevel.out()).toEqual(true);
		expect(nestLevel.in()).toEqual(false);
		nestLevel.update(bOpen);
		expect(nestLevel.out()).toEqual(false);
		expect(nestLevel.in()).toEqual(true);
		nestLevel.update(bClose);
		expect(nestLevel.out()).toEqual(true);
		expect(nestLevel.in()).toEqual(false);
	});
	it("should not allow the nest level to become negative", () => {
		expect(() => {
			const nestLevel = manageNestLevel();
			nestLevel.update(pClose);
		}).toThrowError(`No parenthesis group to close`);
		expect(() => {
			const nestLevel = manageNestLevel();
			nestLevel.update(bClose);
		}).toThrowError(`No square bracket group to close`);
	});
});

describe("applyRangeTranformers", () => {
	it("should apply no range transformers", () => {
		expect(applyRangeTransformers(`0123456789`, [
		])).toEqual(`0123456789`);
	});
	it("should apply one range transformer", () => {
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 2], "<", ">"]
		])).toEqual(`0<1>23456789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 4], "<", ">"]
		])).toEqual(`0<123>456789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[0, 10], "<", ">"]
		])).toEqual(`<0123456789>`);
	});
	it("should apply one range transformer with transform function", () => {
		expect(applyRangeTransformers(`abcdefghij`, [
			[[1, 4], "<", ">", t => t.toUpperCase()]
		])).toEqual(`a<BCD>efghij`);
	});
	it("should apply two non-overlapping range transformer", () => {
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 2], "<", ">"],
			[[3, 4], "(", ")"],
		])).toEqual(`0<1>2(3)456789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 4], "<", ">"],
			[[8, 9], "(", ")"],
		])).toEqual(`0<123>4567(8)9`);
	});
	it("should apply two range transformers when one is contained in the other", () => {
		expect(applyRangeTransformers(`abcdefghij`, [
			[[1, 5], "<", ">"],
			[[2, 3], "(", ")"],
		])).toEqual(`a<b(c)de>fghij`);
		expect(applyRangeTransformers(`abcdefghij`, [
			[[2, 3], "(", ")"],
			[[1, 5], "<", ">"],
		])).toEqual(`a<b(c)de>fghij`);
		expect(applyRangeTransformers(`abcdefghij`, [
			[[1, 5], "<<<", ">!"],
			[[2, 3], "((", ")!"],
		])).toEqual(`a<<<b((c)!de>!fghij`);
	});
	it("should handle the edge cases based on the other endpoint", () => {
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 3], "<", ">"],
			[[3, 5], "(", ")"],
		])).toEqual(`0<12>(34)56789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[3, 5], "(", ")"],
			[[1, 3], "<", ">"],
		])).toEqual(`0<12>(34)56789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 3], "<", ">"],
			[[1, 5], "(", ")"],
		])).toEqual(`0(<12>34)56789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 5], "(", ")"],
			[[1, 3], "<", ">"],
		])).toEqual(`0(<12>34)56789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 3], "<", ">"],
			[[1, 2], "(", ")"],
		])).toEqual(`0<(1)2>3456789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[1, 2], "(", ")"],
			[[1, 3], "<", ">"],
		])).toEqual(`0<(1)2>3456789`);
		expect(applyRangeTransformers(`0123456789`, [
			[[3, 8], "<", ">"],
			[[1, 8], "(", ")"],
		])).toEqual(`0(12<34567>)89`);
		expect(applyRangeTransformers(`0123456789`, [
			[[3, 8], "<", ">"],
			[[5, 8], "(", ")"],
		])).toEqual(`012<34(567)>89`);
	});
});

describe("mixClasses", () => {
	it("should compile", () => {
		class Foo {
			constructor(input:{ foo: string; }){}
			foo = "foo" as const;
		}
		class Bar {
			constructor(input:{ bar: string; }, next:number){}
			bar = "bar" as const;
		}
		type __ = MergeClassConstructors<typeof Foo | typeof Bar, 5>;
		// eslint-disable-next-line @typescript-eslint/no-unsafe-call
		class FooBar extends combineClasses(Foo, Bar) {
			constructor(input:{ foo: string; bar: string; }){
				// eslint-disable-next-line @typescript-eslint/no-unsafe-call
				super(input);
			}
		}
		//TODO more tests
	});
});
