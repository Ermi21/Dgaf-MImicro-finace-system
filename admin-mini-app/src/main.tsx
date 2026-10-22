import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { applyTelegramTheme, initTelegramApp } from "./services/telegram";
import "./index.css";

try {
  initTelegramApp();
  applyTelegramTheme();
} catch (e) {
  console.warn("Telegram init warning:", e);
}

const rootElement = document.getElementById("root");
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}

