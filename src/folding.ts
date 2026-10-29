export interface ConditionFoldingRange {
	startLine: number;
	endLine: number;
}

type ScannerState = 'code' | 'singleQuote' | 'doubleQuote' | 'lineComment' | 'blockComment';

export function findConditionFoldingRanges(source: string): ConditionFoldingRange[] {
	const ranges: ConditionFoldingRange[] = [];
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
		if (!isWordAt(source, index, 'if')) { continue; }

		let openingIndex = index + 2;
		while (/\s/.test(source[openingIndex] ?? '')) { openingIndex++; }
		if (source[openingIndex] !== '(') { continue; }
		const closing = findClosingParenthesis(source, openingIndex);
		if (closing === undefined) { continue; }
		const endLine = lineAt(source, closing);
		if (endLine > line) { ranges.push({ startLine: line, endLine }); }
		index = openingIndex;
	}

	return ranges;
}

function isWordAt(source: string, index: number, word: string): boolean {
	return source.slice(index, index + word.length) === word &&
		!isWordCharacter(source[index - 1]) && !isWordCharacter(source[index + word.length]);
}

function isWordCharacter(character: string | undefined): boolean {
	return character !== undefined && /[\w\\]/.test(character);
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
	return [...source.slice(0, index)].filter(character => character === '\n').length;
}