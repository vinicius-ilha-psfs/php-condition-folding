// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { findConditionFoldingRanges } from './folding';
export function activate(context: vscode.ExtensionContext): void {
	context.subscriptions.push(vscode.languages.registerFoldingRangeProvider({ language: 'php' }, {
		provideFoldingRanges(document: vscode.TextDocument): vscode.FoldingRange[] {
			return findConditionFoldingRanges(document.getText()).map(
				range => new vscode.FoldingRange(range.startLine, range.endLine, vscode.FoldingRangeKind.Region),
			);
		},
	}));
}

// This method is called when your extension is deactivated
export function deactivate(): void {}
