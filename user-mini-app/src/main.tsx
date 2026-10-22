
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { applyTelegramTheme, initTelegramApp } from "./services/telegram";
import "./index.css";

initTelegramApp();
applyTelegramTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
