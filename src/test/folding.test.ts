import * as assert from 'assert';
import { findConditionFoldingRanges } from '../folding';

suite('PHP condition folding', () => {
	test('finds a multiline condition with nested parentheses', () => {
		const source = `if (\n  a > b\n  || (count($e) > 0 && $d == $e[0])\n) {\n}`;
		assert.deepStrictEqual(findConditionFoldingRanges(source), [{ startLine: 0, endLine: 3 }]);
	});
	test('ignores parentheses inside strings and comments', () => {
		const source = `if (\n  $value === ')', // )\n  && $text === "("\n) {\n}`;
		assert.deepStrictEqual(findConditionFoldingRanges(source), [{ startLine: 0, endLine: 3 }]);
	});
	test('does not create ranges for one-line or incomplete conditions', () => {
		assert.deepStrictEqual(findConditionFoldingRanges(`if ($a) {}\nif (\n  $b\n`), []);
	});
	test('finds multiple independent if statements', () => {
		assert.deepStrictEqual(findConditionFoldingRanges(`if (\n  $a\n) {}\nif (\n  $b\n) {}`), [
			{ startLine: 0, endLine: 2 }, { startLine: 3, endLine: 5 },
		]);
	});
});