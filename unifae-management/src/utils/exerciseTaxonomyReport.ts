/** Linha vinda da API em `items[].exerciseTaxonomy`. */
export type ExerciseTaxonomyRow = {
  clinicalCaseName: string | null
  typeLabel: string
  typeKey: string
  categoryName: string
}

export type TaxonomyReportBlock = {
  /** Rótulo do caso clínico; `null` indica ausência de caso no cadastro. */
  clinicalCaseName: string | null
  lines: { typeLabel: string; categoriesText: string }[]
}

/**
 * Agrupa a taxonomia do exercício para exibição uniforme: um bloco por caso clínico,
 * e por tipo (ex.: "Nível / progressão") lista os valores de categoria únicos, separados por vírgula.
 * Remove linhas duplicadas (mesmo caso + tipo + categoria).
 */
export function buildTaxonomyReportGroups(rows: ExerciseTaxonomyRow[] | undefined | null): TaxonomyReportBlock[] {
  if (!rows?.length) return []

  const seen = new Set<string>()
  const unique: ExerciseTaxonomyRow[] = []
  for (const r of rows) {
    const cat = (r.categoryName ?? '').trim()
    const key = `${r.clinicalCaseName ?? ''}\t${r.typeKey}\t${cat}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push({ ...r, categoryName: cat || '—' })
  }

  const byCase = new Map<string | null, Map<string, Set<string>>>()
  for (const r of unique) {
    const c = r.clinicalCaseName?.trim() ? r.clinicalCaseName.trim() : null
    if (!byCase.has(c)) byCase.set(c, new Map())
    const tm = byCase.get(c)!
    const tl = (r.typeLabel ?? '').trim() || '—'
    if (!tm.has(tl)) tm.set(tl, new Set())
    tm.get(tl)!.add(r.categoryName)
  }

  /** Ordem clínica usual para níveis (não alfabética). Demais rótulos ficam por ordem alfabética após estes. */
  function progressionRank(name: string): number | null {
    const n = name
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
    if (n === 'iniciante') return 0
    if (n === 'intermediario') return 1
    if (n === 'avancado') return 2
    return null
  }

  function sortCategoryNames(a: string, b: string): number {
    const ra = progressionRank(a)
    const rb = progressionRank(b)
    if (ra !== null && rb !== null) return ra - rb
    if (ra !== null) return -1
    if (rb !== null) return 1
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  }

  const caseKeys = [...byCase.keys()].sort((a, b) => {
    if (a == null && b == null) return 0
    if (a == null) return 1
    if (b == null) return -1
    return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' })
  })

  const out: TaxonomyReportBlock[] = []
  for (const ck of caseKeys) {
    const tm = byCase.get(ck)!
    const lines: { typeLabel: string; categoriesText: string }[] = []
    const typeLabels = [...tm.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }))
    for (const tl of typeLabels) {
      const cats = [...tm.get(tl)!].sort(sortCategoryNames)
      lines.push({ typeLabel: tl, categoriesText: cats.join(', ') })
    }
    out.push({ clinicalCaseName: ck, lines })
  }
  return out
}
