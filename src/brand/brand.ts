// Fork branding overlay (keep small + stable for upstream rebases)

export const BRAND_NAME = "Ophel Vault" as const
export const BRAND_TAGLINE = "Turn AI chats into navigable documents + a local knowledge vault" as const
export const UPSTREAM_ATTR = "Based on Ophel Atlas by urzeye (GPLv3)" as const

export const BRAND_SLUG = "ophel-vault" as const
export const GECKO_ID = "ophel-vault@effusionlabs.com" as const

// Firefox Native Messaging host name (stable, lowercase-ish)
export const NATIVE_HOST_NAME = (
  "com." + BRAND_SLUG.replace(/[^a-z0-9_-]/gi, "-").toLowerCase() + ".vault"
) as const

export const BRAND = {
  NAME: BRAND_NAME,
  TAGLINE: BRAND_TAGLINE,
  SLUG: BRAND_SLUG,
  GECKO_ID,
  NATIVE_HOST_NAME,
  ATTRIBUTION: UPSTREAM_ATTR
} as const
