export type Category = {
  id: string;
  label: string;
  icon: string;
};

export const WORK_CATEGORIES: Category[] = [
  { id: 'cat_01', label: 'Hospitality', icon: 'restaurant-outline' },
  { id: 'cat_02', label: 'Retail', icon: 'storefront-outline' },
  { id: 'cat_03', label: 'Events', icon: 'calendar-outline' },
  { id: 'cat_04', label: 'Warehousing', icon: 'cube-outline' },
  { id: 'cat_05', label: 'Delivery', icon: 'bicycle-outline' },
  { id: 'cat_06', label: 'Cleaning', icon: 'sparkles-outline' },
  { id: 'cat_07', label: 'Security', icon: 'shield-outline' },
  { id: 'cat_08', label: 'Admin & Office', icon: 'briefcase-outline' },
];
