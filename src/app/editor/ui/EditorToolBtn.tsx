import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";

export function EditorToolBtn({ label, cmd, exec, activeFormats, children, action, getBtnRef }: {
  label: string; cmd?: string; exec?: (c: string, v?: string) => void;
  activeFormats?: Set<string>; children: React.ReactNode; action?: (e: React.MouseEvent<HTMLButtonElement>) => void; getBtnRef?: (el: HTMLButtonElement | null) => void;
}) {
  const [hover, setHover] = useState(false);
  const [tipPos, setTipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const ref = useRef<HTMLButtonElement>(null);
  const handledPointerRef = useRef(false);
  const runAction = (e: React.MouseEvent<HTMLButtonElement>) => {
    action ? action(e) : (cmd && exec?.(cmd));
  };
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    handledPointerRef.current = true;
    runAction(e);
  };
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (handledPointerRef.current) {
      handledPointerRef.current = false;
      return;
    }
    runAction(e);
  };
  const handleEnter = () => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setTipPos({ x: r.left + r.width / 2, y: r.top - 4 });
    }
    setHover(true);
  };
  return (
    <div className="relative">
      <button
        ref={(el) => { ref.current = el; getBtnRef?.(el); }}
        type="button"
        aria-label={label}
        title={label}
        className={`rounded-[4px] shrink-0 size-[24px] cursor-pointer transition-colors relative border-0 p-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#134CFF] focus-visible:outline-offset-1 hover:bg-[#EBECF0] active:bg-[#EBECF0] ${cmd && activeFormats?.has(cmd) ? "bg-[#EBECF0]" : "bg-transparent"}`}
        onMouseEnter={handleEnter}
        onMouseLeave={() => setHover(false)}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
      >
        {children}
      </button>
      {hover && createPortal(
        <div
          className="fixed z-[290] box-border w-max max-w-[min(280px,calc(100vw-16px))] bg-white border border-[#ebecf0] shadow-[0px_12px_16px_-4px_rgba(36,36,36,0.08)] text-[#131212] text-[14px] leading-[20px] px-[8px] py-[8px] rounded-[8px] pointer-events-none whitespace-nowrap"
          style={{
            left: tipPos.x,
            top: tipPos.y,
            transform: "translate(-50%, -100%)",
            width: "max-content",
          }}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}
