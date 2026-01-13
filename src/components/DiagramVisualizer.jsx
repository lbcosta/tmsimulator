import React, { useRef, useState, useEffect } from 'react';
import mermaid from 'mermaid';
import Icons from './ui/Icons';
import { THEME } from '../utils/constants';
import { generateMermaidDefinition, applySvgPostProcessing } from '../utils/mermaidUtils';

const DiagramVisualizer = ({ visualData, currentState, transitions, status, compileError, tape, head }) => {
    const containerRef = useRef(null);
    const diagramRef = useRef(null);
    const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
    const isDragging = useRef(false);
    const lastPos = useRef({ x: 0, y: 0 });

    const lastDist = useRef(null);

    const handleWheel = (e) => {
        e.preventDefault();
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.min(Math.max(0.2, transform.scale * delta), 4);
        const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
        const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);
        setTransform({ x: newX, y: newY, scale: newScale });
    };

    const handleMouseDown = (e) => { isDragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
    const handleMouseUp = () => { isDragging.current = false; };
    const handleMouseMove = (e) => {
        if (!isDragging.current) return;
        const dx = e.clientX - lastPos.current.x;
        const dy = e.clientY - lastPos.current.y;
        lastPos.current = { x: e.clientX, y: e.clientY };
        setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    };

    // Touch Handlers for Pinch Zoom & Pan
    const getDistance = (touches) => {
        return Math.hypot(
            touches[0].clientX - touches[1].clientX,
            touches[0].clientY - touches[1].clientY
        );
    };

    const handleTouchStart = (e) => {
        if (e.touches.length === 1) {
            isDragging.current = true;
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            isDragging.current = false;
            lastDist.current = getDistance(e.touches);
        }
    };

    const handleTouchMove = (e) => {
        if (e.touches.length === 1 && isDragging.current) {
            const dx = e.touches[0].clientX - lastPos.current.x;
            const dy = e.touches[0].clientY - lastPos.current.y;
            lastPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
        } else if (e.touches.length === 2) {
            const newDist = getDistance(e.touches);
            if (lastDist.current) {
                const delta = newDist / lastDist.current;
                const newScale = Math.min(Math.max(0.2, transform.scale * delta), 4);

                // Pinch zoom center logic approximate
                const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
                const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
                const rect = containerRef.current.getBoundingClientRect();
                const mouseX = centerX - rect.left;
                const mouseY = centerY - rect.top;

                const newX = mouseX - (mouseX - transform.x) * (newScale / transform.scale);
                const newY = mouseY - (mouseY - transform.y) * (newScale / transform.scale);

                setTransform({ x: newX, y: newY, scale: newScale });
                lastDist.current = newDist;
            }
        }
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
        lastDist.current = null;
    };

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent default gesture events to avoid page zoom
        const preventDefault = (e) => e.preventDefault();
        container.addEventListener('touchstart', preventDefault, { passive: false });
        // We handle logic via React props, but preventing default on container helps stop browser zoom

        return () => {
            container.removeEventListener('touchstart', preventDefault);
        };
    }, []);

    // ... (rest of useEffect)
    useEffect(() => {
        if (compileError || !diagramRef.current || !visualData) {
            if (diagramRef.current) {
                diagramRef.current.innerHTML = '';
            }
            return;
        }

        const currentSymbol = tape[head] || '_';
        const key = `${currentState}:${currentSymbol}`;
        const rule = transitions[key];

        let activeEdgeIndex = null;
        let activeRuleLabel = null;

        if (status !== 'ACCEPTED' && status !== 'REJECTED' && rule) {
            activeRuleLabel = rule.label;
            activeEdgeIndex = rule.edgeIndex;
        }

        const definition = generateMermaidDefinition(
            visualData.nodes,
            visualData.edges,
            currentState,
            status,
            activeEdgeIndex
        );

        console.log("Mermaid Definition:", definition); // Debug log

        mermaid.initialize({
            startOnLoad: false,
            theme: 'base',
            securityLevel: 'loose',
            fontFamily: 'Fira Code, monospace',
            flowchart: {
                htmlLabels: false,
                curve: 'basis',
            },
            themeVariables: {
                mainBkg: '#ffffff',
                nodeBorder: '#334155',
                edgeLabelBackground: '#ffffff',
                tertiaryColor: '#f1f5f9',
                fontFamily: 'Fira Code, monospace'
            }
        });

        const renderDiagram = async () => {
            try {
                const uniqueId = 'mermaid-svg-' + Date.now();
                const { svg } = await mermaid.render(uniqueId, definition);
                if (diagramRef.current) {
                    diagramRef.current.innerHTML = svg;
                    applySvgPostProcessing(diagramRef.current, THEME.primary, activeEdgeIndex, activeRuleLabel);
                }
            } catch (e) {
                console.error("Mermaid Render Error:", e);
                if (diagramRef.current) {
                    diagramRef.current.innerHTML = `<div class="text-rose-500 text-xs p-2">Erro de renderização: ${e.message}</div>`;
                }
            }
        };

        renderDiagram();

    }, [visualData, currentState, transitions, status, compileError, tape, head]);

    return (
        <div className="flex-1 flex flex-col bg-slate-50/50 relative overflow-hidden">
            <div
                className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing bg-fixed touch-none select-none"
                style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                ref={containerRef}
            >
                <div className="absolute origin-top-left transition-transform duration-75 ease-out flex items-center justify-center w-full h-full" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}>
                    {compileError ? (
                        <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl border border-rose-200 shadow-xl max-w-md text-center">
                            <div className="text-rose-500 mb-2 flex justify-center"><Icons.AlertCircle size={32} /></div>
                            <h3 className="text-rose-700 font-bold mb-1">Erro de Compilação</h3>
                            <p className="text-rose-600/80 text-sm font-mono break-words">{compileError}</p>
                        </div>
                    ) : <div ref={diagramRef} className="origin-center" />}
                    {visualData.nodes.length === 0 && !compileError && <div className="text-slate-300 flex flex-col items-center"><Icons.Cpu size={48} className="mb-3 opacity-20" /><p className="font-medium">Sem diagrama.</p></div>}
                </div>
            </div>
        </div>
    );
};

export default DiagramVisualizer;
