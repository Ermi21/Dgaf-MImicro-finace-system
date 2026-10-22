/** Thin wrapper around the Telegram WebApp global. Every other module
 * talks to Telegram through this file, never `window.Telegram` directly -
 * so if the SDK integration ever needs to change, there's one place to
 * touch. Falls back gracefully when opened outside Telegram (plain
 * browser during development). */

function webApp() {
  return window.Telegram?.WebApp ?? null;
}

export function initTelegramApp(): void {
  const app = webApp();
  if (app) {
    try {
      app.ready();
      app.expand();
    } catch {}
  }
}

export function getInitData(): string {
  return webApp()?.initData ?? "";
}

export async function getInitDataAsync(timeoutMs = 200): Promise<string> {
  const app = webApp();
  if (app?.initData) {
    try {
      app.ready();
      app.expand();
    } catch {}
    return app.initData;
  }

  // Outside real Telegram or in dev mode without initData, return immediately
  if (import.meta.env.DEV && !app?.initData) {
    return "";
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = webApp();
    if (current?.initData) {
      try {
        current.ready();
        current.expand();
      } catch {}
      return current.initData;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  const finalApp = webApp();
  if (finalApp) {
    try {
      finalApp.ready();
    } catch {}
    return finalApp.initData ?? "";
  }
  return "";
}

export function getStartParam(): string | null {
  const app = webApp();
  return app?.initDataUnsafe?.start_param ?? null;
}

export function getTelegramUser() {
  const app = webApp();
  return app?.initDataUnsafe?.user ?? null;
}

export function getColorScheme(): "light" | "dark" {
  return webApp()?.colorScheme ?? "light";
}

export function applyTelegramTheme(): void {
  try {
    const app = webApp();
    if (!app || !app.themeParams) return;
    const root = document.documentElement.style;
    const theme = app.themeParams;
    if (theme.bg_color) root.setProperty("--tg-bg", theme.bg_color);
    if (theme.text_color) root.setProperty("--tg-text", theme.text_color);
    if (theme.hint_color) root.setProperty("--tg-hint", theme.hint_color);
    if (theme.secondary_bg_color) root.setProperty("--tg-surface", theme.secondary_bg_color);
  } catch {}
}

export function showAlert(message: string): void {
  const app = webApp();
  if (app) {
    app.showAlert(message);
  } else {
    window.alert(message);
  }
}

export function hapticSuccess(): void {
  webApp()?.HapticFeedback.notificationOccurred("success");
}

export function hapticError(): void {
  webApp()?.HapticFeedback.notificationOccurred("error");
}

export function hapticSelection(): void {
  webApp()?.HapticFeedback.selectionChanged();
}

export function setMainButton(
  text: string,
  onClick: () => void,
  opts?: { enabled?: boolean; showProgress?: boolean },
): () => void {
  const app = webApp();
  if (!app) return () => {};
  app.MainButton.setText(text);
  if (opts?.showProgress) {
    app.MainButton.showProgress(true);
  } else {
    app.MainButton.hideProgress();
  }
  if (opts?.enabled === false) {
    app.MainButton.disable();
  } else {
    app.MainButton.enable();
  }
  app.MainButton.show();
  app.MainButton.onClick(onClick);
  return () => {
    app.MainButton.offClick(onClick);
    app.MainButton.hide();
  };
}

export function hideMainButton(): void {
  webApp()?.MainButton.hide();
}

export function setBackButton(onClick: () => void): () => void {
  const app = webApp();
  if (!app) return () => {};
  app.BackButton.show();
  app.BackButton.onClick(onClick);
  return () => {
    app.BackButton.offClick(onClick);
    app.BackButton.hide();
  };
}
