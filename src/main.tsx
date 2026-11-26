import { createRoot } from "react-dom/client";
import { createAgent, registerTools } from "@ui-sdk/react/agent";
import App from "./App";
import "./styles.css";

const agent = createAgent();
const unregister = registerTools(agent, { allow: (step) => !step.confirm });
if (import.meta.hot) import.meta.hot.dispose(unregister);
createRoot(document.getElementById("root")!).render(<App />);
