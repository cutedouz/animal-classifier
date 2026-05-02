'use client'

import { useEffect, useState } from 'react'

type ZoomImage = {
  src: string
  alt: string
}

function isAnimalImage(img: HTMLImageElement) {
  const src = img.getAttribute('src') || img.currentSrc || ''
  return src.includes('/animals/')
}

function getAbsoluteSrc(img: HTMLImageElement) {
  const src = img.currentSrc || img.src || img.getAttribute('src') || ''
  try {
    return new URL(src, window.location.origin).toString()
  } catch {
    return src
  }
}

export default function AnimalImageLightbox() {
  const [zoomImage, setZoomImage] = useState<ZoomImage | null>(null)

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return

      const img = target.closest('img')
      if (!(img instanceof HTMLImageElement)) return
      if (!isAnimalImage(img)) return

      event.preventDefault()
      event.stopPropagation()

      setZoomImage({
        src: getAbsoluteSrc(img),
        alt: img.alt || '動物圖片',
      })
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setZoomImage(null)
    }

    document.addEventListener('click', handleClick, true)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('click', handleClick, true)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!zoomImage) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [zoomImage])

  return (
    <>
      <style jsx global>{`
        img[src*="/animals/"] {
          cursor: zoom-in;
        }
      `}</style>

      {zoomImage ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/85 p-3 md:p-6"
          role="dialog"
          aria-modal="true"
          aria-label="動物圖片放大檢視"
          onClick={() => setZoomImage(null)}
        >
          <div
            className="relative flex max-h-full w-full max-w-6xl flex-col items-center gap-3"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white/95 px-4 py-3 shadow-lg">
              <div className="min-w-0">
                <div className="truncate text-sm font-black text-gray-900">
                  {zoomImage.alt}
                </div>
                <div className="text-xs text-gray-500">
                  點擊黑色背景或按 Esc 可關閉
                </div>
              </div>

              <button
                type="button"
                onClick={() => setZoomImage(null)}
                className="shrink-0 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white"
              >
                關閉
              </button>
            </div>

            <div className="flex max-h-[calc(100vh-112px)] w-full items-center justify-center overflow-hidden rounded-3xl bg-white/10 p-2 shadow-2xl">
              <img
                src={zoomImage.src}
                alt={zoomImage.alt}
                className="max-h-[calc(100vh-136px)] max-w-full rounded-2xl object-contain"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
