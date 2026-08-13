


import { CssBaseline, ThemeProvider } from "@mui/material";
import { useRoutes } from "react-router-dom";
import { useSelector } from "src/store/Store";
import { ThemeSettings } from "./theme/Theme";
import RTL from "./layouts/full/shared/customizer/RTL";
import ScrollToTop from "./components/shared/ScrollToTop";
import Router from "./routes/Router";
import { AppState } from "./store/Store";

import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/Store';

import { AuthProvider } from './context/AuthContext';
import { TooltipProvider } from './context/TooltipContext';


import NotifyBootstrap from './socket/NotifyBootstrap';
import AiAgentPage from "./views/ai/ai";
import { loadWhisper } from "./services/whisper.service";
import { useEffect } from "react";

function App() {
  const routing = useRoutes(Router);
  const theme = ThemeSettings();
  const customizer = useSelector((state: AppState) => state.customizer);

   useEffect(() => {
    loadWhisper()
      .then(() => {
        console.log('Whisper is ready');
      })
      .catch((error) => {
        console.error('Whisper failed:', error);
      });
  }, []);

  

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <AuthProvider>
          <NotifyBootstrap />
          <TooltipProvider>
            <ThemeProvider theme={theme}>
              <RTL direction={customizer.activeDir}>
                <CssBaseline />
                <ScrollToTop>
                  {routing}
                  {/* <AiAgentPage /> */}
                </ScrollToTop>
              </RTL>
            </ThemeProvider>
          </TooltipProvider>
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;