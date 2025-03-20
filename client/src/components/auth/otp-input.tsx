import { useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

export default function OtpInput({ value, onChange, length = 6 }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  useEffect(() => {
    // Pre-populate refs array
    inputRefs.current = inputRefs.current.slice(0, length);
    
    // Focus on first input when component mounts
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [length]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const newValue = e.target.value;
    
    // Only accept digits
    if (!/^\d*$/.test(newValue)) return;
    
    // Update the value
    const otpArray = value.split('');
    otpArray[index] = newValue.slice(-1); // Only take the last character
    const newOtp = otpArray.join('');
    onChange(newOtp);
    
    // Move to next input if a digit was entered
    if (newValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!value[index] && index > 0) {
        // If current input is empty and backspace is pressed, focus previous input
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const digitsOnly = pastedData.replace(/[^\d]/g, '').slice(0, length);
    
    if (digitsOnly) {
      onChange(digitsOnly.padEnd(length, '').slice(0, length));
      
      // Focus on the next empty input or the last one
      const focusIndex = Math.min(digitsOnly.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
    }
  };
  
  return (
    <div className="flex justify-between space-x-2">
      {Array.from({ length }).map((_, index) => (
        <Input
          key={index}
          ref={el => inputRefs.current[index] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[index] || ''}
          onChange={e => handleChange(e, index)}
          onKeyDown={e => handleKeyDown(e, index)}
          onPaste={handlePaste}
          className="w-12 h-12 text-center text-lg font-mono border border-gray-300 rounded-md focus:ring-2 focus:ring-[#005A9C] focus:border-[#005A9C]"
        />
      ))}
    </div>
  );
}
