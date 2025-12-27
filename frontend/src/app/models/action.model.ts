export interface Action {
  _id?: string;
  type: string;
  collection: string;
  readType: string;
  uid: string;
  companyId: string;
  count: number;
  host: string;
  id: string;
  created: number;
  removed: boolean;
}

export interface ActionResponse {
  success: boolean;
  data: Action;
}

export interface ActionsResponse {
  success: boolean;
  data: Action[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
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

