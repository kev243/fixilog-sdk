export interface FixilogConfig {
  appId?: string; // identifiant du projet/app côté Fixilog
  fixilogSecret?: string; // clé secrète sécurisée (server uniquement)
  metadata?: Record<string, any>;
}

// Fonction principale pour capturer et envoyer une erreur à Fixilog
export function captureError(error: unknown, config: FixilogConfig = {}) {
  if (!config) {
    console.warn("Fixilog: No configuration provided.");
    return;
  }

  // Détection automatique du contexte server/client
  const isServer = typeof window === "undefined";

  // Vérification minimale de appId
  if (!config.appId) {
    console.warn("Fixilog: Missing appId. Error not sent.");
    return;
  }

  // Vérification secrète côté serveur
  if (isServer && !config.fixilogSecret) {
    console.warn(
      "Fixilog: Missing fixilogSecret for server-side error. Error not sent."
    );
    return;
  }

  if (!error) {
    console.warn("Fixilog: No error provided.");
    return;
  }

  // Normalisation de l’erreur
  const err = normalizeError(error);

  // Construction du payload à envoyer à l’API Fixilog
  const payload: any = {
    appId: config.appId,
    message: err.message,
    stacktrace: err.stack,
    metadata: config.metadata ?? {},
    timestamp: Date.now(),
    environment: isServer ? "server" : "client",
    userAgent: isServer ? "server" : navigator.userAgent,
  };

  // Ajout de la clé secrète uniquement côté serveur
  if (isServer && config.fixilogSecret) {
    payload.fixilogSecret = config.fixilogSecret;
  }

  console.log("FIXILOG PAYLOAD:", payload);

  // Envoi de l’erreur à l’API Fixilog
  fetch("https://api.fixilog.dev/api/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.warn(
          `Fixilog: Failed to send error (HTTP ${response.status})`,
          errorData
        );
      } else {
        console.log("Fixilog: Error successfully sent");
      }
    })
    .catch((err) => {
      // On log l'erreur d'envoi mais on ne casse pas l'app
      console.warn("Fixilog: Network error while sending report:", err.message);
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
