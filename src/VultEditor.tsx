import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';

interface VultEditorProps {
  code: string;
  onChange: (value: string | undefined) => void;
  markers?: any[];
  getLiveState: () => Record<string, any>;
}

const VultEditor: React.FC<VultEditorProps> = ({ code, onChange, markers = [], getLiveState }) => {
  const lastCodeRef = useRef(code);
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<any>(null);
  const [history, setHistory] = useState<Record<string, number[]>>({});

  // History buffer for sparklines
  useEffect(() => {
    const interval = setInterval(() => {
      const state = getLiveState();
      setHistory(prev => {
        const next = { ...prev };
        for (const key in state) {
          if (typeof state[key] === 'number') {
            if (!next[key]) next[key] = [];
            next[key] = [...next[key].slice(-19), state[key]];
          }
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [getLiveState]);

  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      monacoRef.current.editor.setModelMarkers(editorRef.current.getModel(), 'vult', markers);
    }
  }, [markers]);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    monacoRef.current = monaco;
    editorRef.current = editor;

    monaco.languages.register({ id: 'vult' });
    monaco.languages.setMonarchTokensProvider('vult', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\b(fun|mem|val|if|else|return|true|false|real|int|bool|and)\b/, 'keyword'],
          [/\b\d+(\.\d+)?\b/, 'number'],
          [/[{}()[\],;]/, 'delimiter'],
          [/[+\-*/%=<>!&|]/, 'operator'],
          [/[a-zA-Z_]\w*/, 'variable'],
        ],
      },
    });

    // LIVE HOVER PROVIDER
    monaco.languages.registerHoverProvider('vult', {
      provideHover: (model: any, position: any) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const state = getLiveState();
        const value = state[word.word];
        const valHistory = history[word.word];

        if (value !== undefined) {
          const isNum = typeof value === 'number';
          const displayVal = isNum ? value.toFixed(4) : value.toString();
          
          // Simple SVG sparkline if history exists
          let sparkline = '';
          if (isNum && valHistory && valHistory.length > 1) {
            const min = Math.min(...valHistory);
            const max = Math.max(...valHistory);
            const range = (max - min) || 1;
            const pts = valHistory.map((v, i) => `${i * 5},${20 - ((v - min) / range) * 20}`).join(' ');
            sparkline = `\n\n![sparkline](data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="20"><polyline points="${pts}" fill="none" stroke="#ffcc00" stroke-width="1"/></svg>`)})`;
          }

          return {
            range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
            contents: [
              { value: `**Live Value:** ` },
              { value: `\`\`\`vult\n${displayVal}\n\`\`\` ` },
              { value: sparkline }
            ]
          };
        }
        return null;
      }
    });
  };

  const handleOnChange = (value: string | undefined) => {
    if (value !== lastCodeRef.current) {
      lastCodeRef.current = value || '';
      onChange(value);
    }
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        defaultLanguage="vult"
        value={code}
        theme="vs-dark"
        onChange={handleOnChange}
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          automaticLayout: true,
          fontFamily: "'Fira Code', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          glyphMargin: true,
          hover: { delay: 100, enabled: true }
        }}
      />
    </div>
  );
};

export default VultEditor;
