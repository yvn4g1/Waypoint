import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

type AutoResizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  onChange: TextareaHTMLAttributes<HTMLTextAreaElement>['onChange']
  height: number
  onManualResize: (height: number) => void
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(function AutoResizeTextarea({ onChange, value, height, onManualResize, ...props }, forwardedRef) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const appliedHeight = useRef(height)
  useImperativeHandle(forwardedRef, () => textareaRef.current!, [])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    appliedHeight.current = height
    textarea.style.height = `${height}px`
  }, [height])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !('ResizeObserver' in window)) return
    const observer = new ResizeObserver(() => {
      const actualHeight = textarea.offsetHeight
      const expectedHeight = appliedHeight.current
      if (actualHeight && Math.abs(actualHeight - expectedHeight) > 1) onManualResize(actualHeight)
    })
    observer.observe(textarea)
    return () => observer.disconnect()
  }, [onManualResize])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={1}
      style={{ height }}
      onChange={(event) => {
        onChange?.(event)
      }}
    />
  )
})
