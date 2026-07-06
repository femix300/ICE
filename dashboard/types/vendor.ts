export interface Vendor {
  id: string;
  merchant_id: string;
  name: string;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  va_status: 'pending' | 'active' | 'suspended';
  created_at: string | Date;
  updated_at: string | Date;
}