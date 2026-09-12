import { SNOW_CLASSES, SNOW_GLOBALS, SNOW_NAMESPACES, SNOW_SNIPPETS, SNOW_TABLES } from '/lib/snow-api.js';

const MONACO_VS = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs';

function snippet(insertText) {
  return insertText.replace(/\\\$/g, '$');
}

function itemKind(monaco, kind) {
  const map = {
    class: monaco.languages.CompletionItemKind.Class,
    function: monaco.languages.CompletionItemKind.Function,
    method: monaco.languages.CompletionItemKind.Method,
    variable: monaco.languages.CompletionItemKind.Variable,
    snippet: monaco.languages.CompletionItemKind.Snippet,
    module: monaco.languages.CompletionItemKind.Module,
    property: monaco.languages.CompletionItemKind.Property,
    keyword: monaco.languages.CompletionItemKind.Keyword,
  };
  return map[kind] || monaco.languages.CompletionItemKind.Function;
}

function registerSnowCompletions(monaco) {
  monaco.languages.registerCompletionItemProvider('javascript', {
    triggerCharacters: ['.', "'", '"', '_', ... 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')],
    provideCompletionItems(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const member = line.match(/([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)?$/);
      const suggestions = [];

      if (member) {
        const objectName = member[1];
        const prefix = member[2] || '';
        const ns = SNOW_NAMESPACES[objectName];
        const cls = SNOW_CLASSES[objectName];
        const methods = (ns && ns.methods) || (cls && cls.methods) || [];
        methods
          .filter((method) => method.name.toLowerCase().startsWith(prefix.toLowerCase()))
          .forEach((method) => {
            suggestions.push({
              label: method.name,
              kind: itemKind(monaco, 'method'),
              detail: method.signature,
              documentation: method.documentation,
              insertText: method.insertText,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              sortText: `0_${method.name}`,
            });
          });
        if (suggestions.length) {
          return { suggestions };
        }
      }

      Object.keys(SNOW_CLASSES).forEach((name) => {
        const cls = SNOW_CLASSES[name];
        suggestions.push({
          label: name,
          kind: itemKind(monaco, 'class'),
          detail: cls.detail,
          documentation: cls.documentation,
          insertText: cls.construct || name,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: `1_${name}`,
        });
      });

      SNOW_GLOBALS.forEach((globalItem) => {
        suggestions.push({
          label: globalItem.name,
          kind: itemKind(monaco, globalItem.kind || 'variable'),
          detail: globalItem.detail,
          documentation: globalItem.documentation,
          insertText: globalItem.name,
          sortText: `2_${globalItem.name}`,
        });
      });

      SNOW_TABLES.forEach((table) => {
        suggestions.push({
          label: table,
          kind: monaco.languages.CompletionItemKind.Value,
          detail: 'ServiceNow table',
          insertText: table,
          sortText: `8_${table}`,
        });
      });

      SNOW_SNIPPETS.forEach((snip) => {
        suggestions.push({
          label: snip.label,
          kind: itemKind(monaco, 'snippet'),
          documentation: snip.documentation,
          insertText: snippet(snip.insertText),
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          sortText: `3_${snip.label}`,
        });
      });

      return { suggestions, incomplete: false };
    },
  });

  monaco.languages.registerSignatureHelpProvider('javascript', {
    signatureHelpTriggerCharacters: ['('],
    provideSignatureHelp(model, position) {
      const line = model.getLineContent(position.lineNumber).slice(0, position.column - 1);
      const match = line.match(/([A-Za-z_$][\w$]*)\s*\.\s*([A-Za-z_$][\w$]*)\s*\(\s*[^)]*$/);
      if (!match) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose() {} };
      }
      const methods = (SNOW_NAMESPACES[match[1]] || SNOW_CLASSES[match[1]] || {}).methods || [];
      const method = methods.find((item) => item.name === match[2]);
      if (!method) {
        return { value: { signatures: [], activeSignature: 0, activeParameter: 0 }, dispose() {} };
      }
      return {
        value: {
          signatures: [
            {
              label: method.signature,
              documentation: method.documentation,
              parameters: [],
            },
          ],
          activeSignature: 0,
          activeParameter: 0,
        },
        dispose() {},
      };
    },
  });
}

export function createEditor(container, value, onChange) {
  return new Promise((resolve, reject) => {
    if (window.require && window.monaco) {
      resolve(mount(window.monaco, container, value, onChange));
      return;
    }
    const loader = document.createElement('script');
    loader.src = `${MONACO_VS}/loader.js`;
    loader.onload = () => {
      window.require.config({ paths: { vs: MONACO_VS } });
      window.require(['vs/editor/editor.main'], () => {
        try {
          registerSnowCompletions(window.monaco);
          resolve(mount(window.monaco, container, value, onChange));
        } catch (error) {
          reject(error);
        }
      });
    };
    loader.onerror = () => reject(new Error('Failed to load Monaco editor'));
    document.head.appendChild(loader);
  });
}

function mount(monaco, container, value, onChange) {
  monaco.editor.defineTheme('now-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#0d1f1c',
      'editor.foreground': '#e7f2ee',
      'editorCursor.foreground': '#62d84e',
      'editor.lineHighlightBackground': '#16332e',
      'editorLineNumber.foreground': '#6d8f86',
      'editor.selectionBackground': '#1f6b4a88',
    },
  });

  const editor = monaco.editor.create(container, {
    value,
    language: 'javascript',
    theme: 'now-dark',
    automaticLayout: true,
    minimap: { enabled: false },
    fontSize: 14,
    fontFamily: 'IBM Plex Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
    tabSize: 2,
    insertSpaces: true,
    wordWrap: 'on',
    quickSuggestions: { other: true, comments: false, strings: true },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    snippetSuggestions: 'inline',
    parameterHints: { enabled: true },
    suggest: { showKeywords: true, preview: true, filterGraceful: true },
    padding: { top: 12 },
    scrollBeyondLastLine: false,
  });

  editor.onDidChangeModelContent(() => onChange(editor.getValue()));
  editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    document.getElementById('grade-btn')?.click();
  });
  return editor;
}
