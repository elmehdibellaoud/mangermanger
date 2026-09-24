import { api } from "./client";

export interface TodayReservation {
  id: number;
  client_id: number | null;
  name: string;
  time: string;
  guests: number;
  status: "PENDING" | "CONFIRMED" | "SEATED" | "CANCELLED";
}

export interface Table {
  id: number;
  number: number;
  capacity: number;
  status: "FREE" | "OCCUPIED" | "RESERVED";
  active_order_id: number | null;
  today_reservation: TodayReservation | null;
}

export interface ClientLite {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
}

export interface OrderItem {
  id: number;
  dish: number;
  dish_name: string;
  dish_prep_time: number;
  quantity: number;
  unit_price: string;
  notes: string;
  status: "PENDING" | "PREPARING" | "READY" | "SERVED";
}

export interface Order {
  id: number;
  table: number | null;
  table_number: number | null;
  client: number | null;
  server: number | null;
  server_email: string | null;
  status: "DRAFT" | "SENT" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
  status_display: string;
  total: string;
  discount: string;
  notes: string;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface PublicDish {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  prep_time: number;
}

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  display_order: number;
  dishes: PublicDish[];
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export const staffApi = {
  listTables: () => api.get<Table[]>("/staff/tables/").then((r) => r.data),
  publicMenu: () =>
    api.get<{ categories: PublicCategory[] }>("/public/menu/").then((r) => r.data.categories),

  // Orders — serveur
  listOrders: (params?: { mine?: boolean; status?: string }) =>
    api
      .get<Paginated<Order>>("/staff/orders/", {
        params: { ...(params?.mine ? { mine: 1 } : {}), ...(params?.status ? { status: params.status } : {}) },
      })
      .then((r) => r.data),
  getOrder: (id: number) => api.get<Order>(`/staff/orders/${id}/`).then((r) => r.data),
  createOrder: (payload: { table: number; client?: number | null; notes?: string }) =>
    api.post<Order>("/staff/orders/", payload).then((r) => r.data),
  attachClient: (orderId: number, clientId: number | null) =>
    api
      .patch<Order>(`/staff/orders/${orderId}/attach_client/`, { client: clientId })
      .then((r) => r.data),
  searchClients: (q: string) =>
    api.get<ClientLite[]>("/staff/clients/search/", { params: { q } }).then((r) => r.data),
  addItem: (orderId: number, payload: { dish: number; quantity: number; notes?: string }) =>
    api.post<OrderItem>(`/staff/orders/${orderId}/items/`, payload).then((r) => r.data),
  removeItem: (orderId: number, itemId: number) =>
    api.delete(`/staff/orders/${orderId}/items/${itemId}/`),
  sendOrder: (id: number) => api.patch<Order>(`/staff/orders/${id}/send/`).then((r) => r.data),
  serveOrder: (id: number) => api.patch<Order>(`/staff/orders/${id}/serve/`).then((r) => r.data),
  payOrder: (id: number) => api.patch<Order>(`/staff/orders/${id}/pay/`).then((r) => r.data),

  // KDS
  kdsOrders: () => api.get<Order[]>("/staff/kds/orders/").then((r) => r.data),
  kdsStartItem: (id: number) =>
    api.patch<OrderItem>(`/staff/kds/items/${id}/start/`).then((r) => r.data),
  kdsReadyItem: (id: number) =>
    api.patch<OrderItem>(`/staff/kds/items/${id}/ready/`).then((r) => r.data),
};
