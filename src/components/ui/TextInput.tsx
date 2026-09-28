import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(function TextInput(
  { invalid, className, type = 'text', ...rest },
  ref,
) {
  const classes = ['mg-input', invalid && 'mg-input--error', className].filter(Boolean).join(' ');
  return <input ref={ref} type={type} className={classes} aria-invalid={invalid || undefined} {...rest} />;
});
