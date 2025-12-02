export interface PaginationInfo {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface Cart {
  _id?: string;
  cashier: string | any;
  items: any[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  status: "active" | "completed" | "abandoned";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Category {
  _id?: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentCategory?: string | Category;
  active?: boolean;
  order?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Product {
  _id?: string;

  // Core identifiers
  sku?: string;
  product_id: string;
  reference?: string;

  // Barcodes
  ean?: string;
  ean13?: string;
  upc?: string;
  multi_ean?: string;

  // Product info
  name: string;
  description?: string;
  brand?: string;
  category?: string;

  // Pricing
  price: number;
  list_price?: number;
  currency?: string;

  // Inventory
  stock?: number;
  available?: boolean;

  // Images and URLs
  image_url?: string;
  local_image?: string;
  product_url?: string;

  // Store info
  store?: string;
  scraped_at?: Date;

  // POS specific fields
  minStock?: number;
  unit?: "unit" | "kg" | "g" | "l" | "ml" | "box";
  requiresScale?: boolean;
  taxRate?: number;
  cost?: number;
  provider?: string;
  active?: boolean;
  incompleteInfo?: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}

export interface User {
  id?: string;
  username: string;
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  role: "admin" | "manager" | "cashier" | "employee";
  phone?: string;
  active?: boolean;
  permissions?: string[];
  internalSalesLimit?: number;
  lastLogin?: Date;
  createdAt?: Date;
}

export interface Provider {
  _id?: string;
  code: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  taxId?: string;
  notes?: string;
  active?: boolean;
  paymentTerms?: "immediate" | "15days" | "30days" | "60days" | "90days";
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SaleItem {
  product?: string | Product;
  productName?: string;
  productCode?: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  discountAmount?: number;
  taxRate?: number;
  taxAmount?: number;
  subtotal: number;
  total: number;
}

export interface Sale {
  _id?: string;
  saleNumber?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal?: number;
  taxTotal?: number;
  total: number;
  paymentMethod: "cash" | "card" | "transfer" | "mixed";
  paymentDetails?: {
    cash?: number;
    card?: number;
    transfer?: number;
    change?: number;
  };
  cashier: string | User;
  customer?: {
    name?: string;
    email?: string;
    phone?: string;
    taxId?: string;
  };
  status?: "in_progress" | "completed" | "cancelled" | "refunded";
  cancellationReason?: string;
  cancelledBy?: string | User;
  cancelledAt?: Date;
  notes?: string;
  printTemplate?: string;
  isInternal?: boolean;
  approvedBy?: string | User;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PrintTemplate {
  _id?: string;
  name: string;
  description?: string;
  templateType?: "receipt" | "invoice" | "label";
  paperSize?: "80mm" | "58mm" | "A4" | "custom";
  customSize?: {
    width?: number;
    height?: number;
  };
  header?: {
    showLogo?: boolean;
    logoUrl?: string;
    storeName?: string;
    showStoreName?: boolean;
    storeNameSize?: string;
    storeNameFont?: string;
    storeNameBold?: boolean;
    storeAddress?: string;
    showStoreAddress?: boolean;
    storeAddressSize?: string;
    storeAddressFont?: string;
    storeAddressBold?: boolean;
    storePhone?: string;
    showStorePhone?: boolean;
    storePhoneSize?: string;
    storePhoneFont?: string;
    storePhoneBold?: boolean;
    storeEmail?: string;
    showStoreEmail?: boolean;
    storeEmailSize?: string;
    storeEmailFont?: string;
    storeEmailBold?: boolean;
    taxId?: string;
    customText?: string;
  };
  body?: {
    showProductCode?: boolean;
    showBarcode?: boolean;
    showQuantity?: boolean;
    showUnitPrice?: boolean;
    showDiscount?: boolean;
    showTax?: boolean;
    showSubtotal?: boolean;
    productSize?: string;
    productFont?: string;
    productBold?: boolean;
    fontSize?: "small" | "medium" | "large";
  };
  footer?: {
    showTotals?: boolean;
    showPaymentMethod?: boolean;
    showCashier?: boolean;
    showDateTime?: boolean;
    showBarcode?: boolean;
    customMessage?: string;
    showThankYou?: boolean;
    totalSize?: string;
    totalFont?: string;
    totalBold?: boolean;
    footerSize?: string;
    footerFont?: string;
    footerBold?: boolean;
  };
  styles?: {
    fontFamily?: string;
    primaryColor?: string;
    textAlign?: "left" | "center" | "right";
  };
  isDefault?: boolean;
  active?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
  weight?: number;
  subtotal: number;
}

export interface Register {
  _id?: string;
  registerNumber: string;
  openedBy: string | User;
  openedAt: Date;
  closedBy?: string | User;
  closedAt?: Date;
  openingCash: number;
  closingCash?: number;
  expectedCash?: number;
  cashDifference?: number;
  totalSales?: number;
  totalTransactions?: number;
  status: "open" | "closed";
  notes?: string;
  autoClosedAt?: Date;
  isAutoClose?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}
