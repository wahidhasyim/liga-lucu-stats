export const EMAS = '#c9a24d'

const WARNA_TIM: [RegExp, string][] = [
  [/merah muda|pink/, '#e93d82'],
  [/merah|red/, '#e5484d'],
  [/biru|blue/, '#3e8ef7'],
  [/kuning|yellow/, '#f5d90a'],
  [/hijau|green/, '#30a46c'],
  [/oranye|orange|jingga/, '#f76b15'],
  [/ungu|purple/, '#8e4ec6'],
  [/putih|white/, '#f4f1ea'],
  [/hitam|black/, '#5c5c5c'],
  [/abu|grey|gray/, '#9b9b9b'],
]

// Warna aksen dari nama tim ("Tim Merah" → merah); selain itu emas.
export const warnaTim = (nama: string) => WARNA_TIM.find(([re]) => re.test(nama.toLowerCase()))?.[1] ?? EMAS

// "Tim Merah" → "tim-merah", untuk nama file gambar.
export const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'tim'
