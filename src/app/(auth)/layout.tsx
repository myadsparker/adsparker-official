import Image from 'next/image';
import Header from '@/components/marketing/Header';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className='auth-header-container'>
        <Header />
      </div>
      <div className='auth_page'>
        <div className='content_left'>{children}</div>
        <div className='content_right'>
          <Image
            src='/images/auth-image.png'
            alt='Auth Background'
            width={500}
            height={500}
          />
        </div>
      </div>
    </div>
  );
}
