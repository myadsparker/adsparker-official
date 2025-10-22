'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
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
            <Link href='/'>Pricing</Link>
            <Link href='/'>FAQ's</Link>
          </div>
          <div className='cta'>
            <Link href='/' className='sign_in'>
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
