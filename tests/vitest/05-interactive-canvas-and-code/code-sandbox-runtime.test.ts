import { describe, it, expect } from 'vitest';
import { SupportedCodeLanguage, CodeStageFile } from '@mivo/shared';

export interface SandboxExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export function formatExecutionTime(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  return `${(durationMs / 1000).toFixed(2)}s`;
}

export function getFileExtensionForLanguage(lang: SupportedCodeLanguage): string {
  switch (lang) {
    case 'typescript':
      return '.ts';
    case 'javascript':
      return '.js';
    case 'python':
      return '.py';
    case 'rust':
      return '.rs';
    case 'go':
      return '.go';
    case 'json':
      return '.json';
    default:
      return '.txt';
  }
}

export function buildAiPairPrompt(
  mode: 'EXPLAIN' | 'OPTIMIZE' | 'GEN_TESTS' | 'FIND_BUGS',
  code: string,
  language: string
): string {
  switch (mode) {
    case 'EXPLAIN':
      return `Explain how this ${language} code works step-by-step for a senior engineer:\n\`\`\`${language}\n${code}\n\`\`\``;
    case 'OPTIMIZE':
      return `Analyze time and space complexity of this ${language} code and suggest optimizations:\n\`\`\`${language}\n${code}\n\`\`\``;
    case 'GEN_TESTS':
      return `Generate complete Vitest/Jest unit tests covering edge cases for this ${language} snippet:\n\`\`\`${language}\n${code}\n\`\`\``;
    case 'FIND_BUGS':
      return `Audit this ${language} code for security vulnerabilities, race conditions, and edge-case bugs:\n\`\`\`${language}\n${code}\n\`\`\``;
  }
}

export function updateFileContent(
  files: CodeStageFile[],
  fileId: string,
  newContent: string
): CodeStageFile[] {
  return files.map((f) => (f.id === fileId ? { ...f, content: newContent } : f));
}

describe('Code Sandbox Runtime and Pair-Programming Engine', () => {
  const initialFiles: CodeStageFile[] = [
    {
      id: 'f1',
      name: 'index.ts',
      language: 'typescript',
      content: 'console.log("Hello Mivo Sandbox");',
    },
    {
      id: 'f2',
      name: 'solution.py',
      language: 'python',
      content: 'print("Hello from Python 3")',
    },
  ];

  it('maps programming languages to appropriate file extensions', () => {
    expect(getFileExtensionForLanguage('typescript')).toBe('.ts');
    expect(getFileExtensionForLanguage('javascript')).toBe('.js');
    expect(getFileExtensionForLanguage('python')).toBe('.py');
    expect(getFileExtensionForLanguage('rust')).toBe('.rs');
    expect(getFileExtensionForLanguage('go')).toBe('.go');
    expect(getFileExtensionForLanguage('json')).toBe('.json');
  });

  it('formats execution runtimes cleanly in milliseconds or seconds', () => {
    expect(formatExecutionTime(42)).toBe('42ms');
    expect(formatExecutionTime(999)).toBe('999ms');
    expect(formatExecutionTime(1250)).toBe('1.25s');
    expect(formatExecutionTime(3000)).toBe('3.00s');
  });

  it('generates structured prompts for AI pair programming assistant modes', () => {
    const code = 'const add = (a: number, b: number) => a + b;';
    const testPrompt = buildAiPairPrompt('GEN_TESTS', code, 'typescript');
    expect(testPrompt).toContain('Generate complete Vitest/Jest unit tests');
    expect(testPrompt).toContain(code);

    const bugPrompt = buildAiPairPrompt('FIND_BUGS', code, 'typescript');
    expect(bugPrompt).toContain('Audit this typescript code for security vulnerabilities');
  });

  it('updates target file content immutably preserving other workspace files', () => {
    const updated = updateFileContent(initialFiles, 'f1', 'console.log("Updated!");');
    expect(updated[0].content).toBe('console.log("Updated!");');
    expect(updated[1].content).toBe('print("Hello from Python 3")');
    expect(initialFiles[0].content).toBe('console.log("Hello Mivo Sandbox");'); // original intact
  });
});
