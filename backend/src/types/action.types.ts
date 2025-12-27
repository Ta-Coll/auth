export interface Action {
  _id?: string;
  type: string;
  collection: string;
  readType: string;
  uid: string;
  companyId: string;
  count: number;
  host: string;
  id: string; // Document ID
  created: number; // Timestamp in milliseconds
  removed: boolean;
}

export interface CreateActionRequest {
  type: string;
  collection: string;
  readType?: string;
  uid: string;
  companyId: string;
  count?: number;
  host: string;
  id: string;
  created?: number;
  removed?: boolean;
}

export interface ActionsResponse {
  success: boolean;
  data: Action[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ActionResponse {
  success: boolean;
  data: Action;
}

export interface BillingSummary {
  companyId: string;
  totalSum: number;
  documentCount: number;
  period: {
    fromDate: number;
    toDate: number;
  };
}

export interface BillingSummaryResponse {
  success: boolean;
  data: BillingSummary | BillingSummary[];
  period?: {
    fromDate: number;
    toDate: number;
  };
}

