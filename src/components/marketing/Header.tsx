'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
  const scrollToSection = (
    sectionId: string,
    e: React.MouseEvent<HTMLAnchorElement>
  ) => {
    e.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'auto', block: 'start' });
    }
  };

  return (
    <header className='header-main'>
      <div className='container'>
        <div className='nav'>
          <Link href='/'>
            <Image
              src='/images/adsparker-logo.png'
              alt='Adsparker Logo'
              width={150}
              height={40}
            />
          </Link>
          <div className='menu'>
            <Link href='/'>Home</Link>
            <a href='#pricing' onClick={e => scrollToSection('pricing', e)}>
              Pricing
            </a>
            <a href='#faq' onClick={e => scrollToSection('faq', e)}>
              FAQ's
            </a>
          </div>
          <div className='cta'>
            <Link href='/signup' className='sign_in'>
              Sign In
            </Link>
            <Link href='/login' className='get_started'>
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
