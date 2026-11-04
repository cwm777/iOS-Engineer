import { demoConfig } from '../data/config'

const locale = demoConfig.locale
const timeZone = demoConfig.timeZone

const numberFmt = new Intl.NumberFormat(locale)
const currencyFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const currencyCentsFmt = new Intl.NumberFormat(locale, { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const dateFmt = new Intl.DateTimeFormat(locale, { timeZone, day: '2-digit', month: '2-digit', year: 'numeric' })
const dateTimeFmt = new Intl.DateTimeFormat(locale, { timeZone, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
const timeFmt = new Intl.DateTimeFormat(locale, { timeZone, hour: '2-digit', minute: '2-digit' })
const dayTimeFmt = new Intl.DateTimeFormat(locale, { timeZone, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const monthFmt = new Intl.DateTimeFormat(locale, { timeZone, month: 'short', year: 'numeric' })

export function formatNumber(n: number, digits = 0): string {
  if (digits === 0) return numberFmt.format(Math.round(n))
  return new Intl.NumberFormat(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
}

export function formatCurrency(n: number, cents = false): string {
  return (cents ? currencyCentsFmt : currencyFmt).format(n)
}

export function formatPercent(n: number, digits = 1): string {
  return `${formatNumber(n, digits)}%`
}

export function formatDate(t: number): string {
  return dateFmt.format(t)
}

export function formatDateTime(t: number): string {
  return dateTimeFmt.format(t)
}

export function formatTime(t: number): string {
  return timeFmt.format(t)
}

export function formatDayTime(t: number): string {
  return dayTimeFmt.format(t)
}

export function formatMonth(t: number): string {
  return monthFmt.format(t)
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)} min`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (h < 24) return m > 0 ? `${h} h ${m} min` : `${h} h`
  const d = Math.floor(h / 24)
  return `${d} d ${h % 24} h`
}

export function formatRelative(t: number, now: number): string {
  const diffMin = Math.round((now - t) / 60000)
  if (diffMin < 1) return 'agora'
  if (diffMin < 60) return `há ${diffMin} min`
  const h = Math.floor(diffMin / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  return `há ${d} d`
}

export function formatUnit(value: number, unit: string, digits = 1): string {
  if (!unit) return formatNumber(value, Number.isInteger(value) ? 0 : digits)
  if (unit === '%') return formatPercent(value, Number.isInteger(value) ? 0 : digits)
  return `${formatNumber(value, Number.isInteger(value) ? 0 : digits)} ${unit}`
}
