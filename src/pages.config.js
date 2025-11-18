import Dashboard from './pages/Dashboard';
import MonthlyReport from './pages/MonthlyReport';
import AdminPanel from './pages/AdminPanel';
import RMDLogin from './pages/RMDLogin';
import AdminLogin from './pages/AdminLogin';
import LeadershipDashboard from './pages/LeadershipDashboard';
import OfficeReport from './pages/OfficeReport';
import RegionalStructure from './pages/RegionalStructure';
import UpdateSentiments from './pages/UpdateSentiments';
import RegionalDashboard from './pages/RegionalDashboard';
import ViewOfficeSubmission from './pages/ViewOfficeSubmission';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MonthlyReport": MonthlyReport,
    "AdminPanel": AdminPanel,
    "RMDLogin": RMDLogin,
    "AdminLogin": AdminLogin,
    "LeadershipDashboard": LeadershipDashboard,
    "OfficeReport": OfficeReport,
    "RegionalStructure": RegionalStructure,
    "UpdateSentiments": UpdateSentiments,
    "RegionalDashboard": RegionalDashboard,
    "ViewOfficeSubmission": ViewOfficeSubmission,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};