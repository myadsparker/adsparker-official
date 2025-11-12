'use client';

import { useEffect } from 'react';

interface ContactUsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactUsModal({ isOpen, onClose }: ContactUsModalProps) {
  useEffect(() => {
    // Prevent body scroll when modal is open
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Handle ESC key to close modal
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className='custom-modal-overlay' onClick={onClose}>
      <div className='custom-modal-content' onClick={(e) => e.stopPropagation()}>
        <button className='custom-modal-close' onClick={onClose} aria-label='Close'>
          <svg
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            xmlns='http://www.w3.org/2000/svg'
          >
            <path
              d='M18 6L6 18M6 6L18 18'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </svg>
        </button>
        
        <div className='custom-modal-header'>
          <h2 className='custom-modal-title'>Contact Us</h2>
        </div>
        
        <div className='custom-modal-body'>
          <p className='custom-modal-description'>
            Reach out to us at{' '}
            <a
              href='mailto:myadsparker@gmail.com'
              className='custom-modal-link'
            >
              myadsparker@gmail.com
            </a>
            <br />
            we're here to assist!
          </p>
        </div>
      </div>
    </div>
  );
}

