import { api } from "./client";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// ===== Menu =====
export interface Category {
  id: number;
  name: string;
  slug: string;
  display_order: number;
}

export interface Ingredient {
  id: number;
  name: string;
  unit: "kg" | "L" | "unit";
  cost_per_unit: string;
}

export interface DishIngredient {
  id?: number;
  ingredient: number;
  ingredient_name?: string;
  unit?: string;
  quantity: string;
}

export interface Dish {
  id: number;
  name: string;
  description: string;
  price: string;
  category: number;
  category_name?: string;
  image: string | null;
  is_available: boolean;
  prep_time: number;
  dish_ingredients?: DishIngredient[];
}

export const menuApi = {
  listCategories: () => api.get<Paginated<Category>>("/admin/categories/").then((r) => r.data),
  createCategory: (p: Partial<Category>) => api.post<Category>("/admin/categories/", p).then((r) => r.data),
  updateCategory: (id: number, p: Partial<Category>) =>
    api.patch<Category>(`/admin/categories/${id}/`, p).then((r) => r.data),
  deleteCategory: (id: number) => api.delete(`/admin/categories/${id}/`),

  listIngredients: () =>
    api.get<Paginated<Ingredient>>("/admin/ingredients/", { params: { page_size: 100 } }).then((r) => r.data),
  createIngredient: (p: Partial<Ingredient>) =>
    api.post<Ingredient>("/admin/ingredients/", p).then((r) => r.data),

  listDishes: () => api.get<Paginated<Dish>>("/admin/dishes/").then((r) => r.data),
  createDish: (formData: FormData) =>
    api.post<Dish>("/admin/dishes/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  updateDish: (id: number, formData: FormData) =>
    api.patch<Dish>(`/admin/dishes/${id}/`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  deleteDish: (id: number) => api.delete(`/admin/dishes/${id}/`),
};

// ===== Stock =====
export interface StockItem {
  id: number;
  ingredient: number;
  ingredient_name: string;
  unit: string;
  quantity: string;
  threshold_low: string;
  is_low: boolean;
  updated_at: string;
}

export interface StockMovement {
  id: number;
  ingredient: number;
  ingredient_name: string;
  type: "IN" | "OUT" | "ADJUST";
  type_display: string;
  quantity: string;
  reason: string;
  created_at: string;
}

export const stockApi = {
  list: () => api.get<StockItem[]>("/admin/stock/").then((r) => r.data),
  addMovement: (p: { ingredient: number; type: string; quantity: string; reason?: string }) =>
    api.post<StockMovement>("/admin/stock-movements/", p).then((r) => r.data),
};

// ===== Staff =====
export interface Employee {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: "SERVEUR" | "CUISINIER" | "GERANT";
  is_active: boolean;
  date_joined: string;
}

export const staffApi = {
  list: () => api.get<Paginated<Employee>>("/admin/employees/").then((r) => r.data),
  create: (p: Partial<Employee> & { password: string }) =>
    api.post<Employee>("/admin/employees/", p).then((r) => r.data),
  update: (id: number, p: Partial<Employee>) =>
    api.patch<Employee>(`/admin/employees/${id}/`, p).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/employees/${id}/`),
};

export interface Schedule {
  id: number;
  employee: number;
  employee_name: string;
  employee_email: string;
  date: string;
  shift_start: string;
  shift_end: string;
  role: string;
}

export const schedulesApi = {
  list: (weekStart?: string, weekEnd?: string) =>
    api.get<Paginated<Schedule>>("/admin/schedules/", {
      params: weekStart && weekEnd ? { week_start: weekStart, week_end: weekEnd } : {},
    }).then((r) => r.data),
  create: (p: Omit<Schedule, "id" | "employee_name" | "employee_email">) =>
    api.post<Schedule>("/admin/schedules/", p).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/schedules/${id}/`),
};

// ===== Jobs =====
export interface JobOffer {
  id: number;
  title: string;
  description: string;
  requirements: string;
  is_active: boolean;
  applications_count: number;
  created_at: string;
}

export interface JobApplication {
  id: number;
  offer: number;
  offer_title: string;
  candidate_name: string;
  email: string;
  phone: string;
  cv: string;
  cover_letter: string;
  status: "NEW" | "REVIEWED" | "REJECTED" | "HIRED";
  created_at: string;
}

export const jobsApi = {
  listOffers: () => api.get<Paginated<JobOffer>>("/admin/job-offers/").then((r) => r.data),
  createOffer: (p: Partial<JobOffer>) => api.post<JobOffer>("/admin/job-offers/", p).then((r) => r.data),
  updateOffer: (id: number, p: Partial<JobOffer>) =>
    api.patch<JobOffer>(`/admin/job-offers/${id}/`, p).then((r) => r.data),
  listApplications: () =>
    api.get<Paginated<JobApplication>>("/admin/job-applications/").then((r) => r.data),
  updateApplication: (id: number, p: Partial<JobApplication>) =>
    api.patch<JobApplication>(`/admin/job-applications/${id}/`, p).then((r) => r.data),
};

// ===== Reviews =====
export interface Review {
  id: number;
  client: number | null;
  client_email: string;
  dish: number;
  dish_name: string;
  rating: number;
  comment: string;
  is_approved: boolean;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  sentiment_score: number | null;
  analyzed_at: string | null;
  created_at: string;
}

export const reviewsApi = {
  list: (sentiment?: string) =>
    api.get<Paginated<Review>>("/admin/reviews/", {
      params: sentiment ? { sentiment } : {},
    }).then((r) => r.data),
  approve: (id: number) => api.post<Review>(`/admin/reviews/${id}/approve/`).then((r) => r.data),
  reject: (id: number) => api.post<Review>(`/admin/reviews/${id}/reject/`).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/reviews/${id}/`),
  sentimentStats: () => api.get("/admin/reviews/sentiment-stats/").then((r) => r.data),
};

export interface SentimentPrediction {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE";
  score: number;
  backend: "huggingface" | "keyword";
}

export const sentimentApi = {
  predict: (text: string) =>
    api.post<SentimentPrediction>("/admin/sentiment/predict/", { text }).then((r) => r.data),
};

// ===== Reservations (admin) =====
export interface AdminReservation {
  id: number;
  client: number | null;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  date: string;
  time: string;
  guests: number;
  table: number | null;
  table_number: number | null;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "SEATED";
  status_display: string;
  notes: string;
  created_at: string;
}

export interface ClientLite {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
}

export const reservationsApi = {
  list: (filters?: { status?: string; date_from?: string; date_to?: string }) =>
    api
      .get<Paginated<AdminReservation>>("/admin/reservations/", { params: filters })
      .then((r) => r.data),
  create: (p: Partial<AdminReservation>) =>
    api.post<AdminReservation>("/admin/reservations/", p).then((r) => r.data),
  update: (id: number, p: Partial<AdminReservation>) =>
    api.patch<AdminReservation>(`/admin/reservations/${id}/`, p).then((r) => r.data),
  remove: (id: number) => api.delete(`/admin/reservations/${id}/`),
  confirm: (id: number) =>
    api.post<AdminReservation>(`/admin/reservations/${id}/confirm/`).then((r) => r.data),
  cancel: (id: number) =>
    api.post<AdminReservation>(`/admin/reservations/${id}/cancel/`).then((r) => r.data),
  seat: (id: number) =>
    api.post<AdminReservation>(`/admin/reservations/${id}/seat/`).then((r) => r.data),
};

export const clientsApi = {
  search: (q: string) =>
    api.get<ClientLite[]>("/staff/clients/search/", { params: { q } }).then((r) => r.data),
};

// ===== Dashboard =====
export interface DashboardStats {
  revenue: { last_7d: string; last_30d: string; last_year: string };
  orders: { total: number; paid: number; in_progress: number };
  revenue_by_day: { day: string; total: string }[];
  top_dishes: { id: number; name: string; sold: number }[];
  counts: { dishes: number; dishes_available: number; reviews: number };
}

export const dashboardApi = {
  stats: () => api.get<DashboardStats>("/admin/dashboard/stats/").then((r) => r.data),
  reviews: () => api.get("/admin/dashboard/reviews/").then((r) => r.data),
};
