import React, { memo } from 'react';
import { CONFIG } from '../utils/constants';
import Icons from './ui/Icons';

const TapeVisualizer = memo(({ tape, head, status, onCellClick }) => {
    const TOTAL_CELL_WIDTH = CONFIG.TAPE_CELL_WIDTH + CONFIG.TAPE_CELL_MARGIN;
    const CENTER_OFFSET = TOTAL_CELL_WIDTH / 2;

    const [dragOffset, setDragOffset] = React.useState(0);
    const [isDragging, setIsDragging] = React.useState(false); // State for transition toggle
    const dragRef = React.useRef({ isDown: false, startX: 0, startOffset: 0, hasMoved: false });

    React.useEffect(() => {
        setDragOffset(0);
    }, [head]);

    const handleStart = (clientX) => {
        dragRef.current = {
            isDown: true,
            startX: clientX,
            startOffset: dragOffset,
            hasMoved: false
        };
        setIsDragging(true);
    };

    const handleEnd = () => {
        if (!dragRef.current.isDown) return;
        dragRef.current.isDown = false;

        if (dragRef.current.hasMoved) {
            const currentOffset = dragRef.current.startOffset + (dragRef.current.lastClientX - dragRef.current.startX);
            // Calculate how many cells we drifted (negative because creating positive offset moves view right, which lowers index relative to center)
            // Wait: offset > 0 (moved right). View shifts right. Pointer (center) stays. Loop moves right.
            // Items shift right. item[0] moves right. 
            // transform: -head*W + offset. 
            // If offset = +W. transform = -(head)*W + W = -(head-1)*W.
            // Visually looks like head-1 is at center.
            // So newHead = head - round(offset / W).

            const cellsMoved = Math.round(currentOffset / TOTAL_CELL_WIDTH);
            let newHead = head - cellsMoved;
            if (newHead < 0) newHead = 0;

            if (newHead !== head) {
                onCellClick(newHead);
            } else {
                setDragOffset(0); // Snap back if didn't move enough to change cell
            }
        }

        setIsDragging(false);
    };

    const handleMove = (clientX) => {
        if (!dragRef.current.isDown) return;
        dragRef.current.lastClientX = clientX; // Track last position for end calculation
        const delta = clientX - dragRef.current.startX;
        if (Math.abs(delta) > 5) dragRef.current.hasMoved = true;
        setDragOffset(dragRef.current.startOffset + delta);
    };

    const handleCellClickInternal = (idx) => {
        if (!dragRef.current.hasMoved) {
            onCellClick(idx);
        }
    };

    return (
        <div
            className="relative w-full bg-slate-100/50 h-28 border-b border-slate-200 shadow-inner overflow-hidden cursor-grab active:cursor-grabbing"
            onMouseDown={e => handleStart(e.clientX)}
            onMouseMove={e => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={e => handleStart(e.touches[0].clientX)}
            onTouchMove={e => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
        >
            <div className="absolute left-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-r from-slate-100 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-24 z-20 bg-gradient-to-l from-slate-100 to-transparent pointer-events-none" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 text-indigo-500 drop-shadow-md mt-1 pointer-events-none">
                <Icons.TriangleDown width="24" height="12" />
            </div>
            <div
                className="flex items-center h-full absolute top-0 left-1/2 tape-container"
                style={{
                    transform: `translateX(calc(-${head * TOTAL_CELL_WIDTH}px - ${CENTER_OFFSET}px + ${dragOffset}px))`,
                    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                {Array.from({ length: Math.max(head + 20, 40) }).map((_, idx) => {
                    const char = tape[idx] || '_';
                    const isHead = idx === head;
                    let stateStyle = "border-slate-300 bg-white text-slate-400";
                    if (isHead) {
                        if (status === 'REJECTED') stateStyle = "border-rose-500 bg-rose-50 text-rose-700 shadow-lg shadow-rose-200/50 scale-110";
                        else if (status === 'ACCEPTED') stateStyle = "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg shadow-emerald-200/50 scale-110";
                        else stateStyle = "border-indigo-500 bg-white text-indigo-700 shadow-xl shadow-indigo-200/50 scale-110";
                    }
                    return (
                        <div
                            key={idx}
                            onMouseUp={(e) => {
                                // Only fire click if we didn't drag.
                                // The capture is handled by the parent's MouseUp logic tracking movement.
                                // We call internal handler here.
                                handleCellClickInternal(idx);
                            }}
                            className="flex flex-col items-center justify-center shrink-0 mr-2 cursor-pointer hover:scale-105 transition-transform"
                            style={{ width: `${CONFIG.TAPE_CELL_WIDTH}px` }}
                        >
                            <div className={`tape-cell rounded-xl flex items-center justify-center text-2xl font-mono font-medium border-2 ${stateStyle}`}>
                                {char === '_' ? <span className="opacity-20">Δ</span> : char}
                            </div>
                            <div className={`text-[10px] mt-2 font-mono transition-colors ${isHead ? 'text-indigo-600 font-bold' : 'text-slate-300'}`}>{idx}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default TapeVisualizer;
