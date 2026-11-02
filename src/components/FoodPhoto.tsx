import { useState } from 'react'
import { Skewer } from '@/components/Skewer'
import type { MenuItem } from '@/lib/menu'

interface FoodPhotoProps {
  item: Pick<MenuItem, 'image' | 'name' | 'tone'>
  className?: string
  /** CSS object-position, to keep the food in frame when cropped. */
  position?: string
  priority?: boolean
}

/** Real photo of the dish; falls back to the illustration if the file cannot load. */
export function FoodPhoto({ item, className, position = 'center', priority }: FoodPhotoProps) {
  const [failed, setFailed] = useState(false)
  if (failed) return <Skewer tone={item.tone} className={className} />
  return (
    <img
      src={item.image}
      alt={`${item.name}, grilled over charcoal`}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      onError={() => setFailed(true)}
      className={className}
      style={{ objectFit: 'cover', objectPosition: position }}
    />
  )
}
