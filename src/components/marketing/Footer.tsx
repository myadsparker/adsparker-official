import React from 'react';
import Image from 'next/image';

const Footer = () => {
  return (
    <>
      <div className='footer_ad'>
        <div className='footer_ad_content'>
          <h3>Spark Growth. Boost Sales. Try AdSparker.</h3>
          <p>
            Create high-converting Meta ads in seconds—no design or ad skills
            needed. Let AI drive your campaign while you focus on your business.
          </p>
          <a href='#' className='footer_ad_button'>
            Generate Ads
            <svg
              width='21'
              height='20'
              viewBox='0 0 21 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M15.5 6.66699L18.8333 10.0003L15.5 13.3337'
                stroke='white'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
              <path
                d='M2.16602 10H18.8327'
                stroke='white'
                stroke-width='2'
                stroke-linecap='round'
                stroke-linejoin='round'
              />
            </svg>
          </a>
        </div>
      </div>
      <footer className='footer_main'>
        <div className='container'>
          <div className='footer_content'>
            <div className='footer_left'>
              <div className='footer_logo'>
                <div className='logo_container'>
                  <Image
                    src='/images/adsparker-logo-white.png'
                    alt='AdSparker'
                    width={194}
                    height={40}
                  />
                </div>
              </div>

              <div className='social_icons'>
                <a href='#' className='social_icon'>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    width='24'
                    height='24'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    stroke-width='2'
                    stroke-linecap='round'
                    stroke-linejoin='round'
                    className='lucide lucide-instagram-icon lucide-instagram'
                  >
                    <rect width='20' height='20' x='2' y='2' rx='5' ry='5' />
                    <path d='M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z' />
                    <line x1='17.5' x2='17.51' y1='6.5' y2='6.5' />
                  </svg>
                </a>

                <a href='#' className='social_icon'>
                  <svg
                    width='18'
                    height='19'
                    viewBox='0 0 18 19'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M17.133 16.8478L11.2643 7.62469L17.0552 1.25438C17.1862 1.10674 17.2537 0.913434 17.2431 0.716365C17.2325 0.519295 17.1446 0.334346 16.9986 0.201615C16.8525 0.0688843 16.66 -0.00092985 16.4628 0.00730857C16.2657 0.015547 16.0797 0.101174 15.9452 0.245625L10.4289 6.31312L6.633 0.347813C6.56531 0.24127 6.47183 0.153535 6.36121 0.0927355C6.25059 0.0319361 6.12642 3.91221e-05 6.00019 8.87202e-08H1.50019C1.36571 -6.53095e-05 1.2337 0.0360256 1.11796 0.104494C1.00222 0.172962 0.907019 0.271288 0.842323 0.389177C0.777628 0.507066 0.745819 0.64018 0.750227 0.774582C0.754634 0.908984 0.795096 1.03973 0.867376 1.15313L6.73613 10.3753L0.945189 16.7503C0.877564 16.823 0.825029 16.9083 0.79063 17.0014C0.756231 17.0945 0.740651 17.1935 0.744794 17.2927C0.748937 17.3918 0.772721 17.4892 0.814766 17.5791C0.856811 17.669 0.916281 17.7496 0.989729 17.8164C1.06318 17.8831 1.14915 17.9346 1.24265 17.9679C1.33615 18.0012 1.43533 18.0156 1.53443 18.0103C1.63354 18.0049 1.7306 17.98 1.81999 17.9369C1.90938 17.8937 1.98932 17.8333 2.05519 17.7591L7.57144 11.6916L11.3674 17.6569C11.4356 17.7625 11.5293 17.8494 11.6399 17.9093C11.7505 17.9693 11.8744 18.0005 12.0002 18H16.5002C16.6345 18 16.7664 17.9638 16.882 17.8954C16.9976 17.827 17.0927 17.7288 17.1573 17.611C17.222 17.4933 17.2539 17.3604 17.2496 17.2261C17.2453 17.0918 17.205 16.9612 17.133 16.8478ZM12.4118 16.5L2.86613 1.5H5.58488L15.1343 16.5H12.4118Z'
                      fill='white'
                    />
                  </svg>
                </a>

                <a href='#' className='social_icon'>
                  <svg
                    width='22'
                    height='18'
                    viewBox='0 0 22 18'
                    fill='none'
                    xmlns='http://www.w3.org/2000/svg'
                  >
                    <path
                      d='M20.9684 3.5175C20.8801 3.17189 20.7109 2.85224 20.4747 2.58491C20.2385 2.31758 19.9421 2.11024 19.61 1.98C16.3962 0.738753 11.2812 0.750004 11 0.750004C10.7188 0.750004 5.60375 0.738753 2.39 1.98C2.0579 2.11024 1.76153 2.31758 1.52534 2.58491C1.28915 2.85224 1.1199 3.17189 1.03156 3.5175C0.78875 4.45313 0.5 6.16313 0.5 9C0.5 11.8369 0.78875 13.5469 1.03156 14.4825C1.11977 14.8283 1.28895 15.1481 1.52515 15.4156C1.76136 15.6831 2.0578 15.8906 2.39 16.0209C5.46875 17.2088 10.2875 17.25 10.9381 17.25H11.0619C11.7125 17.25 16.5341 17.2088 19.61 16.0209C19.9422 15.8906 20.2386 15.6831 20.4748 15.4156C20.711 15.1481 20.8802 14.8283 20.9684 14.4825C21.2113 13.545 21.5 11.8369 21.5 9C21.5 6.16313 21.2113 4.45313 20.9684 3.5175ZM14.0553 9.61125L10.3053 12.2363C10.1931 12.3148 10.0616 12.3612 9.92492 12.3703C9.78826 12.3794 9.65172 12.351 9.5301 12.288C9.40847 12.225 9.30642 12.1299 9.23501 12.013C9.1636 11.8962 9.12555 11.762 9.125 11.625V6.375C9.12504 6.2378 9.16271 6.10324 9.23392 5.98597C9.30513 5.86869 9.40714 5.77319 9.52885 5.70987C9.65057 5.64655 9.78732 5.61783 9.92422 5.62683C10.0611 5.63584 10.1929 5.68222 10.3053 5.76094L14.0553 8.38594C14.154 8.45512 14.2345 8.54704 14.2901 8.65393C14.3457 8.76081 14.3747 8.87952 14.3747 9C14.3747 9.12049 14.3457 9.23919 14.2901 9.34608C14.2345 9.45297 14.154 9.54489 14.0553 9.61407V9.61125Z'
                      fill='white'
                    />
                  </svg>
                </a>
              </div>
            </div>

            <div className='footer_right'>
              <div className='company_section'>
                <h4 className='company_heading'>Company</h4>
                <ul className='company_links'>
                  <li>
                    <a href='#'>Contact Us</a>
                  </li>
                  <li>
                    <a href='#'>Join Us</a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className='footer_bottom'>
            <div className='copyright'>© Copyright AdSparker 2025</div>
            <div className='legal_links'>
              <a href='#'>Privacy Policy</a>
              <a href='#'>Legal</a>
              <a href='#'>Term of Services</a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
