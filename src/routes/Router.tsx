import { lazy } from 'react';
import { Navigate } from 'react-router-dom';
import Loadable from '../layouts/full/shared/loadable/Loadable';

import PermissionGuard from 'src/context/PermissionGuard';


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
const NetworkDetails = Loadable(lazy(() => import('../views/works/list-network/NetworkDetails')));
const ListWorkHouse = Loadable(lazy(() => import('../views/works/list-workhouse/ListWorkhouses')));
const WorkHouseDetails = Loadable(lazy(() => import('../views/works/list-workhouse/WorkhouseDetails')));
const ListProductTypes = Loadable(lazy(() => import('../views/baseinfo/producttypes/ListProductTypes')));
const ListTransmission = Loadable(lazy(() => import('../views/works/transmission/ListTransmission')));
const ListRegion = Loadable(lazy(() => import('../views/baseinfo/region/ListRegion')));
const ListWarehouses = Loadable(lazy(() => import('../views/warehouse/list-warehouse/ListWarehouses')));
const ListWarehousesDistpach = Loadable(lazy(() => import('../views/warehouse/list-warehouse/ListWarehousesDistpach')));
const ListWarehouseDispatchReturnToCenter = Loadable(lazy(() => import('../views/warehouse/warehouse-dispatch-return-to-center/ListWarehouseDispatchReturnToCenter')));
const ListOrders = Loadable(lazy(() => import('../views/order/ListOrders')));
const ListDrivers = Loadable(lazy(() => import('../views/warehouse/list-driver/ListDrivers')));
const ListProviders = Loadable(lazy(() => import('../views/baseinfo/provider/ListProviders')));
const ListForceMajors = Loadable(lazy(() => import('../views/baseinfo/forcemajor/ListForceMajors')));
const ListInvoices = Loadable(lazy(() => import('../views/warehouse/list-invoice/ListInvoices')));
const ListStoreInvoice = Loadable(lazy(() => import('../views/warehouse/list-store-invoice/ListStoreInvoice')));
const ListReceipt = Loadable(lazy(() => import('../views/warehouse/list-receipt/ListReceipt')));
const ListStores = Loadable(lazy(() => import('../views/works/store/ListStores')));
const ListStoreReceipts = Loadable(lazy(() => import('../views/works/StoreReceipt/ListStoreReceipt')));
const ListStoreReceiptInvoice = Loadable(lazy(() => import('../views/works/store-receipt-invoice/ListStoreReceiptInvoice')));
const ListBetweenStoreReceipt = Loadable(lazy(() => import('../views/works/list-between-store-receipt/ListBetweenStoreReceipt')));
const ListBetweenWarehouseDispatch = Loadable(lazy(() => import('../views/warehouse/list-warehouse/ListBetweenWarehouseDispatch')));
const ListBetweenReceipt = Loadable(lazy(() => import('../views/warehouse/list-between-receipt/ListBetweenReceipt')));
const ListProjects = Loadable(lazy(() => import('../views/project/list-projects/ListProjects')));
const ListBetweenStoreDispatch = Loadable(lazy(() => import('../views/works/store/ListBetweenStoreDispatch')));
const ListStoreDispatch = Loadable(lazy(() => import('../views/works/store/ListStoreDistpach')));
const ListStoreDispatchToCenter = Loadable(lazy(() => import('../views/works/storedispatchtocenter/ListStoreDispatchToCenter')));
const ListStoreDispatchReturnToCenter = Loadable(lazy(() => import('../views/works/storedispatchreturntocenter/ListStoreDispatchReturnToCenter')));
const ListProjectPlanning = Loadable(lazy(() => import('../views/project/list-project-planing/ListProjectPlaning')));
const ListProjectPlanningImplementation = Loadable(lazy(() => import('../views/project/list-project-planning-implementation/ListProjectPlanningImplementation')));
const ListSetProjectPlanningImplementation = Loadable(lazy(() => import('../views/project/list-set-project-planning-implementation/ListSetProjectPlanningImplementation')));
const ProjectPlanningImplementationReport = Loadable(lazy(() => import('../views/project/project-planning-implementation-report/ProjectPlanningImplementationReport')));
const ListPosition = Loadable(lazy(() => import('../views/humanresources/position/ListPosition')));
const ListPersonnel = Loadable(lazy(() => import('../views/humanresources/personnel/ListPersonnel')));
const ListLeaves = Loadable(lazy(() => import('../views/humanresources/leaves/ListLeaves')));
const ListReceiptsSendedFromStore = Loadable(lazy(() => import('../views/warehouse/list-receipts-sended-from-store/ListReceiptsSendedFromStore')));
const ListReceiptsDestructionSendedFromStore = Loadable(lazy(() => import('../views/warehouse/list-receipts-destruction-sended-from-store/ListReceiptsDestructionSendedFromStore')));
const ListPersonnelWorkPlaces = Loadable(lazy(() => import('../views/humanresources/personnel-work-places/ListPersonnelWorkPlaces')));
const ListPersonnelWorkPlacesByWorkhouse = Loadable(lazy(() => import('../views/humanresources/personnel-work-places/ListPersonnelWorkPlacesByWorkhouse')));
const RequestTabs = Loadable(lazy(() => import('../views/works/list-request/RequestTabs')));
const RequestReceiptTabs = Loadable(lazy(() => import('../views/works/list-request-receipt/RequestReceiptTabs')));
const ListRollCalls = Loadable(lazy(() => import('../views/works/list-roll-calls/ListRollCalls')));
const ListConsignments = Loadable(lazy(() => import('../views/humanresources/Consignments/ListConsignments')));
const ListPersonnelConsigneds = Loadable(lazy(() => import('../views/humanresources/PersonnelConsigneds/ListPersonnelConsigneds')));
const ListCarWarehouse = Loadable(lazy(() => import('../views/carwarehouse/list-carwarehouse/ListCareWarehouse')));
const ListDetailsCarWarehouse = Loadable(lazy(() => import('../views/carwarehouse/list-details-carwarehouse/ListDetailsCarWarehouse')));
const ListConsignedCarwarehouse = Loadable(lazy(() => import('../views/carwarehouse/consigned-carwarehouse/ListConsignedCarwarehouse')));
const ListCarFuels = Loadable(lazy(() => import('../views/carwarehouse/list-car-fuels/ListCarFuels')));
const ListTeachers = Loadable(lazy(() => import('../views/education/teachers/ListTeachers')));
const ListCourses = Loadable(lazy(() => import('../views/education/courses/ListCourses')));
const ListParticipationCertificate = Loadable(lazy(() => import('../views/education/participation-certificate/ListParticipationCertificate')));
const ListCommiteeMembers = Loadable(lazy(() => import('../views/report/commitee-members/ListCommiteeMembers')));
const ListCommiteeMembersReport = Loadable(lazy(() => import('../views/report/commitee-members-report/ListCommiteeMembersReport')));
const ListConcreteReport = Loadable(lazy(() => import('../views/report/concrete-report/ListConcreteReport')));
const ListItemReport = Loadable(lazy(() => import('../views/report/concrete-report/ListItemReport')));
const ListCarwarehouseReport = Loadable(lazy(() => import('../views/report/concrete-report/ListCarwarehouseReport')));
const ListPersonalWorkhouseReport = Loadable(lazy(() => import('../views/report/concrete-report/ListPersonalWorkhouseReport')));
const ListPersonalCourse = Loadable(lazy(() => import('../views/report/concrete-report/ListPersonalCourse')));
const ListTenderFlowReport = Loadable(lazy(() => import('../views/report/concrete-report/ListTenderFlowReport')));
const ListRollCallsReport = Loadable(lazy(() => import('../views/report/concrete-report/ListRollCallsReport')));
const ListFinancialState = Loadable(lazy(() => import('../views/report/concrete-report/ListFinancialState')));
const ListKPIList = Loadable(lazy(() => import('../views/report/concrete-report/ListKPIList')));







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

