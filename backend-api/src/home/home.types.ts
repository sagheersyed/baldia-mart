import { Banner } from '../banners/banner.entity';
import { Brand } from '../brands/brand.entity';
import { Category } from '../categories/category.entity';
import { Product } from '../products/product.entity';

export type HomeSectionLayout = 'horizontal' | 'grid-2' | 'grid-3';

export type HomeSectionType =
  | 'deals'
  | 'flash-sale'
  | 'best_sellers'
  | 'featured'
  | 'newest'
  | 'budget'
  | 'category';

export interface HomeViewAllDescriptor {
  type: HomeSectionType;
  id?: string;
  maxPrice?: number;
}

export interface HomeSection {
  id: string;
  title: string;
  subtitle?: string;
  type: HomeSectionType;
  layout: HomeSectionLayout;
  viewAll?: HomeViewAllDescriptor;
  categoryId?: string;
  products: Product[];
}

export interface HomePayload {
  section: 'mart' | 'food' | 'pharma';
  zoneId: string | null;
  generatedAt: string;
  banners: Banner[];
  categories: Category[];
  brands: Brand[];
  rashanEnabled: boolean;
  trending: string[];
  sections: HomeSection[];
}
