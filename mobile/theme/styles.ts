import { tokens } from './tokens'

export const ui = {
  screen: {
    flex: 1,
    backgroundColor: tokens.color.background,
  },
  page: {
    padding: 16,
    gap: 12,
    paddingBottom: 28,
  },
  card: {
    backgroundColor: tokens.color.card,
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.xl,
    padding: 14,
    gap: 10,
  },
  title: {
    color: tokens.color.foreground,
    fontSize: tokens.text.h1,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: tokens.color.mutedForeground,
    marginTop: 6,
  },
  sectionTitle: {
    color: tokens.color.foreground,
    fontWeight: '700' as const,
    fontSize: tokens.text.h3,
  },
  muted: {
    color: tokens.color.mutedForeground,
  },
  value: {
    color: tokens.color.foreground,
    fontWeight: '600' as const,
  },
  chip: {
    borderColor: tokens.color.border,
    borderWidth: 1,
    borderRadius: tokens.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: tokens.color.secondary,
  },
  chipOn: {
    backgroundColor: tokens.color.primary,
    borderColor: tokens.color.ring,
  },
  chipText: {
    color: tokens.color.secondaryForeground,
    fontSize: 12,
    fontWeight: '600' as const,
  },
  chipTextOn: {
    color: tokens.color.primaryForeground,
  },
  primaryButton: {
    alignItems: 'center' as const,
    backgroundColor: tokens.color.primary,
    borderRadius: tokens.radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  primaryButtonText: {
    color: tokens.color.primaryForeground,
    fontWeight: '700' as const,
    fontSize: 15,
  },
  dangerButton: {
    alignItems: 'center' as const,
    backgroundColor: tokens.color.destructive,
    borderRadius: tokens.radius.lg,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  dangerButtonText: {
    color: tokens.color.destructiveForeground,
    fontWeight: '700' as const,
  },
} as const
