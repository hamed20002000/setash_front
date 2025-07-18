// import { CssBaseline, ThemeProvider } from "@mui/material";
// import { useRoutes } from "react-router-dom";
// import { useSelector } from "src/store/Store";
// import { ThemeSettings } from "./theme/Theme";
// import RTL from "./layouts/full/shared/customizer/RTL";
// import ScrollToTop from "./components/shared/ScrollToTop";
// import Router from "./routes/Router";
// import { AppState } from "./store/Store";
// import { AuthProvider } from './context/AuthContext'; // ایمپورت AuthProvider

// function App() {
//   const routing = useRoutes(Router);
//   const theme = ThemeSettings();
//   const customizer = useSelector((state: AppState) => state.customizer);

//   return (
//     <ThemeProvider theme={theme}>
//       <RTL direction={customizer.activeDir}>
//         <CssBaseline />
//         <ScrollToTop>{routing}</ScrollToTop>
//       </RTL>
//     </ThemeProvider>
//   );
// }

// export default App;

// import { CssBaseline, ThemeProvider } from "@mui/material";
// import { useRoutes } from "react-router-dom";
// import { useSelector } from "src/store/Store";
// import { ThemeSettings } from "./theme/Theme";
// import RTL from "./layouts/full/shared/customizer/RTL";
// import ScrollToTop from "./components/shared/ScrollToTop";
// import Router from "./routes/Router";
// import { AppState } from "./store/Store";
// import { AuthProvider } from './context/AuthContext'; 
// import { LayoutProvider } from './context/LayoutContext'; 
// import { TooltipProvider } from './context/TooltipContext'; 

// function App() {
//   const routing = useRoutes(Router);
//   const theme = ThemeSettings();
//   const customizer = useSelector((state: AppState) => state.customizer);

//   return (
//    <AuthProvider>
//     <LayoutProvider>
//        <TooltipProvider> 
//         <ThemeProvider theme={theme}>
//           <RTL direction={customizer.activeDir}>
//             <CssBaseline />
//             <ScrollToTop>{routing}</ScrollToTop>
//           </RTL>
//         </ThemeProvider>
//       </TooltipProvider>
//     </LayoutProvider>
     
//     </AuthProvider>
//   );
// }

// export default App;


import { CssBaseline, ThemeProvider } from "@mui/material";
import { useRoutes } from "react-router-dom";
import { useSelector } from "src/store/Store";
import { ThemeSettings } from "./theme/Theme";
import RTL from "./layouts/full/shared/customizer/RTL";
import ScrollToTop from "./components/shared/ScrollToTop";
import Router from "./routes/Router";
import { AppState } from "./store/Store";

// --- Redux-Persist Imports ---
import { Provider } from 'react-redux'; // Already used implicitly via useSelector/useDispatch, but good to have explicit
import { PersistGate } from 'redux-persist/integration/react'; // The component to wrap your app
import { store, persistor } from './store/Store'; // Import both store and persistor from your Redux store setup

// --- Your Context Providers ---
import { AuthProvider } from './context/AuthContext';
// import { LayoutProvider } from './context/LayoutContext';
import { TooltipProvider } from './context/TooltipContext';

function App() {
  const routing = useRoutes(Router);
  const theme = ThemeSettings();
  const customizer = useSelector((state: AppState) => state.customizer);

  return (
    // Step 1: Wrap your entire application with the Redux Provider
    <Provider store={store}>
      {/* Step 2: Wrap your application inside PersistGate */}
      {/* This ensures the Redux state is rehydrated from localStorage before rendering */}
      <PersistGate loading={null} persistor={persistor}> {/* `loading={null}` means no specific loading indicator */}
        {/* Step 3: Your other Context Providers go inside PersistGate */}
        <AuthProvider>
          {/* <LayoutProvider> */}
            <TooltipProvider>
              <ThemeProvider theme={theme}>
                <RTL direction={customizer.activeDir}>
                  <CssBaseline />
                  <ScrollToTop>{routing}</ScrollToTop>
                </RTL>
              </ThemeProvider>
            </TooltipProvider>
          {/* </LayoutProvider> */}
        </AuthProvider>
      </PersistGate>
    </Provider>
  );
}

export default App;