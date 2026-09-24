import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { CssBaseline, ThemeProvider } from "@mui/material";
import App from "./App";
import theme from "./theme";
import { WorldDataProvider } from "./context/WorldDataContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorldDataProvider>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </WorldDataProvider>
  </StrictMode>,
);
