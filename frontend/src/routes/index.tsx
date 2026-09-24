import { createBrowserRouter, Navigate } from "react-router-dom";
import { LandingPage } from "@/features/client/LandingPage";
import { MenuPage as PublicMenuPage } from "@/features/client/MenuPage";
import { DishDetailPage } from "@/features/client/DishDetailPage";
import { ReservationPage } from "@/features/client/ReservationPage";
import { PublicLayout } from "@/features/client/PublicLayout";
import { AccountLayout } from "@/features/client/AccountLayout";
import { AccountProfilePage } from "@/features/client/AccountProfilePage";
import { AccountOrdersPage } from "@/features/client/AccountOrdersPage";
import { AccountReservationsPage } from "@/features/client/AccountReservationsPage";
import { AccountReviewsPage } from "@/features/client/AccountReviewsPage";
import { AccountRecommendationsPage } from "@/features/client/AccountRecommendationsPage";
import { LoginPage } from "@/features/auth/LoginPage";
import { RegisterPage } from "@/features/auth/RegisterPage";
import { AdminLayout } from "@/features/admin/AdminLayout";
import { DashboardPage } from "@/features/admin/DashboardPage";
import { MenuPage } from "@/features/admin/MenuPage";
import { StockPage } from "@/features/admin/StockPage";
import { StaffPage } from "@/features/admin/StaffPage";
import { JobsPage } from "@/features/admin/JobsPage";
import { ReviewsPage } from "@/features/admin/ReviewsPage";
import { ReservationsPage as AdminReservationsPage } from "@/features/admin/ReservationsPage";
import { SentimentPlaygroundPage } from "@/features/admin/SentimentPlaygroundPage";
import { StaffLayout } from "@/features/staff/StaffLayout";
import { TablesPage } from "@/features/staff/TablesPage";
import { OrderTakingPage } from "@/features/staff/OrderTakingPage";
import { OrdersPage } from "@/features/staff/OrdersPage";
import { KdsPage } from "@/features/staff/KdsPage";
import { ProtectedRoute } from "./ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <PublicLayout />,
    children: [
      { index: true, element: <LandingPage /> },
      { path: "menu", element: <PublicMenuPage /> },
      { path: "menu/:id", element: <DishDetailPage /> },
      { path: "reservation", element: <ReservationPage /> },
      {
        path: "account",
        element: (
          <ProtectedRoute allow={["CLIENT", "GERANT"]}>
            <AccountLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <AccountProfilePage /> },
          { path: "orders", element: <AccountOrdersPage /> },
          { path: "reservations", element: <AccountReservationsPage /> },
          { path: "reviews", element: <AccountReviewsPage /> },
          { path: "recommendations", element: <AccountRecommendationsPage /> },
        ],
      },
    ],
  },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  {
    path: "/admin",
    element: (
      <ProtectedRoute allow={["GERANT"]}>
        <AdminLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "stock", element: <StockPage /> },
      { path: "staff", element: <StaffPage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "reviews", element: <ReviewsPage /> },
      { path: "reservations", element: <AdminReservationsPage /> },
      { path: "sentiment-playground", element: <SentimentPlaygroundPage /> },
    ],
  },
  {
    path: "/staff",
    element: (
      <ProtectedRoute allow={["SERVEUR", "CUISINIER", "GERANT"]}>
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/staff/tables" replace /> },
      { path: "tables", element: <TablesPage /> },
      { path: "tables/:tableId", element: <OrderTakingPage /> },
      { path: "orders", element: <OrdersPage /> },
      { path: "kds", element: <KdsPage /> },
    ],
  },
]);
