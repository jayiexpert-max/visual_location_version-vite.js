import { TextField, type TextFieldProps } from '@mui/material';
import { useEffect, useRef } from 'react';

type ScanInputProps = Omit<TextFieldProps, 'inputRef'> & {
  autoFocusScan?: boolean;
  onScan?: (value: string) => void;
};

export function ScanInput({
  autoFocusScan = true,
  onScan,
  onKeyDown,
  ...props
}: ScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusScan) {
      inputRef.current?.focus();
    }
  }, [autoFocusScan]);

  return (
    <TextField
      {...props}
      inputRef={inputRef}
      fullWidth
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (e.key === 'Enter' && onScan) {
          const value = (e.target as HTMLInputElement).value.trim();
          if (value) onScan(value);
        }
      }}
      sx={{
        '& .MuiInputBase-root': { minHeight: 56, fontSize: '1.1rem' },
        ...props.sx,
      }}
    />
  );
}
