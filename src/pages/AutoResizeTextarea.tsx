import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

type AutoResizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  onChange: TextareaHTMLAttributes<HTMLTextAreaElement>['onChange']
  height: number
  onManualResize: (height: number) => void
}

export const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(function AutoResizeTextarea({ onChange, value, height, onManualResize, ...props }, forwardedRef) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const isManuallyResizing = useRef(false)
  useImperativeHandle(forwardedRef, () => textareaRef.current!, [])

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || isManuallyResizing.current) return
    textarea.style.height = `${height}px`
  }, [height, value])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={3}
      style={{ height }}
      onPointerDown={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect()
        isManuallyResizing.current = event.clientX >= bounds.right - 24 && event.clientY >= bounds.bottom - 24
      }}
      onPointerUp={(event) => {
        if (isManuallyResizing.current) onManualResize(Math.max(event.currentTarget.offsetHeight, 76))
        isManuallyResizing.current = false
      }}
      onChange={(event) => {
        onChange?.(event)
      }}
    />
  )
})
