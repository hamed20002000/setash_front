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

import { CssBaseline, ThemeProvider } from "@mui/material";
import { useRoutes } from "react-router-dom";
import { useSelector } from "src/store/Store";
import { ThemeSettings } from "./theme/Theme";
import RTL from "./layouts/full/shared/customizer/RTL";
import ScrollToTop from "./components/shared/ScrollToTop";
import Router from "./routes/Router";
import { AppState } from "./store/Store";
import { AuthProvider } from './context/AuthContext'; // ایمپورت AuthProvider
import { TooltipProvider } from './context/TooltipContext'; 

function App() {
  const routing = useRoutes(Router);
  const theme = ThemeSettings();
  const customizer = useSelector((state: AppState) => state.customizer);

  return (
    // AuthProvider رو در بالاترین سطح قرار میدیم
   <AuthProvider>
      <TooltipProvider> {/* **TooltipProvider رو اینجا قرار بدید** */}
        <ThemeProvider theme={theme}>
          <RTL direction={customizer.activeDir}>
            <CssBaseline />
            <ScrollToTop>{routing}</ScrollToTop>
          </RTL>
        </ThemeProvider>
      </TooltipProvider>
    </AuthProvider>
  );
}

export default App;
