import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from 'react'

const MAX_TEXTAREA_HEIGHT = 240

type AutoResizeTextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> & {
  onChange: TextareaHTMLAttributes<HTMLTextAreaElement>['onChange']
}

export function AutoResizeTextarea({ onChange, value, ...props }: AutoResizeTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = 'auto'
    textarea.style.height = `${Math.min(textarea.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`
    textarea.style.overflowY = textarea.scrollHeight > MAX_TEXTAREA_HEIGHT ? 'auto' : 'hidden'
  }

  useLayoutEffect(resize, [value])

  return (
    <textarea
      {...props}
      ref={textareaRef}
      value={value}
      rows={3}
      onChange={(event) => {
        resize()
        onChange?.(event)
      }}
    />
  )
}
