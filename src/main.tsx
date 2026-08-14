
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "virtual:uno.css";
  import "./styles/index.less";

  createRoot(document.getElementById("root")!).render(<App />);
  
