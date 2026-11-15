import { createBrowserRouter } from "react-router-dom";
import App from "../App";
import LandingPage from "../components/Landingpage";
import DashboardPage from "../components/Dashboardpage";

const router = createBrowserRouter(
  [
    {
      path: "/",       
      element: <App />,
      children: [
              {
                // Home page - shows list of bus stops
                path: "/",
                element: <LandingPage />,
              },
              {
                // Dashboard page - shows bus arrivals for specific stop
                path: "/dashboards/:busStopCode/:description/:lat/:long",
                element: <DashboardPage />,
              },
      ],
    },
  ],
  {
    basename: "/",
  }
);

export default router;
