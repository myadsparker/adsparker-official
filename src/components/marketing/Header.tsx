'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);

  const toggleMenu = () => setIsMenuOpen(prev => !prev);
  const closeMenu = React.useCallback(() => setIsMenuOpen(false), []);

  React.useEffect(() => {
    document.body.style.overflow = isMenuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMenuOpen]);

  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        closeMenu();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen, closeMenu]);

  const scrollToSection = (
    sectionId: string,
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    closeMenu();
  };

  return (
    <header className='header-main'>
      <div className='container'>
        <div className='nav'>
          <button
            type='button'
            className='mobile-menu-toggle'
            aria-label={isMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMenuOpen}
            onClick={toggleMenu}
          >
            {isMenuOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
          </button>

          <Link href='/' className='logo-link' onClick={closeMenu}>
            <Image
              src='/images/adsparker-logo.png'
              alt='Adsparker Logo'
              width={150}
              height={40}
              priority
            />
          </Link>

          <div className='menu'>
            <Link href='/' onClick={closeMenu}>
              Home
            </Link>
            <a href='#pricing' onClick={e => scrollToSection('pricing', e)}>
              Pricing
            </a>
            <a href='#faq' onClick={e => scrollToSection('faq', e)}>
              FAQ's
            </a>
          </div>

          <div className='cta'>
            <Link href='/login' className='sign_in' onClick={closeMenu}>
              Login
            </Link>
            <Link href='/signup' className='get_started' onClick={closeMenu}>
              Get Started
            </Link>
          </div>
        </div>
      </div>

      <div
        className={`mobile-menu ${isMenuOpen ? 'open' : ''}`}
        onClick={(e) => {
          // Close menu when clicking on the overlay (not the panel)
          if (e.target === e.currentTarget) {
            closeMenu();
          }
        }}
      >
        <div className='mobile-menu__panel' onClick={(e) => e.stopPropagation()}>
          <div className='mobile-menu__panel-header'>
            <Link href='/' className='logo-link' onClick={closeMenu}>
              <Image
                src='/images/adsparker-logo.png'
                alt='Adsparker Logo'
                width={150}
                height={40}
                priority
              />
            </Link>
            <button
              type='button'
              className='mobile-menu__close-button'
              aria-label='Close navigation menu'
              onClick={closeMenu}
            >
              <X size={24} strokeWidth={2} />
            </button>
          </div>

          <div className='mobile-menu__panel-content'>
            <nav className='mobile-menu__links'>
              <Link href='/' onClick={closeMenu}>
                Home
              </Link>
              <a href='#pricing' onClick={e => scrollToSection('pricing', e)}>
                Pricing
              </a>
              <a href='#faq' onClick={e => scrollToSection('faq', e)}>
                FAQ's
              </a>
            </nav>

            <div className='mobile-menu__cta'>
              <Link href='/login' className='sign_in' onClick={closeMenu}>
                Login
              </Link>
              <Link href='/signup' className='get_started' onClick={closeMenu}>
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
