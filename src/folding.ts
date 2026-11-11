export interface PhpFoldingRange {
	startLine: number;
	endLine: number;
}

type ScannerState = 'code' | 'singleQuote' | 'doubleQuote' | 'lineComment' | 'blockComment';

const CONTROL_KEYWORDS = new Set(['if', 'for', 'foreach', 'while']);
const NON_CALL_KEYWORDS = new Set([
	'array', 'clone', 'echo', 'empty', 'eval', 'exit', 'include', 'include_once', 'isset', 'list',
	'match', 'print', 'require', 'require_once', 'return', 'throw', 'unset', 'yield',
]);

export function findPhpFoldingRanges(source: string): PhpFoldingRange[] {
	const ranges: PhpFoldingRange[] = [];
	let state: ScannerState = 'code';
	let line = 0;

	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		const nextCharacter = source[index + 1];
		if (character === '\n') {
			line++;
			if (state === 'lineComment') { state = 'code'; }
			continue;
		}
		if (state === 'lineComment') { continue; }
		if (state === 'blockComment') {
			if (character === '*' && nextCharacter === '/') { state = 'code'; index++; }
			continue;
		}
		if (state === 'singleQuote' || state === 'doubleQuote') {
			const quote = state === 'singleQuote' ? "'" : '"';
			if (character === '\\') { index++; }
			else if (character === quote) { state = 'code'; }
			continue;
		}
		if (character === '/' && nextCharacter === '/') { state = 'lineComment'; index++; continue; }
		if (character === '#') { state = 'lineComment'; continue; }
		if (character === '/' && nextCharacter === '*') { state = 'blockComment'; index++; continue; }
		if (character === "'") { state = 'singleQuote'; continue; }
		if (character === '"') { state = 'doubleQuote'; continue; }
		if (character !== '(' || !isFoldableParenthesis(source, index)) { continue; }

		const closing = findClosingParenthesis(source, index);
		if (closing === undefined) { continue; }
		// VS Code folds whole lines, so the range must stop before the line holding
		// the closing parenthesis to keep it (and anything else on that line) visible.
		const endLine = lineAt(source, closing) - 1;
		if (endLine > line) { ranges.push({ startLine: line, endLine }); }
	}

	return ranges;
}

function isFoldableParenthesis(source: string, openingIndex: number): boolean {
	const precedingWord = findPrecedingWord(source, openingIndex);
	if (precedingWord === undefined) { return false; }

	const normalizedWord = precedingWord.toLowerCase();
	return CONTROL_KEYWORDS.has(normalizedWord) ||
		normalizedWord === 'function' ||
		!NON_CALL_KEYWORDS.has(normalizedWord);
}

function findPrecedingWord(source: string, index: number): string | undefined {
	let end = index;
	while (/\s/.test(source[end - 1] ?? '')) { end--; }

	let start = end;
	while (/[\w\\]/.test(source[start - 1] ?? '')) { start--; }
	return start === end ? undefined : source.slice(start, end);
}

function findClosingParenthesis(source: string, openingIndex: number): number | undefined {
	let depth = 0;
	let state: ScannerState = 'code';
	for (let index = openingIndex; index < source.length; index++) {
		const character = source[index];
		const nextCharacter = source[index + 1];
		if (state === 'lineComment') { if (character === '\n') { state = 'code'; } continue; }
		if (state === 'blockComment') {
			if (character === '*' && nextCharacter === '/') { state = 'code'; index++; }
			continue;
		}
		if (state === 'singleQuote' || state === 'doubleQuote') {
			const quote = state === 'singleQuote' ? "'" : '"';
			if (character === '\\') { index++; }
			else if (character === quote) { state = 'code'; }
			continue;
		}
		if (character === '/' && nextCharacter === '/') { state = 'lineComment'; index++; }
		else if (character === '#') { state = 'lineComment'; }
		else if (character === '/' && nextCharacter === '*') { state = 'blockComment'; index++; }
		else if (character === "'") { state = 'singleQuote'; }
		else if (character === '"') { state = 'doubleQuote'; }
		else if (character === '(') { depth++; }
		else if (character === ')' && --depth === 0) { return index; }
	}
	return undefined;
}

function lineAt(source: string, index: number): number {
	let line = 0;
	for (let current = 0; current < index; current++) {
		if (source[current] === '\n') { line++; }
	}
	return line;
}
