import { api } from "./client";

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

export interface DishReview {
  id: number;
  client: string;
  rating: number | null;
  comment: string;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  created_at: string;
}

export interface DishDetail {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  prep_time: number;
  category: { id: number; name: string };
  rating_average: number;
  rating_count: number;
  can_review: boolean;
  already_reviewed: boolean;
  reviews: DishReview[];
}

export interface Reservation {
  id: number;
  guest_name: string;
  guest_email: string;
  guest_phone?: string;
  date: string;
  time: string;
  guests: number;
  table_number: number | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "SEATED";
  status_display: string;
  notes: string;
  created_at: string;
}

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface Recommendation {
  id: number;
  name: string;
  description: string;
  price: string;
  image: string | null;
  category: string;
  score: number;
}

export const publicApi = {
  menu: () =>
    api.get<{ categories: PublicCategory[] }>("/public/menu/").then((r) => r.data.categories),
  dish: (id: number | string) => api.get<DishDetail>(`/public/dishes/${id}/`).then((r) => r.data),
  similarDishes: (id: number | string) =>
    api
      .get<{ results: Recommendation[] }>(`/public/dishes/${id}/similar/`)
      .then((r) => r.data.results),
  reservations: {
    create: (payload: {
      guest_name?: string;
      guest_email?: string;
      guest_phone?: string;
      date: string;
      time: string;
      guests: number;
      notes?: string;
    }) => api.post<Reservation>("/public/reservations/", payload).then((r) => r.data),
    availability: (date: string, time: string, guests: number) =>
      api
        .get<{ available: boolean; capacity: number | null }>("/public/availability/", {
          params: { date, time, guests },
        })
        .then((r) => r.data),
  },
};

// Client (authenticated)
export interface ClientProfile {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  birth_date: string | null;
}

export interface ClientOrder {
  id: number;
  table_number: number | null;
  status: string;
  status_display: string;
  total: string;
  items: { id: number; dish_name: string; quantity: number; unit_price: string }[];
  created_at: string;
}

export interface ClientReview {
  id: number;
  dish: number;
  dish_name: string;
  rating: number | null;
  comment: string;
  sentiment: string | null;
  created_at: string;
}

export const clientApi = {
  profile: () => api.get<ClientProfile>("/client/profile/").then((r) => r.data),
  updateProfile: (p: Partial<ClientProfile>) =>
    api.patch<ClientProfile>("/client/profile/", p).then((r) => r.data),
  orders: () => api.get<Paginated<ClientOrder>>("/client/orders/").then((r) => r.data),
  reservations: () =>
    api.get<Paginated<Reservation>>("/client/reservations/").then((r) => r.data),
  listReviews: () =>
    api.get<Paginated<ClientReview>>("/client/reviews/").then((r) => r.data),
  createReview: (p: { dish: number; comment: string }) =>
    api.post<ClientReview>("/client/reviews/", p).then((r) => r.data),
  validatePromo: (code: string, order_total: string) =>
    api
      .post<{
        valid: boolean;
        discount?: string;
        final_total?: string;
        detail?: string;
      }>("/client/promo/validate/", { code, order_total })
      .then((r) => r.data),
  loyalty: () =>
    api
      .get<{ points: number; total_spent: string }>("/client/loyalty/")
      .then((r) => r.data),
  recommendations: () =>
    api
      .get<{ results: Recommendation[] }>("/client/recommendations/")
      .then((r) => r.data.results),
};

export async function registerClient(p: {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}) {
  const { data } = await api.post("/auth/register/", p);
  return data;
}
