import React from "react";

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: React.ErrorInfo) { console.error("ErrorBoundary caught:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 top-[60px] flex flex-col items-center justify-center gap-[12px]">
          <p className="font-['PingFang_SC:Regular',sans-serif] text-[#8d8e99] text-[14px]">编辑器渲染异常</p>
          <button className="px-[12px] py-[6px] rounded-[6px] bg-[#134CFF] text-white text-[13px] cursor-pointer hover:opacity-80"
            onClick={() => this.setState({ hasError: false })}>重试</button>
        </div>
      );
    }
    return this.props.children;
  }
}
