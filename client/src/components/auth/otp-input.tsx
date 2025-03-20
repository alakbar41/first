import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState } from "react";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export default function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input refs
  useEffect(() => {
    inputRefs.current = inputRefs.current.slice(0, length);
  }, [length]);

  // Focus the next input after input change
  useEffect(() => {
    if (activeIndex < length) {
      inputRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, length]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const currentValue = e.target.value;
    
    // Only allow one digit per input
    const digit = currentValue.replace(/\D/g, '').slice(-1);
    
    // Update the OTP string
    const newValue = 
      value.substring(0, index) + 
      (digit || '') + 
      value.substring(index + 1);
    
    onChange(newValue);
    
    // Move to next input if a digit was entered
    if (digit && index < length - 1) {
      setActiveIndex(index + 1);
    }
  };

  // Handle key down events
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      // If input is empty and not first input, move to previous input
      if (!value[index] && index > 0) {
        setActiveIndex(index - 1);
      }
      
      // Clear current digit
      const newValue = 
        value.substring(0, index) + 
        '' + 
        value.substring(index + 1);
      
      onChange(newValue);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      setActiveIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      setActiveIndex(index + 1);
    }
  };

  // Handle paste event
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digits = pastedData.replace(/\D/g, '').slice(0, length);
    
    if (digits) {
      const newValue = digits.padEnd(value.length, value.substring(digits.length));
      onChange(newValue);
      setActiveIndex(Math.min(digits.length, length - 1));
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          value={value[index] || ''}
          className="w-12 h-12 text-center text-lg font-medium"
          onChange={(e) => handleChange(e, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          onFocus={() => setActiveIndex(index)}
        />
      ))}
    </div>
  );
}