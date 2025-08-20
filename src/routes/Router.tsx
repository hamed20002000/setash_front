// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import React, { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';
const FullLayout = Loadable(lazy(() => import('../layouts/full/FullLayout')));
const BlankLayout = Loadable(lazy(() => import('../layouts/blank/BlankLayout')));
const ModernDash = Loadable(lazy(() => import('../views/dashboard/Modern')));
const SystemOperation = Loadable(lazy(() => import('../views/managmentusers/system-operation/SystemOperation')));
const ListRoles = Loadable(lazy(() => import('../views/managmentusers/list-roles/ListRoles')));
const ListUsers = Loadable(lazy(() => import('../views/managmentusers/list-users/ListUsers')));
const ListCategory = Loadable(lazy(() => import('../views/baseinfo/category/ListCategory')));
const ListUnit = Loadable(lazy(() => import('../views/baseinfo/unit/ListUnit')));
const ListItem = Loadable(lazy(() => import('../views/baseinfo/item/ListItem')));
const ListAuction = Loadable(lazy(() => import('../views/tender/ListTender')));
const AuctionDetails = Loadable(lazy(() => import('../views/tender/TenderDetails')));
const ListWorks = Loadable(lazy(() => import('../views/works/list-work/ListWorks')));
const ListNetworks = Loadable(lazy(() => import('../views/works/list-network/ListNetworks')));
const NetworkDetails = Loadable(lazy(() => import('../views/works/list-network/WorkDetails')));
const ListWorkHouse = Loadable(lazy(() => import('../views/works/list-workhouse/ListWorkhouses')));
const WorkHouseDetails = Loadable(lazy(() => import('../views/works/list-workhouse/WorkhouseDetails')));
const ListProductTypes = Loadable(lazy(() => import('../views/baseinfo/producttypes/ListProductTypes')));
const ListTransmission = Loadable(lazy(() => import('../views/transmission/ListTransmission')));
const ListRegion = Loadable(lazy(() => import('../views/baseinfo/region/ListRegion')));
const ListWarehouses = Loadable(lazy(() => import('../views/warehouse/list-warehouse/ListWarehouses')));
const ListOrders = Loadable(lazy(() => import('../views/order/ListOrders')));
const ListDrivers = Loadable(lazy(() => import('../views/warehouse/list-driver/ListDrivers')));
const ListProviders = Loadable(lazy(() => import('../views/baseinfo/provider/ListProviders')));


const Login = Loadable(lazy(() => import('../views/authentication/auth1/Login')));
const Login2 = Loadable(lazy(() => import('../views/authentication/auth2/Login2')));
const Register = Loadable(lazy(() => import('../views/authentication/auth1/Register')));
const Register2 = Loadable(lazy(() => import('../views/authentication/auth2/Register2')));
const ForgotPassword = Loadable(lazy(() => import('../views/authentication/auth1/ForgotPassword')));
const ForgotPassword2 = Loadable(lazy(() => import('../views/authentication/auth2/ForgotPassword2')));
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
      { path: '/work/:workId/networks', element: <ListNetworks /> },
      { path: '/network/:networkId/details', element: <NetworkDetails /> },
      { path: '/workhouse/list-workhouse/:workId', element: <ListWorkHouse /> },
      { path: '/workhouse/workhousedetails/:workhouseId', element: <WorkHouseDetails /> },
      { path: '/product-type/list-product-types/', element: <ListProductTypes /> },
      { path: '/transmission/list-transmission/:networkId', element: <ListTransmission /> },
      { path: '/region/list-regions/', element: <ListRegion /> },
      { path: '/warehouse/list-warehouse/', element: <ListWarehouses /> },
      { path: '/order/list-order/', element: <ListOrders /> },
      { path: '/driver/list-driver/', element: <ListDrivers /> },
      { path: '/provider/list-provider/', element: <ListProviders /> },

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