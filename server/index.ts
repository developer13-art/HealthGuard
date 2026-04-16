import "dotenv/config";
import { createConfiguredApp } from "./app";
import { setupVite, serveStatic } from "./vite";
import { log } from "./log";
import { startBillingScheduler } from "./billing-scheduler";

(async () => {
  const { app, server } = await createConfiguredApp();

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  startBillingScheduler();

  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
