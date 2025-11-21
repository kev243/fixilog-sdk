export interface FixilogConfig {
  appId: string; // identifiant du projet/app côté Fixilog
  environment?: string; // "production", "staging", etc.
  metadata?: Record<string, any>;
}

// Fonction principale pour capturer et envoyer une erreur à Fixilog
export function captureError(error: unknown, config: FixilogConfig) {
  if (!config?.appId) return;
  if (!error) return;

  // extration du message et de la stack
  const err = normalizeError(error);

  // Construction du payload à envoyer à l’API Fixilog
  const payload = {
    appId: config.appId,
    environment: config.environment ?? "production",
    message: err.message,
    stacktrace: err.stack,
    metadata: config.metadata ?? {},
    timestamp: Date.now(),
    userAgent: typeof window !== "undefined" ? navigator.userAgent : "server",
  };

  console.log("FIXILOG PAYLOAD:", payload);

  // Envoi de l’erreur à l’API Fixilog
  fetch("https://api.fixilog.dev/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => {
    // On ignore les erreurs d’envoi pour ne pas casser l’app du client
  });
}

// Normalisation de l’erreur pour extraire message et stack
function normalizeError(error: unknown): { message: string; stack?: string } {
  if (error instanceof Error) {
    return {
      message: error.message || "Unknown error",
      stack: error.stack,
    };
  }

  if (typeof error === "string") {
    return { message: error };
  }

  try {
    return { message: JSON.stringify(error) };
  } catch {
    return { message: "Unknown error" };
  }
}
