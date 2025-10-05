import Link from 'next/link';
import './dashboard.css';

import LogoutButton from '@/components/dashboard/LogoutButton';
import Stepper from '@/components/dashboard/Stepper';
import Image from 'next/image';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen text-white'>
      <div className='dashboard_header'>
        <Image
          src='/images/adsparker-logo.png'
          height={40}
          width={194}
          alt='Adsparker Logo'
        />
        <div className='menu_right'>
          <Link href='/dashboard/projects/new' className='create_button'>
            <svg
              width='16'
              height='16'
              viewBox='0 0 20 20'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M4.16699 10H15.8337'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
              <path
                d='M10 4.16675V15.8334'
                stroke='white'
                strokeWidth='1.5'
                strokeLinecap='round'
              />
            </svg>
            New Project
          </Link>
          <div>
            <svg
              width='24'
              height='24'
              viewBox='0 0 24 24'
              fill='none'
              xmlns='http://www.w3.org/2000/svg'
            >
              <path
                d='M12.0196 2.90991C8.7096 2.90991 6.0196 5.59991 6.0196 8.90991V11.7999C6.0196 12.4099 5.7596 13.3399 5.4496 13.8599L4.2996 15.7699C3.5896 16.9499 4.0796 18.2599 5.3796 18.6999C9.6896 20.1399 14.3396 20.1399 18.6496 18.6999C19.8596 18.2999 20.3896 16.8699 19.7296 15.7699L18.5796 13.8599C18.2796 13.3399 18.0196 12.4099 18.0196 11.7999V8.90991C18.0196 5.60991 15.3196 2.90991 12.0196 2.90991Z'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
                strokeLinecap='round'
              />
              <path
                d='M13.8699 3.19994C13.5599 3.10994 13.2399 3.03994 12.9099 2.99994C11.9499 2.87994 11.0299 2.94994 10.1699 3.19994C10.4599 2.45994 11.1799 1.93994 12.0199 1.93994C12.8599 1.93994 13.5799 2.45994 13.8699 3.19994Z'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
                strokeLinecap='round'
              />
              <path
                d='M15.0205 19.0601C15.0205 20.7101 13.6705 22.0601 12.0205 22.0601C11.2005 22.0601 10.4405 21.7201 9.90051 21.1801C9.36051 20.6401 9.02051 19.8801 9.02051 19.0601'
                stroke='#0D0D0D'
                strokeWidth='1.57123'
                strokeMiterlimit='10'
              />
            </svg>
          </div>

          <div className='profile_right'>
            <span>Chris John</span>
            <Image
              height={24}
              width={24}
              src='/images/sample-user.png'
              alt='User'
            />
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
