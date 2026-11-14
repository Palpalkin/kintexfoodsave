export type Space = { id: string; name: string; invite_code: string; owner_id: string }
export type Product = {
  id: string; space_id: string; name: string; category: string | null
  quantity: number; unit: string; location: string | null
  expires_on: string | null; produced_on: string | null; notes: string | null; photo_path: string | null; price?: number | null; photo_url?: string | null; brand?: string | null; barcode?: string | null
  status: 'active' | 'consumed' | 'discarded'
}
export type Ingredient = { name: string; amount?: string }
export type Recipe = {
  id: string; space_id: string; title: string
  ingredients: Ingredient[]; instructions: string; source: 'manual' | 'ai'
}

export type ShoppingItem = { id: string; space_id: string; name: string; quantity: number; unit: string; checked: boolean }
