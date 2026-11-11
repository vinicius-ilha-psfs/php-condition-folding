import * as assert from 'assert';
import { findPhpFoldingRanges } from '../folding';

suite('PHP folding', () => {
	test('finds a multiline condition with nested parentheses', () => {
		const source = `if (\n  a > b\n  || (count($e) > 0 && $d == $e[0])\n) {\n}`;
		assert.deepStrictEqual(findPhpFoldingRanges(source), [{ startLine: 0, endLine: 2 }]);
	});
	test('ignores parentheses inside strings and comments', () => {
		const source = `if (\n  $value === ')', // )\n  && $text === "("\n) {\n}`;
		assert.deepStrictEqual(findPhpFoldingRanges(source), [{ startLine: 0, endLine: 2 }]);
	});
	test('folds multiline function declaration and call arguments', () => {
		const source = `function format(\n  string $value,\n  bool $uppercase,\n): string {}\n\n$result = Namespace\\format(\n  $value,\n  true,\n);\n\n$logger->write(\n  $result,\n);`;
		assert.deepStrictEqual(findPhpFoldingRanges(source), [
			{ startLine: 0, endLine: 2 }, { startLine: 5, endLine: 7 }, { startLine: 10, endLine: 11 },
		]);
	});
	test('folds multiline for, foreach, and while expressions', () => {
		const source = `for (\n  $index = 0;\n  $index < $limit;\n  $index++\n) {}\n\nforeach (\n  $items as $key => $value\n) {}\n\nwhile (\n  $iterator->valid()\n) {}`;
		assert.deepStrictEqual(findPhpFoldingRanges(source), [
			{ startLine: 0, endLine: 3 }, { startLine: 6, endLine: 7 }, { startLine: 10, endLine: 11 },
		]);
	});
	test('does not create ranges for one-line, incomplete, or language construct parentheses', () => {
		const source = `if ($a) {}\nif (\n  $b\n\nreturn (\n  $value\n);\nisset(\n  $value\n);`;
		assert.deepStrictEqual(findPhpFoldingRanges(source), []);
	});
	test('finds multiple independent if statements', () => {
		assert.deepStrictEqual(findPhpFoldingRanges(`if (\n  $a\n) {}\nif (\n  $b\n) {}`), [
			{ startLine: 0, endLine: 1 }, { startLine: 3, endLine: 4 },
		]);
	});
	test('keeps the closing parenthesis line with trailing code visible', () => {
		assert.deepStrictEqual(findPhpFoldingRanges(`if (\n  $a\n  && $b\n) { doSomething(); }`), [
			{ startLine: 0, endLine: 2 },
		]);
		assert.deepStrictEqual(findPhpFoldingRanges(`$result = call(\n  $a,\n  $b);\n$next = 1;`), [
			{ startLine: 0, endLine: 1 },
		]);
	});
	test('keeps a closing parenthesis alone on its line visible', () => {
		assert.deepStrictEqual(findPhpFoldingRanges(`if (\n  $a\n  && $b\n)\n{\n}`), [
			{ startLine: 0, endLine: 2 },
		]);
	});
	test('never hides the line holding the closing parenthesis', () => {
		const sources = [
			`if (\n  $a\n) {}`,
			`if (\n  $a\n)`,
			`if (\n  $a\n  && $b\n  || $c\n) { doSomething(); } // done`,
			`for (\n  $index = 0;\n  $index < $limit;\n  $index++\n) {}`,
			`function format(\n  string $value,\n): string {}`,
			`$value = strtoupper(\n  trim($input),\n);`,
		];
		for (const source of sources) {
			const lines = source.split('\n');
			for (const range of findPhpFoldingRanges(source)) {
				const followingLine = lines[range.endLine + 1] ?? '';
				assert.ok(followingLine.includes(')'),
					`range ${JSON.stringify(range)} stops before "${followingLine}", which holds no closing parenthesis`);
			}
		}
	});
});
