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

/** A single authenticated user session stored in the browser. */
export interface SessionEntry {
  token: string;
  user: User;
}

/** Global application settings stored in the backend. */
export interface AppSettings {
  estimatedCostEnabled: boolean;
  estimatedCostMarginPercent: number;
  sellMode: "combined" | "split";
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
  barcode_standard?: string;

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
  quickAccess?: string[];
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
  paymentMethod: "cash" | "card" | "transfer" | "mixed" | "internal";
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
  customName?: string;
}

export interface Register {
  _id?: string;
  registerNumber: string;
  deviceId?: string;
  deviceName?: string;
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
  printReceiptsEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TicketItem {
  product?: string | Product;
  productName: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export type TicketStatus =
  | "pending"
  | "in_checkout"
  | "completed"
  | "cancelled";

export interface Ticket {
  _id?: string;
  ticketNumber?: number;
  items: TicketItem[];
  subtotal: number;
  discount?: number;
  total: number;
  status: TicketStatus;
  notes?: string;
  createdBy?: string | User;
  cashier?: string | User;
  sale?: string | Sale;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShoppingItem {
  product?: string;
  productName: string;
  quantity: number;
  purchased?: boolean;
  purchasedAt?: Date;
}

export type ShoppingListStatus = "active" | "completed" | "archived";

export interface ShoppingList {
  _id?: string;
  name: string;
  items: ShoppingItem[];
  createdBy?: string | User;
  weekday?: number;
  status?: ShoppingListStatus;
  completedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ShoppingRecommendation {
  productName: string;
  frequency: number;
}

// ---------------------------------------------------------------------------
// Purchase Receipts (Invoice Scanner / Stock Import)
// ---------------------------------------------------------------------------

export interface ParsedInvoiceItem {
  description: string;
  noIdentificacion?: string | null;
  barcode?: string | null;
  quantity: number;
  unitCost: number;
  total: number;
  included: boolean;
}

export interface ParsedInvoice {
  items: ParsedInvoiceItem[];
  totals: { subtotal: number; tax: number; total: number };
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  providerRfc?: string | null;
  providerName?: string | null;
  fileType?: string;
  storagePath?: string;
  originalFilename?: string;
  visionUnavailable?: boolean;
}

export interface ConfirmedItem extends ParsedInvoiceItem {
  matchedProduct?: string | Product | null; // Product _id or populated Product
  createNew?: boolean;
}

export interface PurchaseReceiptItem {
  description: string;
  noIdentificacion?: string;
  barcode?: string;
  quantity: number;
  unitCost: number;
  total: number;
  included: boolean;
  matchedProduct?: string | Product | null;
  createNew?: boolean;
}

export interface PurchaseReceipt {
  _id?: string;
  provider: string | Provider;
  originalFilename: string;
  fileType: "image" | "pdf" | "excel" | "xml" | "camera";
  storagePath?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  providerRfc?: string | null;
  providerName?: string | null;
  parsedItems: PurchaseReceiptItem[];
  totals: { subtotal: number; tax: number; total: number };
  status: "pending" | "reviewed" | "applied";
  appliedAt?: Date;
  appliedBy?: string | User | null;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface PurchaseReceiptPayload {
  providerId: string;
  originalFilename: string;
  fileType: string;
  storagePath?: string;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  providerRfc?: string | null;
  providerName?: string | null;
  totals?: { subtotal: number; tax: number; total: number };
  confirmedItems: ConfirmedItem[];
  notes?: string;
}
