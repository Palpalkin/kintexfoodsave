export type Space = { id: string; name: string; invite_code: string; owner_id: string }
export type Product = {
  id: string; space_id: string; name: string; category: string | null
  quantity: number; unit: string; location: string | null
  expires_on: string | null; produced_on: string | null; notes: string | null; photo_path: string | null
  status: 'active' | 'consumed' | 'discarded'
}
export type Ingredient = { name: string; amount?: string }
export type Recipe = {
  id: string; space_id: string; title: string
  ingredients: Ingredient[]; instructions: string; source: 'manual' | 'ai'
}
