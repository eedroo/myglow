import { forwardRef, type TextareaHTMLAttributes } from 'react';

type LinedTextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/** Textarea com linhas pautadas de caderno. */
export const LinedTextArea = forwardRef<HTMLTextAreaElement, LinedTextAreaProps>(function LinedTextArea(
  { rows = 4, className, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={className ? `mg-lined ${className}` : 'mg-lined'} {...rest} />;
});
