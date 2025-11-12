import { STEPS } from '@/lib/steps';

interface StepperProps {
  currentStepKey: string;
}

export default function Stepper({ currentStepKey }: StepperProps) {
  const currentIndex = STEPS.findIndex(step => step.key === currentStepKey);

  return (
    <div className='stepper'>
      {STEPS.map((step: any, index: any) => {
        const isActive = index === currentIndex;
        const isCompleted = index < currentIndex;

        return (
          <div key={step.key} className='flex items-center'>
            {/* Step Circle */}
            <div
              className={
                (isCompleted || isActive
                  ? 'border-purple-600'
                  : 'border-gray-300 bg-white') +
                ' flex h-4 w-4 sm:h-6 sm:w-6 items-center justify-center rounded-full border sm:border-2 transition-all duration-300 ease-in-out'
              }
            >
              {/* active/completed visual indicator */}
              {isCompleted ? (
                <span className='text-[10px] sm:text-sm leading-none text-purple-600'>✓</span>
              ) : (
                <span>
                  {isActive ? (
                    <div className='h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-purple-600' />
                  ) : null}
                </span>
              )}
            </div>

            {/* Connector line */}
            {index < STEPS.length - 1 && (
              <div
                className={
                  (isCompleted ? 'bg-purple-600' : 'bg-gray-200') +
                  ' mx-1 h-0.5 w-12 sm:w-20 md:w-32 lg:w-40 transition-all duration-300 ease-in-out'
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
