import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Overlay } from "@/components/Overlay";
import { VillageCanvas } from "@/scene/VillageCanvas";
import "@/styles.css";

function App() {
  return (
    <main className="relative h-dvh w-full overflow-hidden bg-sky">
      <div className="absolute inset-0 bg-linear-to-b from-sky to-sky-horizon" />
      <VillageCanvas />
      <Overlay />
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
