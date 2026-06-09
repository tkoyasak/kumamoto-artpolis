import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen.ts";

// TanStack Start calls this `getRouter` to create the router (shared by server and client).
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
  });
}

// Registering the router type makes Link and navigation fully type-safe.
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
