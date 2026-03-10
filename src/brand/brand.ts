// src/brand/brand.ts
//
// Skein fork branding overlay.
// Keep upstream attribution (GPLv3) while making UI strings coherent and English-first.
//
export const BRAND = Object.freeze({
  name: "Skein",
  slug: "skein",
  tagline: "Turn AI chats into searchable knowledge",
  geckoId: "skein@effusionlabs.com",
  nativeHostName: "com.effusionlabs.skein.indexer",
  upstreamAttribution: "Based on Ophel Atlas by urzeye (GPLv3).",
})

export const BRAND_NAME = BRAND.name
export const BRAND_SLUG = BRAND.slug
export const BRAND_TAGLINE = BRAND.tagline
export const GECKO_ID = BRAND.geckoId
export const NATIVE_HOST_NAME = BRAND.nativeHostName
export const UPSTREAM_ATTR = BRAND.upstreamAttribution
