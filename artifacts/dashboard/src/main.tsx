import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { msalInstance } from "./lib/msal";

msalInstance.initialize().then(() => {
  createRoot(document.getElementById("root")!).render(<App />);
});
