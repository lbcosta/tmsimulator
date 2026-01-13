import React, { useState, useEffect, useCallback } from 'react';
import mermaid from 'mermaid';
import Header from './components/Header';
import TapeVisualizer from './components/TapeVisualizer';
import EditorPanel from './components/EditorPanel';
import TestPanel from './components/TestPanel';
import DiagramVisualizer from './components/DiagramVisualizer';
import PlaybackControls from './components/PlaybackControls';

import { CONFIG, DEFAULT_CODE } from './utils/constants';
import { parseMachineCode, runFastSimulation } from './utils/simulation';

function App() {
  const [editorCode, setEditorCode] = useState(DEFAULT_CODE);
  const [isDirty, setIsDirty] = useState(false);

  // Layout State
  const [isEditorOpen, setIsEditorOpen] = useState(true);
  const [isTestsOpen, setIsTestsOpen] = useState(true);

  // Simulation State
  const [tape, setTape] = useState({});
  const [head, setHead] = useState(0);
  const [currentState, setCurrentState] = useState('q0');
  const [status, setStatus] = useState('IDLE');
  const [stepCount, setStepCount] = useState(0);
  const [runtimeError, setRuntimeError] = useState(null);
  const [history, setHistory] = useState([]);

  // Control State
  const [activeInput, setActiveInput] = useState('abba');
  const [speed, setSpeed] = useState(500);
  const [transitions, setTransitions] = useState({});
  const [visualData, setVisualData] = useState({ nodes: [], edges: [] });
  const [compileError, setCompileError] = useState(null);

  // Test Suite State
  const [tests, setTests] = useState([
    { id: 1, input: 'abba', status: 'IDLE' },
    { id: 2, input: 'bab', status: 'IDLE' },
    { id: 3, input: 'aabaab', status: 'IDLE' },
    { id: 4, input: 'aabb', status: 'IDLE' }
  ]);
  const [isRunningBatch, setIsRunningBatch] = useState(false);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      flowchart: { curve: 'basis', htmlLabels: false }
    });
    compileAndReset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEditorChange = useCallback((val) => { setEditorCode(val); setIsDirty(true); }, []);

  const loadTape = useCallback((inputVal) => {
    const initialTape = {};
    for (let i = 0; i < inputVal.length; i++) initialTape[i] = inputVal[i];
    setTape(initialTape);
    setHead(0);
    setStepCount(0);
    setCurrentState('q0');
    setHistory([]);
    setStatus('IDLE');
    setRuntimeError(null);
  }, []);

  const compileAndReset = useCallback(() => {
    try {
      const { newTransitions, nodes, edges } = parseMachineCode(editorCode);
      if (nodes.length === 0) throw new Error("Nenhum estado válido encontrado.");
      setTransitions(newTransitions);
      setVisualData({ nodes, edges });
      setCompileError(null);
      setIsDirty(false);
      loadTape(activeInput);
    } catch (err) {
      setCompileError(err.message);
      setVisualData({ nodes: [], edges: [] });
      setIsDirty(false);
    }
  }, [editorCode, activeInput, loadTape]);

  const handleLoadTest = (inputVal) => {
    setActiveInput(inputVal);
    loadTape(inputVal);
  };

  const handleAddTest = () => {
    setTests(prev => [...prev, { id: Date.now(), input: '', status: 'IDLE' }]);
  };

  const handleRemoveTest = (id) => {
    setTests(prev => prev.filter(t => t.id !== id));
  };

  const handleUpdateTestInput = (id, val) => {
    setTests(prev => prev.map(t => t.id === id ? { ...t, input: val, status: 'IDLE' } : t));
  };

  const handleRunTests = () => {
    setIsRunningBatch(true);
    setTimeout(() => {
      setTests(prev => prev.map(test => {
        const result = runFastSimulation(transitions, test.input);
        return { ...test, status: result };
      }));
      setIsRunningBatch(false);
    }, 100);
  };

  const handleCellClick = useCallback((index) => {
    setStatus('IDLE');
    setHead(index);
    setCurrentState('q0');
    setStepCount(0);
    setRuntimeError(null);
    setHistory([]);
  }, []);

  const stepForward = useCallback(() => {
    if (status === 'ACCEPTED' || status === 'REJECTED') return;
    const currentSymbol = tape[head] || '_';
    const key = `${currentState}:${currentSymbol}`;
    const rule = transitions[key];
    const historyState = { tape: { ...tape }, head, currentState, status, stepCount };

    if (!rule) {
      if (currentState === 'ha') setStatus('ACCEPTED');
      else {
        setStatus('REJECTED');
        setRuntimeError(`Sem transição para (${currentState}, ${currentSymbol})`);
      }
      setHistory(prev => [...prev.slice(-CONFIG.MAX_HISTORY), historyState]);
      return;
    }

    const newTape = { ...tape };
    if (rule.write === '_') delete newTape[head];
    else newTape[head] = rule.write;

    let newHead = head;
    if (rule.move === 'R') newHead++;
    else if (rule.move === 'L') newHead--;

    if (newHead < 0) {
      setStatus('REJECTED');
      setRuntimeError("Crash: Limite esquerdo da fita.");
      setHistory(prev => [...prev.slice(-CONFIG.MAX_HISTORY), historyState]);
      return;
    }

    setTape(newTape);
    setHead(newHead);
    setStepCount(c => c + 1);
    setCurrentState(rule.to);
    setHistory(prev => [...prev.slice(-CONFIG.MAX_HISTORY), historyState]);

    if (rule.to === 'ha') setStatus('ACCEPTED');
  }, [tape, head, currentState, status, transitions, stepCount]);

  const stepBack = useCallback(() => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTape(prev.tape);
    setHead(prev.head);
    setCurrentState(prev.currentState);
    setStepCount(prev.stepCount);
    setStatus('PAUSED');
    setRuntimeError(null);
    setHistory(prev => prev.slice(0, -1));
  }, [history]);

  useEffect(() => {
    let interval;
    if (status === 'RUNNING') {
      const delay = 1000 - speed;
      interval = setInterval(stepForward, Math.max(50, delay));
    }
    return () => clearInterval(interval);
  }, [status, speed, stepForward]);

  return (
    <div className="flex flex-col h-screen w-screen bg-white">
      <Header status={status} runtimeError={runtimeError} currentState={currentState} head={head} stepCount={stepCount} activeInput={activeInput} />
      <TapeVisualizer tape={tape} head={head} status={status} onCellClick={handleCellClick} />

      <div className="flex flex-1 overflow-hidden">
        <EditorPanel
          editorCode={editorCode}
          setEditorCode={handleEditorChange}
          onCompile={compileAndReset}
          isDirty={isDirty}
          compileError={compileError}
          isOpen={isEditorOpen}
          onToggle={() => setIsEditorOpen(!isEditorOpen)}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50/50 border-r border-slate-200 transition-all duration-300" style={{ flexGrow: (isEditorOpen && isTestsOpen) ? 2 : 4 }}>
          <DiagramVisualizer
            visualData={visualData}
            currentState={currentState}
            tape={tape}
            head={head}
            transitions={transitions}
            status={status}
            compileError={compileError}
          />
          <PlaybackControls
            onStepBack={stepBack}
            onStepForward={stepForward}
            onPlayPause={() => setStatus(s => s === 'RUNNING' ? 'PAUSED' : 'RUNNING')}
            status={status}
            speed={speed}
            setSpeed={setSpeed}
            historyLength={history.length}
          />
        </div>

        <TestPanel
          tests={tests}
          onAddTest={handleAddTest}
          onRemoveTest={handleRemoveTest}
          onUpdateTestInput={handleUpdateTestInput}
          onRunTests={handleRunTests}
          onLoadTest={handleLoadTest}
          isRunningBatch={isRunningBatch}
          isOpen={isTestsOpen}
          onToggle={() => setIsTestsOpen(!isTestsOpen)}
        />
      </div>
    </div>
  );
}

export default App;
