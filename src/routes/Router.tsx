// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';

/* ***Layouts**** */
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));

/* ****Pages***** */
const ModernDash = Loadable(lazy(() => import('../views/dashboard/Modern')));

// سیستم عملیات و مدیریت کاربران
const SystemOperation = Loadable(lazy(() => import('../views/managmentusers/system-operation/SystemOperation')));
const ListRoles = Loadable(lazy(() => import('../views/managmentusers/list-roles/ListRoles')));
const ListUsers = Loadable(lazy(() => import('../views/managmentusers/list-users/ListUsers')));

// اطلاعات پایه
const ListCategory = Loadable(lazy(() => import('../views/baseinfo/category/ListCategory')));
const ListUnit = Loadable(lazy(() => import('../views/baseinfo/unit/ListUnit')));
const ListItem = Loadable(lazy(() => import('../views/baseinfo/item/ListItem')));

// مناقصات (Tender)
const ListAuction = Loadable(lazy(() => import('../views/tender/ListTender')));
const AuctionDetails = Loadable(lazy(() => import('../views/tender/TenderDetails')));

// Work (کارها)
const ListWorks = Loadable(lazy(() => import('../views/works/ListWorks')));

// ✅ کامپوننت جدید برای لیست شبکه‌ها (ListNetwork)
// فرض می‌کنیم این فایل رو در مسیر views/networks/ListNetwork.tsx ذخیره کرده‌اید
const ListNetworks = Loadable(lazy(() => import('../views/works/ListNetworks')));

// ✅ کامپوننت جدید برای جزئیات شبکه (NetworkDetails)
// فرض می‌کنیم این فایل رو در مسیر views/networks/NetworkDetails.tsx ذخیره کرده‌اید
// این همان WorkDetails قدیمی شما است که حالا جزئیات شبکه را نمایش می‌دهد.
// اگر WorkDetails قبلی شما واقعا برای جزئیات Work است و میخواهید آن را حفظ کنید،
// باید یک کامپوننت جدید به نام NetworkDetails بسازید و آدرس آن را اینجا قرار دهید.
const NetworkDetails = Loadable(lazy(() => import('../views/works/WorkDetails')));

const ListProductTypes = Loadable(lazy(() => import('../views/producttypes/ListProductTypes')));


// Authentication
const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(
  lazy(() => import('../views/authentication/auth2/ForgotPassword2')),
);
const TwoSteps = Loadable(lazy(() => import('../views/authentication/auth1/TwoSteps')));
const TwoSteps2 = Loadable(lazy(() => import('../views/authentication/auth2/TwoSteps2')));
const Error = Loadable(lazy(() => import('../views/authentication/Error')));
const Maintenance = Loadable(lazy(() => import('../views/authentication/Maintenance')));
const ResetPassword = Loadable(lazy(() => import('../views/authentication/auth1/ResetPassword')));

// Landingpage
const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));

const Router = [
  {
    path: '/',
    element: <FullLayout />,
    children: [
      { path: '/', element: <Navigate to="/auth/login" /> },
      { path: '/dashboards/dashboard', exact: true, element: <ModernDash /> },

      { path: '/managmentusers/system-operation', element: <SystemOperation /> },
      { path: '/managmentusers/list-roles', element: <ListRoles /> },
      { path: '/managmentusers/list-users', element: <ListUsers /> },

      { path: '/baseinfo/list-categories', element: <ListCategory /> },
      { path: '/baseinfo/list-units', element: <ListUnit /> },
      { path: '/baseinfo/list-items', element: <ListItem /> },

      { path: '/tender/list-tender', element: <ListAuction /> },
      { path: '/tender/tender-details/:tenderId', element: <AuctionDetails /> },

      { path: '/tender/define-work/', element: <ListWorks /> },

      { /* ✅ مسیر جدید برای لیست شبکه‌ها */
        path: '/work/:workId/networks',
        element: <ListNetworks />
      },
      { /* ✅ مسیر تغییر یافته برای جزئیات شبکه (NetworkDetails) */
        path: '/network/:networkId/details', // تغییر مسیر و پارامتر
        element: <NetworkDetails />
      },
      { path: '/product-type/list-product-types/', element: <ListProductTypes /> },

      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
  {
    path: '/',
    element: <BlankLayout />,
    children: [
      { path: '/auth/404', element: <Error /> },
      { path: '/auth/login', element: <Login /> },
      { path: '/auth/login2', element: <Login2 /> },
      { path: '/auth/register', element: <Register /> },
      { path: '/auth/register2', element: <Register2 /> },
      { path: '/auth/forgot-password', element: <ForgotPassword /> },
      { path: '/auth/forgot-password2', element: <ForgotPassword2 /> },
      { path: '/auth/two-steps', element: <TwoSteps /> },
      { path: '/auth/two-steps2', element: <TwoSteps2 /> },
      { path: '/auth/maintenance', element: <Maintenance /> },
      { path: '/auth/reset-password', element: <ResetPassword /> },
      { path: '/landingpage', element: <Landingpage /> },
      { path: '*', element: <Navigate to="/auth/404" /> },
    ],
  },
];

export default Router;