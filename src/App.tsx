


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

function App() {
  const routing = useRoutes(Router);
  const theme = ThemeSettings();
  const customizer = useSelector((state: AppState) => state.customizer);

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