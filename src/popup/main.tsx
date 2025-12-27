import React from "react";
import ReactDOM from "react-dom/client";
import PopupApp from "./popup-app";
import "../styles.css";
import { AppToaster } from "../components/ui/toaster";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PopupApp />
    <AppToaster />
  </React.StrictMode>
);

