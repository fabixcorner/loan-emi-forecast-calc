import { useEffect, useState } from "react";
import { Calculator } from "lucide-react";

interface CalculatorAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

export const CalculatorAnimation = ({ isVisible, onComplete }: CalculatorAnimationProps) => {
  const [pressedButtons, setPressedButtons] = useState<number[]>([]);
  
  const buttons = [
    'C', '±', '%', '÷',
    '7', '8', '9', '×',
    '4', '5', '6', '−',
    '1', '2', '3', '+',
    '0', '.', '='
  ];

  useEffect(() => {
    if (!isVisible) return;

    const intervals: NodeJS.Timeout[] = [];
    
    // Random button press animation
    const animateButtons = () => {
      const randomButton = Math.floor(Math.random() * buttons.length);
      setPressedButtons(prev => [...prev, randomButton]);
      
      setTimeout(() => {
        setPressedButtons(prev => prev.filter(btn => btn !== randomButton));
      }, 300);
    };

    // Press 3-4 random buttons during the animation
    const buttonPresses = [200, 400, 600, 800];
    buttonPresses.forEach(delay => {
      intervals.push(setTimeout(animateButtons, delay));
    });

    // Complete animation after 1 second
    const completeTimeout = setTimeout(() => {
      onComplete();
    }, 1000);

    return () => {
      intervals.forEach(clearTimeout);
      clearTimeout(completeTimeout);
    };
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="calculator-animation bg-white rounded-2xl p-6 shadow-2xl">
        <div className="flex items-center justify-center mb-4">
          <Calculator className="w-8 h-8 text-financial-primary" />
        </div>
        
        {/* Calculator Display */}
        <div className="bg-gray-900 text-white text-right p-4 rounded-lg mb-4 font-mono text-xl">
          Calculating...
        </div>
        
        {/* Calculator Buttons */}
        <div className="grid grid-cols-4 gap-2">
          {buttons.map((button, index) => (
            <button
              key={index}
              className={`
                h-12 rounded-lg font-semibold text-lg transition-all duration-200
                ${button === '=' ? 'col-span-2' : ''}
                ${button === '0' ? 'col-span-2' : ''}
                ${['÷', '×', '−', '+', '='].includes(button) 
                  ? 'bg-financial-primary text-white' 
                  : ['C', '±', '%'].includes(button)
                  ? 'bg-gray-300 text-gray-800'
                  : 'bg-gray-100 text-gray-800'
                }
                ${pressedButtons.includes(index) ? 'button-press' : ''}
              `}
              disabled
            >
              {button}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};