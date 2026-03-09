import { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import Editor, { DiffEditor } from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';

export interface VultEditorHandle {
  /** Insert text at the current cursor position. */
  insertAtCursor: (text: string) => void;
}

interface VultEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  markers?: any[];
  onStateUpdate: (callback: (state: Record<string, any>) => void) => () => void;
  diffMode?: boolean;
  originalCode?: string;
  /** Called when user triggers "Ask DSP Agent" with a pre-built prompt string. */
  onAskLLM?: (prompt: string) => void;
  /** Called when user triggers "Insert Module" to open the community panel. */
  onOpenModules?: () => void;
}

interface HoverData {
  word: string;
  x: number;
  y: number;
  value: any;
}

// Monaco context menu group IDs — 1_modification puts our items near Cut/Copy/Paste
const CTX_GROUP = '1_modification';

const VultEditor = forwardRef<VultEditorHandle, VultEditorProps>(({
  code, onChange, markers = [], onStateUpdate,
  diffMode = false, originalCode = "",
  onAskLLM, onOpenModules,
}, ref) => {
  const lastCodeRef    = useRef(code);
  const monacoRef      = useRef<Monaco | null>(null);
  const editorRef      = useRef<any>(null);
  const onAskLLMRef    = useRef(onAskLLM);
  const onOpenModRef   = useRef(onOpenModules);
  const [history, setHistory]     = useState<Record<string, number[]>>({});
  const [hoverData, setHoverData] = useState<HoverData | null>(null);
  const currentStateRef = useRef<Record<string, any>>({});

  // Keep callback refs fresh without re-registering actions
  useEffect(() => { onAskLLMRef.current  = onAskLLM; },    [onAskLLM]);
  useEffect(() => { onOpenModRef.current = onOpenModules; }, [onOpenModules]);

  useImperativeHandle(ref, () => ({
    insertAtCursor(text: string) {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (!editor || !monaco) return;

      const model    = editor.getModel();
      if (!model) return;

      const position = editor.getPosition();
      const col  = position?.column      ?? 1;
      const line = position?.lineNumber  ?? 1;

      const lineContent        = model.getLineContent(line);
      const needsLeadingNewline = lineContent.trim().length > 0;
      const insertText         = (needsLeadingNewline ? '\n\n' : '') + text;

      editor.executeEdits('insert-module', [{
        range: new monaco.Range(line, col, line, col),
        text: insertText,
        forceMoveMarkers: true,
      }]);

      const lineCount = editor.getModel().getLineCount();
      editor.setPosition({ lineNumber: lineCount, column: 1 });
      editor.revealPositionInCenter({ lineNumber: lineCount, column: 1 });
      editor.focus();
    },
  }));

  useEffect(() => {
    const unsubscribe = onStateUpdate((state) => {
      currentStateRef.current = state;

      setHistory(prev => {
        const next = { ...prev };
        for (const key in state) {
          if (typeof state[key] === 'number') {
            if (!next[key]) next[key] = [];
            next[key] = [...next[key].slice(-39), state[key]];
          }
        }
        return next;
      });

      setHoverData(current => {
        if (!current) return null;
        const newValue = state[current.word];
        if (newValue === undefined) return null;
        return { ...current, value: newValue };
      });
    });
    return unsubscribe;
  }, [onStateUpdate]);

  useEffect(() => {
    if (monacoRef.current && editorRef.current && !diffMode) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'vult', markers);
    }
  }, [markers, diffMode]);

  const setupMonaco = (monaco: Monaco) => {
    if (monaco.languages.getLanguages().some((l: any) => l.id === 'vult')) return;

    monaco.languages.register({ id: 'vult' });
    monaco.languages.setMonarchTokensProvider('vult', {
      tokenizer: {
        root: [
          [/\/\/.*$/,                                      'comment'],
          [/\b(fun|mem|val|if|else|then|return|true|false|real|int|bool|and|not|or)\b/, 'keyword'],
          [/\b\d+(\.\d+)?\b/,                             'number'],
          [/[{}()[\],;]/,                                  'delimiter'],
          [/[+\-*/%=<>!&|]/,                               'operator'],
          [/[a-zA-Z_]\w*/,                                 'variable'],
        ],
      },
    });
  };

  // Helper: get selected text, or the whole current function, or whole file
  const getContextText = (editor: any): { text: string; kind: 'selection' | 'function' | 'file' } => {
    const model     = editor.getModel();
    const selection = editor.getSelection();

    // If there is a real selection (more than a cursor), use it
    if (selection && !selection.isEmpty()) {
      return { text: model.getValueInRange(selection), kind: 'selection' };
    }

    // Otherwise try to find the enclosing `fun ... { ... }` block
    const fullCode  = model.getValue() as string;
    const position  = editor.getPosition();
    const offset    = model.getOffsetAt(position);

    // Walk backwards to the nearest `fun ` keyword
    const before = fullCode.slice(0, offset);
    const funIdx = before.lastIndexOf('\nfun ');
    if (funIdx !== -1) {
      // Walk forward to find the matching closing brace
      let depth  = 0;
      let end    = funIdx;
      let found  = false;
      for (let i = funIdx; i < fullCode.length; i++) {
        if (fullCode[i] === '{') depth++;
        if (fullCode[i] === '}') {
          depth--;
          if (depth === 0) { end = i + 1; found = true; break; }
        }
      }
      if (found) {
        return { text: fullCode.slice(funIdx + 1, end).trim(), kind: 'function' };
      }
    }

    return { text: fullCode, kind: 'file' };
  };

  const registerActions = (editor: any, monaco: Monaco) => {
    // ── Ask DSP Agent ────────────────────────────────────────────────────────
    editor.addAction({
      id:    'dsplab.ask-agent',
      label: 'Ask DSP Agent',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyA,
      ],
      contextMenuGroupId: CTX_GROUP,
      contextMenuOrder:   1.5,
      run(ed: any) {
        const { text, kind } = getContextText(ed);
        const prefix =
          kind === 'selection' ? 'Regarding this selected Vult code:\n\n```\n' + text + '\n```\n\n'
          : kind === 'function' ? 'Regarding this function:\n\n```\n' + text + '\n```\n\n'
          : '';
        // Open a prompt by showing a floating input overlay via the callback
        onAskLLMRef.current?.(prefix + '');
        // Signal App.tsx to switch to the LLM pane and focus the input
        // We dispatch a custom DOM event so App can react without prop drilling
        window.dispatchEvent(new CustomEvent('dsplab:ask-agent', {
          detail: { prompt: prefix, autoSend: false }
        }));
      },
    });

    // ── Explain Selection ────────────────────────────────────────────────────
    editor.addAction({
      id:    'dsplab.explain',
      label: 'Explain with DSP Agent',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyE,
      ],
      contextMenuGroupId: CTX_GROUP,
      contextMenuOrder:   1.6,
      run(ed: any) {
        const { text, kind } = getContextText(ed);
        const scope =
          kind === 'selection' ? 'selected code' :
          kind === 'function'  ? 'function'       : 'program';
        const prompt =
          `Explain what the following Vult DSP ${scope} does — describe the signal processing, the algorithm, and any notable design choices:\n\n\`\`\`\n${text}\n\`\`\``;
        window.dispatchEvent(new CustomEvent('dsplab:ask-agent', {
          detail: { prompt, autoSend: true }
        }));
      },
    });

    // ── Insert Module from Community ─────────────────────────────────────────
    editor.addAction({
      id:    'dsplab.insert-module',
      label: 'Insert Community Module',
      keybindings: [
        monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM,
      ],
      contextMenuGroupId: CTX_GROUP,
      contextMenuOrder:   1.7,
      run() {
        onOpenModRef.current?.();
      },
    });
  };

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;
    setupMonaco(monaco);
    registerActions(editor, monaco);

    editor.onMouseMove((e: any) => {
      if (diffMode) return;
      if (e.target && e.target.range) {
        const word = editor.getModel().getWordAtPosition(e.target.range.getStartPosition());
        if (word) {
          const state = currentStateRef.current;
          if (state[word.word] !== undefined) {
            setHoverData({
              word: word.word,
              x: e.event.posx + 15,
              y: e.event.posy + 15,
              value: state[word.word],
            });
            return;
          }
        }
      }
      setHoverData(null);
    });

    editor.onMouseLeave(() => setHoverData(null));
  };

  const handleDiffMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    setupMonaco(monaco);
    setTimeout(() => { if (editor.revealFirstDiff) editor.revealFirstDiff(); }, 100);
  };

  const handleOnChange = (value: string | undefined) => {
    if (value !== lastCodeRef.current) {
      lastCodeRef.current = value || '';
      onChange(value);
    }
  };

  const renderSparkline = (word: string) => {
    const data = history[word];
    if (!data || data.length < 2) return null;
    const min  = Math.min(...data);
    const max  = Math.max(...data);
    const range = (max - min) || 1;
    const pts  = data.map((v, i) => `${i * 3},${30 - ((v - min) / range) * 30}`).join(' ');
    return (
      <svg width="120" height="35" style={{ marginTop: '8px', borderTop: '1px solid #444', paddingTop: '4px' }}>
        <polyline points={pts} fill="none" stroke="#ffcc00" strokeWidth="1.5" />
      </svg>
    );
  };

  return (
    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
      {diffMode ? (
        <DiffEditor
          height="100%"
          original={originalCode}
          modified={code}
          language="vult"
          theme="vs-dark"
          onMount={handleDiffMount}
          options={{
            renderSideBySide: true,
            readOnly: true,
            fontSize: 14,
            automaticLayout: true,
            fontFamily: "'Fira Code', monospace",
          }}
        />
      ) : (
        <Editor
          height="100%"
          defaultLanguage="vult"
          value={code}
          theme="vs-dark"
          onChange={handleOnChange}
          onMount={handleEditorDidMount}
          options={{
            minimap:              { enabled: false },
            fontSize:             14,
            automaticLayout:      true,
            fontFamily:           "'Fira Code', monospace",
            lineNumbers:          'on',
            scrollBeyondLastLine: false,
            glyphMargin:          true,
            hover:                { enabled: false },
          }}
        />
      )}

      {hoverData && !diffMode && (
        <div style={{
          position: 'fixed', left: hoverData.x, top: hoverData.y,
          background: '#252526', border: '1px solid #454545', borderRadius: '4px',
          padding: '8px 12px', zIndex: 10000, boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          pointerEvents: 'none', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ fontSize: '10px', color: '#888', fontWeight: 'bold', marginBottom: '2px' }}>
            LIVE STATE: {hoverData.word}
          </div>
          <div style={{ fontSize: '14px', color: '#ffcc00', fontFamily: 'monospace' }}>
            {typeof hoverData.value === 'number'
              ? hoverData.value.toFixed(6)
              : String(hoverData.value)}
          </div>
          {typeof hoverData.value === 'number' && renderSparkline(hoverData.word)}
        </div>
      )}
    </div>
  );
});

VultEditor.displayName = 'VultEditor';
export default VultEditor;