const Landingpage = Loadable(lazy(() => import('../views/pages/landingpage/Landingpage')));


const Router = [
  {
    path: '/',

    // element: (
    //   <PermissionGuard requiredOperationName="Görüntülemek">
    //     <FullLayout />
    //   </PermissionGuard>
    // ),
    element: (
      <FullLayout />
    ),
    children: [
      { path: '/', element: <Navigate to="/auth/login" /> },
      {
        path: '/dashboards/dashboard',
        exact: true,
        element: (
          // <PermissionGuard requiredOperationName="Görüntülemek">
            <ModernDash />
          // </PermissionGuard>
        )
      },
      {
        path: '/managmentusers/system-operation',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <SystemOperation />
          </PermissionGuard>
        )
      },
      {
        path: '/managmentusers/list-roles',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListRoles />
          </PermissionGuard>
        )
      },
      {
        path: '/managmentusers/list-users',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListUsers />
          </PermissionGuard>
        )
      },
      {
        path: '/baseinfo/list-categories',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCategory />
          </PermissionGuard>
        )
      },
      {
        path: '/baseinfo/list-units',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListUnit />
          </PermissionGuard>
        )
      },
      {
        path: '/baseinfo/list-items',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListItem />
          </PermissionGuard>
        )
      },
      {
        path: '/baseinfo/list-forcemajor',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListForceMajors />
          </PermissionGuard>
        )
      },
      {
        path: '/tender/list-tender',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListAuction />
          </PermissionGuard>
        )
      },
      {
        path: '/tender/tender-details/:tenderId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <AuctionDetails />
          </PermissionGuard>
        )
      },
      {
        path: '/tender/define-work/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWorks />
          </PermissionGuard>
        )
      },
      {
        path: '/work/:workId/networks',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListNetworks />
          </PermissionGuard>
        )
      },
      {
        path: '/network/list-network',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListNetworks />
          </PermissionGuard>
        )
      },
      {
        path: '/network/:networkId/details',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <NetworkDetails />
          </PermissionGuard>
        )
      },
      {
        path: '/workhouse/list-workhouse/:workId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWorkHouse />
          </PermissionGuard>
        )
      },
      {
        path: '/workhouse/list-workhouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWorkHouse />
          </PermissionGuard>
        )
      },
      {
        path: '/workhouse/workhousedetails/:workhouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <WorkHouseDetails />
          </PermissionGuard>
        )
      },
      {
        path: '/product-type/list-product-types/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProductTypes />
          </PermissionGuard>
        )
      },
      {
        path: '/transmission/list-transmission/:networkId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListTransmission />
          </PermissionGuard>
        )
      },
      {
        path: '/region/list-regions/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListRegion />
          </PermissionGuard>
        )
      },
      {
        path: '/warehouse/list-warehouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWarehouses />
          </PermissionGuard>
        )
      },
      {
        path: '/warehouse/list-warehouse-dispatch/:warehouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWarehousesDistpach />
          </PermissionGuard>
        )
      },
      {
        path: '/warehouse/list-warehouse-dispatch-return-to-center/:warehouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListWarehouseDispatchReturnToCenter />
          </PermissionGuard>
        )
      },
      {
        path: '/warehousespatch/betweenwarehusedispatch/:warehouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListBetweenWarehouseDispatch />
          </PermissionGuard>
        )
      },
      {
        path: '/order/list-order/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListOrders />
          </PermissionGuard>
        )
      },
      {
        path: '/driver/list-driver/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListDrivers />
          </PermissionGuard>
        )
      },
      {
        path: '/provider/list-provider/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProviders />
          </PermissionGuard>
        )
      },
      {
        path: '/invoice/list-invoice/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListInvoices />
          </PermissionGuard>
        )
      },
      {
        path: '/invoice/list-store-invoice/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreInvoice />
          </PermissionGuard>
        )
      },
      {
        path: '/receipt/list-receipt/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListReceipt />
          </PermissionGuard>
        )
      },
      {
        path: '/receipt/list-receipts-sended-from-store/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListReceiptsSendedFromStore />
          </PermissionGuard>
        )
      },
      {
        path: '/receipt/list-receipts-destruction-sended-from-store/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListReceiptsDestructionSendedFromStore />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-stores/:workhouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStores />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-stores/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStores />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-between-store-receipt/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListBetweenStoreReceipt />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-store-receipt/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreReceipts />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-store-receipt-invoice/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreReceiptInvoice />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-store-receipt/:storeId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreReceipts />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-store-dispatch-to-center/:storeId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreDispatchToCenter />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-store-dispatch-return-to-center/:storeId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreDispatchReturnToCenter />
          </PermissionGuard>
        )
      },
      {
        path: '/receipt/list-between-receipt/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListBetweenReceipt />
          </PermissionGuard>
        )
      },
      {
        path: '/project/list-projects/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProjects />
          </PermissionGuard>
        )
      },
      {
        path: '/project/project-planing/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProjectPlanning />
          </PermissionGuard>
        )
      },
      {
        path: '/project/project-planing/:projectId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProjectPlanning />
          </PermissionGuard>
        )
      },
      {
        path: '/project/project-planing-implementation/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListProjectPlanningImplementation />
          </PermissionGuard>
        )
      },
      {
        path: '/project/project-planing-implementation-report/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ProjectPlanningImplementationReport />
          </PermissionGuard>
        )
      },
      {
        path: '/project/set-project-planing-implementation/:dateId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListSetProjectPlanningImplementation />
          </PermissionGuard>
        )
      },
      {
        path: '/store/between-store-dispatch/:storeId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListBetweenStoreDispatch />
          </PermissionGuard>
        )
      },
      {
        path: '/store/store-dispatch/:storeId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListStoreDispatch />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/position/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPosition />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/personnal/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonnel />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/leaves/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListLeaves />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/personnel-work-places/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonnelWorkPlaces />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/personnel-work-places-by-workhouse/:workhouseId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonnelWorkPlacesByWorkhouse />
          </PermissionGuard>
        )
      },
      {
        path: '/store/list-requests/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <RequestTabs />
          </PermissionGuard>
        )
      },
      {
        path: '/order/list-request-receipt/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <RequestReceiptTabs />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/list-roll-calls/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListRollCalls />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/list-consignments/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListConsignments />
          </PermissionGuard>
        )
      },
      {
        path: '/hr/list-personal-consignments/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonnelConsigneds />
          </PermissionGuard>
        )
      },
      {
        path: '/care-warehouse/list-care-warehouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCarWarehouse />
          </PermissionGuard>
        )
      },
      {
        path: '/care-warehouse/list-details-care-warehouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListDetailsCarWarehouse />
          </PermissionGuard>
        )
      },
      {
        path: '/care-warehouse/list-consigned-care-warehouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListConsignedCarwarehouse />
          </PermissionGuard>
        )
      },
      {
        path: '/car-warehouse/list-car-fuels/:consignedCarId',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCarFuels />
          </PermissionGuard>
        )
      },
      {
        path: '/education/list-teachers/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListTeachers />
          </PermissionGuard>
        )
      },
      {
        path: '/education/list-courses/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCourses />
          </PermissionGuard>
        )
      },
      {
        path: '/education/list-participation-certificate/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListParticipationCertificate />
          </PermissionGuard>
        )
      },
      {
        path: '/report/commitee-members/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCommiteeMembers />
          </PermissionGuard>
        )
      },
      {
        path: '/report/commitee-members-report/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCommiteeMembersReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-concrete/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListConcreteReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-item/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListItemReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-carwarehouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListCarwarehouseReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-personall-workhouse/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonalWorkhouseReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-personall-course/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListPersonalCourse />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-tender-flow/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListTenderFlowReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-roll-call/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListRollCallsReport />
          </PermissionGuard>
        )
      },
      {
        path: '/report/report-financial-state-report/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListFinancialState />
          </PermissionGuard>
        )
      },
      {
        path: '/report/kpi-report/',
        element: (
          <PermissionGuard requiredOperationName="Görüntülemek">
            <ListKPIList />
          </PermissionGuard>
        )
      },
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
