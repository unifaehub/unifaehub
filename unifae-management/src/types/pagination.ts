export type Paged<T> = {
  data: T[]
  total: number
  page: number
  limit: number
}
